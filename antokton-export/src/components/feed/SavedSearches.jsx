import React, { useState } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bookmark, Trash2, Plus, Bell, BellOff, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function SavedSearches({ currentFilters, onLoadSearch }) {
  const [user, setUser] = useState(null);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [searchName, setSearchName] = useState("");

  const queryClient = useQueryClient();

  React.useEffect(() => {
    const loadUser = async () => {
      const authenticated = await base44.auth.isAuthenticated();
      if (authenticated) {
        const me = await base44.auth.me();
        setUser(me);
      }
    };
    loadUser();
  }, []);

  const { data: savedSearches = [], isLoading } = useQuery({
    queryKey: ["savedSearches", user?.email],
    queryFn: () => base44.entities.SavedSearch.filter({ user_email: user.email }, "-created_date", 20),
    enabled: !!user
  });

  const saveSearchMutation = useMutation({
    mutationFn: (data) => base44.entities.SavedSearch.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedSearches"] });
      setShowSaveForm(false);
      setSearchName("");
      toast.success("Kërkimi u ruajt!");
    }
  });

  const deleteSearchMutation = useMutation({
    mutationFn: (id) => base44.entities.SavedSearch.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedSearches"] });
      toast.success("Kërkimi u fshi!");
    }
  });

  const toggleNotificationMutation = useMutation({
    mutationFn: ({ id, enabled }) => base44.entities.SavedSearch.update(id, { notification_enabled: enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedSearches"] });
    }
  });

  const handleSave = () => {
    if (!searchName.trim()) {
      toast.error("Vendos një emër për kërkimin");
      return;
    }

    saveSearchMutation.mutate({
      user_email: user.email,
      search_name: searchName,
      filters: currentFilters,
      notification_enabled: true
    });
  };

  if (!user) return null;

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Bookmark className="w-4 h-4 text-[#8ab4ff]" />
            Kërkimet e ruajtura ({savedSearches.length})
          </CardTitle>
          <Button
            onClick={() => setShowSaveForm(!showSaveForm)}
            size="sm"
            variant="outline"
            className="border-white/10"
          >
            <Plus className="w-3 h-3 mr-1" />
            Ruaj kërkimin
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {showSaveForm && (
          <div className="flex gap-2 p-3 bg-white/5 rounded-lg border border-white/10">
            <Input
              placeholder="Emri i kërkimit..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
            />
            <Button onClick={handleSave} size="sm" disabled={saveSearchMutation.isPending}>
              {saveSearchMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Ruaj"}
            </Button>
            <Button onClick={() => setShowSaveForm(false)} size="sm" variant="outline">
              Anulo
            </Button>
          </div>
        )}

        {savedSearches.length === 0 && !showSaveForm ? (
          <p className="text-white/40 text-sm text-center py-4">Nuk ke kërkime të ruajtura</p>
        ) : (
          <div className="space-y-2">
            {savedSearches.map(search => (
              <div
                key={search.id}
                className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors group"
              >
                <button
                  onClick={() => onLoadSearch(search.filters)}
                  className="flex-1 text-left"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-medium text-sm">{search.search_name}</span>
                    {search.notification_enabled && (
                      <Badge className="bg-[#8ab4ff]/20 text-[#8ab4ff] text-xs">
                        <Bell className="w-3 h-3 mr-1" />
                        Aktive
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {search.filters.category && search.filters.category !== "all" && (
                      <Badge variant="outline" className="text-white/40 text-xs">{search.filters.category}</Badge>
                    )}
                    {search.filters.country && search.filters.country !== "all" && (
                      <Badge variant="outline" className="text-white/40 text-xs">{search.filters.country}</Badge>
                    )}
                    {search.filters.profession && search.filters.profession !== "all" && (
                      <Badge variant="outline" className="text-white/40 text-xs">{search.filters.profession}</Badge>
                    )}
                  </div>
                </button>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleNotificationMutation.mutate({ 
                      id: search.id, 
                      enabled: !search.notification_enabled 
                    })}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {search.notification_enabled ? (
                      <BellOff className="w-4 h-4 text-white/40" />
                    ) : (
                      <Bell className="w-4 h-4 text-white/40" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteSearchMutation.mutate(search.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/antoktonClient";
import NotificationSettingsComponent from "../components/notifications/NotificationSettings";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Bell, Save, Loader2, CheckCircle, Bookmark } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";

export default function NotificationSettings() {
  const [user, setUser] = useState(null);
  const [success, setSuccess] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const me = await base44.auth.me();
      setUser(me);
    };
    loadUser();
  }, []);

  const { data: preferences, isLoading } = useQuery({
    queryKey: ["notificationPrefs", user?.email],
    queryFn: async () => {
      const prefs = await base44.entities.NotificationPreference.filter({ 
        user_email: user.email 
      });
      if (prefs.length > 0) return prefs[0];
      
      // Create default preferences
      return await base44.entities.NotificationPreference.create({
        user_email: user.email,
        job_matches: true,
        application_status: true,
        interview_schedules: true,
        new_messages: true,
        system_announcements: true,
        rating_alerts: true,
        email_digest: false,
        email_frequency: "never"
      });
    },
    enabled: !!user
  });

  const { data: savedSearches = [] } = useQuery({
    queryKey: ["savedSearches", user?.email],
    queryFn: () => base44.entities.SavedSearch.filter({ user_email: user?.email }, "-created_date"),
    enabled: !!user
  });

  const updateSavedSearchMutation = useMutation({
    mutationFn: async ({ id, enabled }) => {
      await base44.entities.SavedSearch.update(id, { notification_enabled: enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedSearches"] });
      toast.success("Preferencat u përditësuan!");
    }
  });

  const updatePrefsMutation = useMutation({
    mutationFn: (data) => base44.entities.NotificationPreference.update(preferences.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificationPrefs"] });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      toast.success("Preferencat u ruajtën!");
    }
  });

  const handleToggle = (field) => {
    updatePrefsMutation.mutate({
      ...preferences,
      [field]: !preferences[field]
    });
  };

  const handleFrequencyChange = (value) => {
    updatePrefsMutation.mutate({
      ...preferences,
      email_frequency: value
    });
  };

  if (!user || isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
          <Bell className="w-8 h-8 text-[#8ab4ff]" />
          Cilësimet e njoftimeve
        </h1>
        <p className="text-white/50 mt-1">Menaxho preferencat e tua të njoftimeve</p>
      </div>

      <div className="space-y-6">
        <NotificationSettingsComponent />

        <Card className="bg-white/5 border-white/10">
        <CardContent className="p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-white font-semibold text-lg border-b border-white/10 pb-2">
              Njoftime në aplikacion
            </h3>

            <div className="flex items-center justify-between py-3 border-b border-white/10">
              <div>
                <Label className="text-white font-medium">Punë të reja që përputhen</Label>
                <p className="text-white/50 text-sm">Merr njoftim për punë të përshtatshme</p>
              </div>
              <Switch
                checked={preferences?.job_matches}
                onCheckedChange={() => handleToggle('job_matches')}
              />
            </div>

            <div className="flex items-center justify-between py-3 border-b border-white/10">
              <div>
                <Label className="text-white font-medium">Ndryshime në aplikime</Label>
                <p className="text-white/50 text-sm">Statusi i aplikimeve të tua</p>
              </div>
              <Switch
                checked={preferences?.application_status}
                onCheckedChange={() => handleToggle('application_status')}
              />
            </div>

            <div className="flex items-center justify-between py-3 border-b border-white/10">
              <div>
                <Label className="text-white font-medium">Intervista të programuara</Label>
                <p className="text-white/50 text-sm">Njoftime për intervistat</p>
              </div>
              <Switch
                checked={preferences?.interview_schedules}
                onCheckedChange={() => handleToggle('interview_schedules')}
              />
            </div>

            <div className="flex items-center justify-between py-3 border-b border-white/10">
              <div>
                <Label className="text-white font-medium">Mesazhe të reja</Label>
                <p className="text-white/50 text-sm">Chat dhe mesazhe direkte</p>
              </div>
              <Switch
                checked={preferences?.new_messages}
                onCheckedChange={() => handleToggle('new_messages')}
              />
            </div>

            <div className="flex items-center justify-between py-3 border-b border-white/10">
              <div>
                <Label className="text-white font-medium">Lajmerime sistemi</Label>
                <p className="text-white/50 text-sm">Përditësime dhe lajme</p>
              </div>
              <Switch
                checked={preferences?.system_announcements}
                onCheckedChange={() => handleToggle('system_announcements')}
              />
            </div>

            <div className="flex items-center justify-between py-3 border-b border-white/10">
              <div>
                <Label className="text-white font-medium">Vlerësime dhe rishikime</Label>
                <p className="text-white/50 text-sm">Vlerësime të reja nga inspektorët</p>
              </div>
              <Switch
                checked={preferences?.rating_alerts}
                onCheckedChange={() => handleToggle('rating_alerts')}
              />
            </div>

            <div className="flex items-center justify-between py-3 border-b border-white/10">
              <div>
                <Label className="text-white font-medium">Aplikime të reja</Label>
                <p className="text-white/50 text-sm">Kandidatë që aplikojnë për punët tuaja</p>
              </div>
              <Switch
                checked={preferences?.new_applications}
                onCheckedChange={() => handleToggle('new_applications')}
              />
            </div>

            <div className="flex items-center justify-between py-3 border-b border-white/10">
              <div>
                <Label className="text-white font-medium">Komente në njoftime</Label>
                <p className="text-white/50 text-sm">Komente për njoftimet e tua</p>
              </div>
              <Switch
                checked={preferences?.job_comments}
                onCheckedChange={() => handleToggle('job_comments')}
              />
            </div>

            <div className="flex items-center justify-between py-3 border-b border-white/10">
              <div>
                <Label className="text-white font-medium">Kërkime të ruajtura</Label>
                <p className="text-white/50 text-sm">Punë të reja që përputhen me kërkimet</p>
              </div>
              <Switch
                checked={preferences?.saved_search_matches}
                onCheckedChange={() => handleToggle('saved_search_matches')}
              />
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <Label className="text-white font-medium">Rishikime për kompaninë</Label>
                <p className="text-white/50 text-sm">Vlerësime nga punonjësit</p>
              </div>
              <Switch
                checked={preferences?.company_reviews}
                onCheckedChange={() => handleToggle('company_reviews')}
              />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-white/10">
            <h3 className="text-white font-semibold text-lg">
              Njoftime me email
            </h3>

            <div className="space-y-3">
              <Label className="text-white/70">Frekuenca e email-eve</Label>
              <Select 
                value={preferences?.email_frequency || "never"} 
                onValueChange={handleFrequencyChange}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Asnjëherë</SelectItem>
                  <SelectItem value="daily">Çdo ditë</SelectItem>
                  <SelectItem value="weekly">Çdo javë</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-white/40 text-xs">
                Merr një përmbledhje me email të të gjitha njoftimeve
              </p>
            </div>
          </div>

          {success && (
            <div className="flex items-center justify-center gap-2 text-green-400 py-2">
              <CheckCircle className="w-5 h-5" />
              <span>Preferencat u ruajtën!</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Saved Searches Notifications */}
      {savedSearches.length > 0 && (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6">
            <h3 className="text-white font-semibold text-lg border-b border-white/10 pb-3 mb-4 flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-[#8ab4ff]" />
              Kërkirmet e Ruajtura
            </h3>
            <div className="space-y-3">
              {savedSearches.map((search) => (
                <div key={search.id} className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex-1">
                    <p className="text-white font-medium">{search.search_name}</p>
                    <p className="text-white/50 text-sm">Njoftime për punë të reja që përputhen</p>
                  </div>
                  <Switch
                    checked={search.notification_enabled}
                    onCheckedChange={(checked) => updateSavedSearchMutation.mutate({ id: search.id, enabled: checked })}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}
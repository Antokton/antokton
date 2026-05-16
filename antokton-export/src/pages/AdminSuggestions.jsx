import React, { useState, useEffect } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2, Briefcase, Globe } from "lucide-react";

export default function AdminSuggestions() {
  const [user, setUser] = useState(null);
  const [modifiedNames, setModifiedNames] = useState({});
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: professionSuggestions = [], isLoading: loadingProf } = useQuery({
    queryKey: ["professionSuggestions", "pending"],
    queryFn: () => base44.entities.ProfessionSuggestion.filter({ status: "pending" }, "-created_date"),
    enabled: user?.role === "admin"
  });

  const { data: countrySuggestions = [], isLoading: loadingCountry } = useQuery({
    queryKey: ["countrySuggestions", "pending"],
    queryFn: () => base44.entities.CountrySuggestion.filter({ status: "pending" }, "-created_date"),
    enabled: user?.role === "admin"
  });

  const handleProfessionAction = async (suggestion, action) => {
    const finalName = modifiedNames[suggestion.id] !== undefined
      ? modifiedNames[suggestion.id]
      : suggestion.suggested_name;
    await base44.entities.ProfessionSuggestion.update(suggestion.id, {
      status: action,
      modified_name: action === "approved" ? finalName : null,
      admin_email: user.email
    });
    queryClient.invalidateQueries({ queryKey: ["professionSuggestions"] });
  };

  const handleCountryAction = async (suggestion, action) => {
    const finalName = modifiedNames[suggestion.id] !== undefined
      ? modifiedNames[suggestion.id]
      : suggestion.suggested_name;
    await base44.entities.CountrySuggestion.update(suggestion.id, {
      status: action,
      modified_name: action === "approved" ? finalName : null,
      admin_email: user.email
    });
    queryClient.invalidateQueries({ queryKey: ["countrySuggestions"] });
  };

  if (!user) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-white/50" />
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="text-center py-20">
        <p className="text-white/60">Qasja e ndaluar — vetëm administratorët mund të hyjnë.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-2">Menaxhimi i Sugjerimeve</h1>
      <p className="text-white/50 text-sm mb-8">Shqyrto, modifiko dhe aprovo profesionet dhe vendet e sugjeruara nga përdoruesit.</p>

      {/* Profession Suggestions */}
      <Card className="bg-white/5 border-white/10 mb-6">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-[#8ab4ff]" />
            Profesionet e Sugjeruara
            {professionSuggestions.length > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-[#8ab4ff]/20 text-[#8ab4ff] text-xs font-bold">
                {professionSuggestions.length}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingProf ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-white/40" />
            </div>
          ) : professionSuggestions.length === 0 ? (
            <p className="text-white/40 text-sm py-4 text-center">Nuk ka sugjerime profesionesh në pritje.</p>
          ) : (
            <div className="space-y-3">
              {professionSuggestions.map(s => (
                <div key={s.id} className="p-4 rounded-lg bg-white/8 border border-white/15 flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-white/50 text-xs">Nga:</span>
                      <span className="text-white/70 text-xs font-mono">{s.user_email}</span>
                      <span className="text-white/30 text-xs">·</span>
                      <span className="text-white/40 text-xs">{new Date(s.created_date).toLocaleDateString('sq-AL')}</span>
                    </div>
                    <div className="space-y-1">
                      <label className="text-white/50 text-xs">Emri (mund ta modifikosh):</label>
                      <Input
                        value={modifiedNames[s.id] !== undefined ? modifiedNames[s.id] : s.suggested_name}
                        onChange={(e) => setModifiedNames({ ...modifiedNames, [s.id]: e.target.value })}
                        className="bg-white/5 border-white/20 text-white h-9 max-w-sm"
                        placeholder="Emri i profesionit"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 items-end sm:items-center">
                    <Button
                      size="sm"
                      onClick={() => handleProfessionAction(s, "approved")}
                      className="bg-green-600 hover:bg-green-700 text-white border-0"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" /> Aprovo
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleProfessionAction(s, "rejected")}
                      variant="outline"
                      className="border-red-500/40 text-red-400 hover:bg-red-500/10"
                    >
                      <XCircle className="w-4 h-4 mr-1" /> Refuzo
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Country Suggestions */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-[#9bffd6]" />
            Vendet e Sugjeruara
            {countrySuggestions.length > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-[#9bffd6]/20 text-[#9bffd6] text-xs font-bold">
                {countrySuggestions.length}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingCountry ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-white/40" />
            </div>
          ) : countrySuggestions.length === 0 ? (
            <p className="text-white/40 text-sm py-4 text-center">Nuk ka sugjerime vendesh në pritje.</p>
          ) : (
            <div className="space-y-3">
              {countrySuggestions.map(s => (
                <div key={s.id} className="p-4 rounded-lg bg-white/8 border border-white/15 flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-white/50 text-xs">Nga:</span>
                      <span className="text-white/70 text-xs font-mono">{s.user_email}</span>
                      <span className="text-white/30 text-xs">·</span>
                      <span className="text-white/40 text-xs">{new Date(s.created_date).toLocaleDateString('sq-AL')}</span>
                    </div>
                    <div className="space-y-1">
                      <label className="text-white/50 text-xs">Emri (mund ta modifikosh):</label>
                      <Input
                        value={modifiedNames[s.id] !== undefined ? modifiedNames[s.id] : s.suggested_name}
                        onChange={(e) => setModifiedNames({ ...modifiedNames, [s.id]: e.target.value })}
                        className="bg-white/5 border-white/20 text-white h-9 max-w-sm"
                        placeholder="Emri i vendit"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 items-end sm:items-center">
                    <Button
                      size="sm"
                      onClick={() => handleCountryAction(s, "approved")}
                      className="bg-green-600 hover:bg-green-700 text-white border-0"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" /> Aprovo
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleCountryAction(s, "rejected")}
                      variant="outline"
                      className="border-red-500/40 text-red-400 hover:bg-red-500/10"
                    >
                      <XCircle className="w-4 h-4 mr-1" /> Refuzo
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
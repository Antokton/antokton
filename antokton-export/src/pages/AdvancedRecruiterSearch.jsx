import React, { useState } from "react";
import { base44 } from "@/api/antoktonClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Sparkles, MapPin, Briefcase, Award } from "lucide-react";
import { motion } from "framer-motion";

export default function AdvancedRecruiterSearch() {
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState(null);
  const [searchForm, setSearchForm] = useState({
    skills: "",
    experience_level: "",
    location: "",
    keywords: "",
    min_experience_years: "",
    profession: ""
  });

  const handleSearch = async () => {
    setSearching(true);
    try {
      const response = await base44.functions.invoke("advancedRecruiterSearch", searchForm);
      setResults(response.data);
    } catch (error) {
      alert("Gabim në kërkim: " + error.message);
    }
    setSearching(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-8 h-8 text-[#8ab4ff]" />
          <h1 className="text-3xl font-bold text-white">Kërkim i Avancuar me AI</h1>
        </div>
        <p className="text-white/50">Gjej kandidatët idealë me fuqinë e inteligjencës artificiale</p>
      </div>

      <Card className="bg-white/5 border-white/10 mb-6">
        <CardHeader>
          <CardTitle className="text-white">Kriteret e kërkimit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-white/70">Aftësi (të ndara me presje)</Label>
              <Input
                value={searchForm.skills}
                onChange={(e) => setSearchForm({ ...searchForm, skills: e.target.value })}
                placeholder="Ndërtim, Instalime elektrike, Hidraulikë"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/70">Profesioni</Label>
              <Input
                value={searchForm.profession}
                onChange={(e) => setSearchForm({ ...searchForm, profession: e.target.value })}
                placeholder="Programues, Mjek, Inxhinier"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/70">Niveli i përvojës</Label>
              <Select value={searchForm.experience_level} onValueChange={(v) => setSearchForm({ ...searchForm, experience_level: v })}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Zgjidh nivelin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Çdo nivel</SelectItem>
                  <SelectItem value="entry">Fillestar</SelectItem>
                  <SelectItem value="mid">I mesëm</SelectItem>
                  <SelectItem value="senior">I lartë</SelectItem>
                  <SelectItem value="executive">Ekspert</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/70">Vite përvojë minimum</Label>
              <Input
                type="number"
                value={searchForm.min_experience_years}
                onChange={(e) => setSearchForm({ ...searchForm, min_experience_years: e.target.value })}
                placeholder="0"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/70">Vendndodhja</Label>
              <Input
                value={searchForm.location}
                onChange={(e) => setSearchForm({ ...searchForm, location: e.target.value })}
                placeholder="Gjermani, Zvicër, etj."
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/70">Fjalë kyçe</Label>
              <Input
                value={searchForm.keywords}
                onChange={(e) => setSearchForm({ ...searchForm, keywords: e.target.value })}
                placeholder="Kuzhinier, Shofer, Pastrim"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
          </div>

          <Button
            onClick={handleSearch}
            disabled={searching}
            className="w-full bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] hover:opacity-90 h-12"
          >
            {searching ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <Search className="w-5 h-5 mr-2" />
            )}
            Kërko kandidatë
          </Button>
        </CardContent>
      </Card>

      {results && (
        <div>
          <div className="mb-4 text-white/60 text-sm">
            Gjetur {results.matches.length} kandidatë nga {results.total_candidates} total
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.matches.map((candidate, i) => (
              <motion.div
                key={candidate.email}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="bg-white/5 border-white/10 hover:bg-white/8 transition-colors h-full">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate">{candidate.full_name || candidate.email}</h3>
                        {candidate.profession && (
                          <p className="text-white/60 text-sm mt-1">{candidate.profession}</p>
                        )}
                      </div>
                      <div className="ml-2 flex flex-col items-end">
                        <div className="text-2xl font-bold text-[#8ab4ff]">{candidate.match_score}</div>
                        <div className="text-xs text-white/40">skor</div>
                      </div>
                    </div>

                    {candidate.location && (
                      <div className="flex items-center gap-2 text-white/50 text-sm mb-2">
                        <MapPin className="w-4 h-4" />
                        {candidate.location}
                      </div>
                    )}

                    {candidate.experience_years > 0 && (
                      <div className="flex items-center gap-2 text-white/50 text-sm mb-3">
                        <Briefcase className="w-4 h-4" />
                        {candidate.experience_years} vite përvojë
                      </div>
                    )}

                    {candidate.skills && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {candidate.skills.split(',').slice(0, 3).map((skill, j) => (
                          <Badge key={j} variant="outline" className="border-white/20 text-white/60 text-xs">
                            {skill.trim()}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="bg-[#8ab4ff]/10 border border-[#8ab4ff]/20 rounded-lg p-3 mt-3">
                      <div className="flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-[#8ab4ff] mt-0.5 flex-shrink-0" />
                        <p className="text-[#8ab4ff] text-xs leading-relaxed">{candidate.match_reason}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {results && results.matches.length === 0 && (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-12 text-center">
            <Search className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Nuk u gjetën kandidatë</h3>
            <p className="text-white/50">
              Provo të ndryshosh kriteret e kërkimit
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
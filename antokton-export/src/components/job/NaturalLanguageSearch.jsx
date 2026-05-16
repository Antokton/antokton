import React, { useState } from "react";
import { base44 } from "@/api/antoktonClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Sparkles, Loader2, MapPin, Briefcase, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../../utils";

export default function NaturalLanguageSearch() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [parsedQuery, setParsedQuery] = useState(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('naturalLanguageJobSearch', {
        query: query
      });

      if (data.success) {
        setResults(data.results);
        setParsedQuery(data.parsed_query);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-[#8ab4ff]/10 to-[#9bffd6]/10 border-[#8ab4ff]/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#8ab4ff]" />
            Kërkim Inteligjent me AI
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder='Përshkruaj punën që kërkon, p.sh. "punë në marketing me remote në Tiranë"'
              className="bg-white/5 border-white/10 text-white"
            />
            <Button
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              className="bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020]"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>
          
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-white/40 text-xs">Shembuj:</span>
            {[
              "punë remote në teknologji",
              "marketing në Tiranë me përvojë",
              "ndërtim në Gjermani"
            ].map(example => (
              <button
                key={example}
                onClick={() => setQuery(example)}
                className="text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/60 transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {parsedQuery && (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <p className="text-white/60 text-sm mb-2">Kërkimi u analizua:</p>
            <div className="flex flex-wrap gap-2">
              {parsedQuery.keywords?.map((kw, i) => (
                <Badge key={i} className="bg-[#8ab4ff]/20 text-[#8ab4ff]">
                  {kw}
                </Badge>
              ))}
              {parsedQuery.location && (
                <Badge className="bg-[#9bffd6]/20 text-[#9bffd6]">
                  <MapPin className="w-3 h-3 mr-1" />
                  {parsedQuery.location}
                </Badge>
              )}
              {parsedQuery.remote && (
                <Badge className="bg-purple-400/20 text-purple-400">
                  Remote
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#8ab4ff]" />
            {results.length} rezultate u gjetën
          </h3>
          {results.map(job => (
            <Card key={job.id} className="bg-white/5 border-white/10 hover:border-[#8ab4ff]/30 transition-all">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <Link 
                      to={createPageUrl("PostDetail") + `?id=${job.id}`}
                      className="text-white font-semibold text-lg hover:text-[#8ab4ff] transition-colors"
                    >
                      {job.title}
                    </Link>
                    <div className="flex items-center gap-2 mt-1 text-white/60 text-sm">
                      <MapPin className="w-3 h-3" />
                      {job.city}, {job.country}
                    </div>
                  </div>
                  <Badge className="bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020]">
                    {job.relevance_score}% përputhet
                  </Badge>
                </div>
                
                <p className="text-white/70 text-sm mb-3 line-clamp-2">
                  {job.description}
                </p>
                
                {job.match_reason && (
                  <div className="flex items-start gap-2 p-2 bg-[#8ab4ff]/10 rounded-lg">
                    <Sparkles className="w-4 h-4 text-[#8ab4ff] flex-shrink-0 mt-0.5" />
                    <p className="text-[#8ab4ff] text-xs">{job.match_reason}</p>
                  </div>
                )}
                
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="outline" className="text-white/60">
                    {job.category}
                  </Badge>
                  {job.contract_type && (
                    <Badge variant="outline" className="text-white/60">
                      {job.contract_type}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
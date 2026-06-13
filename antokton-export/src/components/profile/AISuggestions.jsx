import React, { useState } from "react";
import { base44 } from "@/api/antoktonClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Loader2, Copy, Check } from "lucide-react";

export default function AISuggestions({ jobTitle, skills, currentBio, onApply, type }) {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState("");
  const [copied, setCopied] = useState(false);

  const getSuggestion = async () => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('generateProfileSuggestions', {
        job_title: jobTitle,
        skills: skills,
        current_bio: currentBio,
        suggestion_type: type
      });

      if (data.success) {
        setSuggestion(data.suggestion);
      }
    } catch (error) {
      console.error('Error getting AI suggestion:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(suggestion);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLabel = () => {
    switch(type) {
      case 'bio': return 'Sugjero jetëshkrim';
      case 'work_experience': return 'Sugjero Përvojë Pune';
      case 'skills': return 'Sugjero Aftësi';
      case 'job_description': return 'Sugjero Përshkrim Pune';
      default: return 'Sugjero me AI';
    }
  };

  return (
    <div className="space-y-3">
      <Button
        onClick={getSuggestion}
        disabled={loading}
        variant="outline"
        size="sm"
        className="border-[#8ab4ff]/30 text-[#8ab4ff] hover:bg-[#8ab4ff]/10"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4 mr-2" />
        )}
        {getLabel()}
      </Button>

      {suggestion && (
        <Card className="bg-[#8ab4ff]/5 border-[#8ab4ff]/20">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#8ab4ff]" />
                Sugjerimi i AI
              </h4>
              <div className="flex gap-2">
                <Button
                  onClick={copyToClipboard}
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                >
                  {copied ? (
                    <Check className="w-3 h-3 text-green-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </Button>
              </div>
            </div>
            <p className="text-white/80 text-sm whitespace-pre-wrap mb-3">{suggestion}</p>
            <Button
              onClick={() => onApply(suggestion)}
              size="sm"
              className="bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020]"
            >
              Apliko këtë sugjerim
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

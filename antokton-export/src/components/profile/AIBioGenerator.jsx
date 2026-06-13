import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { base44 } from "@/api/antoktonClient";

export default function AIBioGenerator({ currentBio, jobTitle, skills, onApply }) {
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const prompt = `Gjenero një jetëshkrim profesional në shqip për një ${jobTitle || 'profesionist'} me aftësi: ${skills || 'të ndryshme'}. ${currentBio ? `Jetëshkrimi aktual: ${currentBio}. Përmirësoje këtë jetëshkrim.` : 'Krijo një jetëshkrim të ri.'} Jetëshkrimi duhet të jetë 2-3 fjali, konciz dhe profesional.`;
      
      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false
      });
      
      onApply(response);
      setLoading(false);
    } catch (error) {
      alert('Gabim në gjenerimin e bio-s: ' + error.message);
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={handleGenerate}
      disabled={loading}
      className="border-[#8ab4ff]/30 text-[#8ab4ff] hover:bg-[#8ab4ff]/10"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
      {currentBio ? 'Përmirëso me AI' : 'Gjenero me AI'}
    </Button>
  );
}

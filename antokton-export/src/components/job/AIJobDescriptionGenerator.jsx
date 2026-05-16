import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { base44 } from "@/api/antoktonClient";

export default function AIJobDescriptionGenerator({ currentDescription, title, category, profession, onApply }) {
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const prompt = `Gjenero një përshkrim profesional në shqip për një njoftim pune me titull: "${title || 'pozicion pune'}", kategoria: ${category || 'pune'}, profesioni: ${profession || 'të ndryshme'}. ${currentDescription ? `Përshkrimi aktual: ${currentDescription}. Përmirësoje këtë përshkrim.` : 'Krijo një përshkrim të ri.'} Përshkrimi duhet të jetë i detajuar, 3-4 paragrafë, duke përfshirë përgjegjësitë, kërkesat dhe benefitet.`;
      
      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false
      });
      
      onApply(response);
      setLoading(false);
    } catch (error) {
      alert('Gabim në gjenerimin e përshkrimit: ' + error.message);
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
      {currentDescription ? 'Përmirëso me AI' : 'Gjenero me AI'}
    </Button>
  );
}
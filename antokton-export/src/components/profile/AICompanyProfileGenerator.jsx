import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { base44 } from "@/api/antoktonClient";

export default function AICompanyProfileGenerator({ companyName, industry, currentDescription, currentValues, currentCulture, onApply }) {
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const prompt = `Gjenero një profil kompanie profesional në shqip për kompaninë "${companyName}" në industrinë ${industry || 'të ndryshme'}. 
      
      Krijo:
      1. Përshkrim i kompanisë (3-4 fjali)
      2. Vlerat kryesore (3-5 vlera të shkurtra)
      3. Kultura e punës (2-3 fjali)
      
      ${currentDescription ? `Përmirëso këtë përshkrim: ${currentDescription}` : ''}
      
      Kthe rezultatin në këtë format JSON:
      {
        "description": "përshkrimi këtu",
        "values": "vlerat këtu",
        "culture": "kultura këtu"
      }`;
      
      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false,
        response_json_schema: {
          type: "object",
          properties: {
            description: { type: "string" },
            values: { type: "string" },
            culture: { type: "string" }
          }
        }
      });
      
      onApply(response);
      setLoading(false);
    } catch (error) {
      alert('Gabim në gjenerimin e profilit: ' + error.message);
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
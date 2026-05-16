import React, { useState } from "react";
import { base44 } from "@/api/antoktonClient";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2 } from "lucide-react";

export default function AIProfileGenerator({ companyName, industry, companySize, onGenerate }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [additionalText, setAdditionalText] = useState("");

  const handleGenerate = async () => {
    if (!companyName) {
      alert("Ju lutem shkruani emrin e kompanisë së pari");
      return;
    }

    setLoading(true);
    try {
      const response = await base44.functions.invoke("generateCompanyProfile", {
        company_name: companyName,
        industry: industry,
        company_size: companySize,
        additional_text: additionalText
      });

      if (response.data.success) {
        onGenerate(response.data.profile);
        setOpen(false);
        setAdditionalText("");
      }
    } catch (error) {
      alert("Gabim në gjenerimin e profilit: " + error.message);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          type="button" 
          variant="outline" 
          size="sm"
          className="border-[#8ab4ff] bg-[#8ab4ff]/10 text-[#8ab4ff] hover:bg-[#8ab4ff]/20"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Gjenerо me AI
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#0b1020] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Gjenerо profil kompanie me AI</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-white/60 text-sm">
            AI do të gjenerojë një profil të plotë bazuar në informacionin që keni dhënë për kompaniné.
          </p>
          
          <div className="space-y-2">
            <Label className="text-white/70">Informacion shtesë (opsional)</Label>
            <Textarea
              value={additionalText}
              onChange={(e) => setAdditionalText(e.target.value)}
              placeholder="Shkruani çfarëdo informacioni shtesë për kompaniné që doni të përfshihet në profil..."
              className="bg-white/5 border-white/10 text-white min-h-[120px]"
            />
          </div>

          <div className="bg-[#8ab4ff]/10 border border-[#8ab4ff]/20 rounded-lg p-3">
            <p className="text-[#8ab4ff] text-xs">
              <Sparkles className="w-3 h-3 inline mr-1" />
              AI do të krijojë përshkrim, vlera, kulturë dhe keyword për profilin tuaj
            </p>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={loading || !companyName}
            className="w-full bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] hover:opacity-90"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Duke gjeneruar...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Gjenerо profilin
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
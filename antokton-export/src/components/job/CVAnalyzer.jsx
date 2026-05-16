import React, { useState } from "react";
import { base44 } from "@/api/antoktonClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Sparkles, FileText, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function CVAnalyzer({ jobDescription }) {
  const [cvText, setCvText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [generatingLetter, setGeneratingLetter] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");

  const handleAnalyze = async () => {
    if (!cvText.trim()) return;
    
    setAnalyzing(true);
    try {
      const { data } = await base44.functions.invoke("analyzeCVForJob", {
        cvText,
        jobDescription
      });
      setResults(data);
    } catch (error) {
      alert("Gabim në analizë: " + error.message);
    }
    setAnalyzing(false);
  };

  const handleGenerateCoverLetter = async () => {
    if (!cvText.trim()) return;
    
    setGeneratingLetter(true);
    try {
      const user = await base44.auth.me();
      const { data } = await base44.functions.invoke("generateCoverLetter", {
        cvText,
        jobDescription,
        applicantName: user.first_name && user.surname 
          ? `${user.first_name} ${user.surname}` 
          : user.full_name || "Kandidati"
      });
      setCoverLetter(data.cover_letter);
    } catch (error) {
      alert("Gabim në gjenerim: " + error.message);
    }
    setGeneratingLetter(false);
  };

  return (
    <div className="space-y-4">
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#8ab4ff]" />
            Analizo CV-në me AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={cvText}
            onChange={(e) => setCvText(e.target.value)}
            placeholder="Ngjit përmbajtjen e CV-së këtu..."
            className="bg-white/5 border-white/10 text-white min-h-[200px]"
          />
          
          <div className="flex gap-3">
            <Button
              onClick={handleAnalyze}
              disabled={analyzing || !cvText.trim()}
              className="flex-1 bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] hover:opacity-90"
            >
              {analyzing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Analizo CV-në
            </Button>
            
            <Button
              onClick={handleGenerateCoverLetter}
              disabled={generatingLetter || !cvText.trim()}
              variant="outline"
              className="flex-1 border-white/10 text-white hover:bg-white/5"
            >
              {generatingLetter ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              Gjenero letër motivuese
            </Button>
          </div>
        </CardContent>
      </Card>

      {results && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-gradient-to-br from-[#8ab4ff]/10 to-[#9bffd6]/10 border-[#8ab4ff]/30">
            <CardHeader>
              <CardTitle className="text-white text-lg">
                Rezultatet e analizës
              </CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 bg-white/10 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] h-full rounded-full transition-all"
                    style={{ width: `${results.match_score}%` }}
                  />
                </div>
                <span className="text-white font-semibold">{results.match_score}%</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-white/70 text-sm">{results.overall_feedback}</p>
              
              <div className="space-y-2">
                <h4 className="text-white font-semibold text-sm">Sugjerime për përmirësim:</h4>
                {results.suggestions.map((sug, i) => (
                  <div key={i} className="p-3 rounded-lg bg-white/5">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-[#9bffd6] mt-0.5 shrink-0" />
                      <div>
                        <p className="text-white text-sm font-medium">{sug.title}</p>
                        <p className="text-white/60 text-xs mt-1">{sug.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {coverLetter && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center justify-between">
                Letra motivuese
                <Button
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(coverLetter)}
                  variant="outline"
                  className="border-white/10 text-white hover:bg-white/5"
                >
                  Kopjo
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-white/5 rounded-lg p-4 text-white/80 text-sm whitespace-pre-wrap">
                {coverLetter}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
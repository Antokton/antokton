import React, { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function AlbanianSpellcheck({ value, onChange, label, placeholder, className, rows = 4 }) {
  const [spellcheckEnabled, setSpellcheckEnabled] = useState(true);

  return (
    <div className="space-y-2">
      {label && <Label className="text-white/70">{label}</Label>}
      <Textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={className}
        rows={rows}
        lang={spellcheckEnabled ? "sq" : "en"}
        spellCheck={spellcheckEnabled}
      />
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={spellcheckEnabled}
          onChange={(e) => setSpellcheckEnabled(e.target.checked)}
          className="w-4 h-4"
          id={`spellcheck-${label}`}
        />
        <label htmlFor={`spellcheck-${label}`} className="text-white/50 text-xs cursor-pointer">
          Autocorrect në shqip
        </label>
      </div>
    </div>
  );
}
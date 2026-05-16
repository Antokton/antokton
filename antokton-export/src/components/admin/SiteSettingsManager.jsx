import React, { useState, useEffect } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Save, Loader2, Plus, Trash2, Upload, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";

// Auto-detect logo/favicon from known social platforms
function getAutoLogo(url) {
  if (!url) return null;
  const u = url.toLowerCase();
  if (u.includes("facebook.com") || u.includes("fb.com")) return "/local-assets/icons/facebook.svg";
  if (u.includes("instagram.com")) return "/local-assets/icons/instagram.png";
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "/local-assets/icons/youtube.svg";
  if (u.includes("tiktok.com")) return "/local-assets/icons/tiktok.svg";
  if (u.includes("t.me") || u.includes("telegram")) return "/local-assets/icons/telegram.svg";
  if (u.includes("twitter.com") || u.includes("x.com")) return "/local-assets/icons/x.svg";
  if (u.includes("linkedin.com")) return "/local-assets/icons/linkedin.svg";
  if (u.includes("whatsapp.com") || u.includes("wa.me")) return "/local-assets/icons/whatsapp.svg";
  if (u.includes("snapchat.com")) return "/local-assets/icons/snapchat.svg";
  // Generic local fallback
  try {
    new URL(url);
    return "/local-assets/icons/link.svg";
  } catch { return null; }
}

// Static groups that have fixed fields
const STATIC_GROUPS = [
  {
    group: "contact", label: "📞 Kontakti",
    fields: [
      { key: "contact_email", label: "Email kontakti", placeholder: "info@antokton.com", type: "text" },
      { key: "contact_phone", label: "Telefon", placeholder: "+383...", type: "text" },
      { key: "contact_whatsapp", label: "WhatsApp", placeholder: "+383...", type: "text" },
      { key: "contact_address", label: "Adresa", placeholder: "Prishtinë, Kosovë", type: "text" },
    ]
  },
  {
    group: "seo", label: "🔍 SEO & Meta",
    fields: [
      { key: "seo_title", label: "Titulli i Faqes (meta title)", placeholder: "Antokton - Platformë Komunitare", type: "text" },
      { key: "seo_description", label: "Përshkrimi (meta description)", placeholder: "Platforma shqiptare për punësim dhe komunitet...", type: "textarea" },
      { key: "seo_keywords", label: "Keywords (me presje)", placeholder: "punë, diaspora shqiptare, Europë", type: "text" },
    ]
  },
  {
    group: "footer", label: "📄 Footer",
    fields: [
      { key: "footer_tagline", label: "Tagline i Footerit", placeholder: "Platforma komunitare & punësimit...", type: "textarea" },
      { key: "footer_copyright", label: "Teksti i Copyright", placeholder: "© 2026 Antokton. Të gjitha të drejtat...", type: "text" },
    ]
  },
  {
    group: "app", label: "⚙️ Aplikacioni",
    fields: [
      { key: "app_name", label: "Emri i Aplikacionit", placeholder: "Antokton", type: "text" },
      { key: "app_tagline", label: "Slogani kryesor", placeholder: "Vllaznia që a n'tok ton...", type: "text" },
      { key: "app_description", label: "Përshkrimi i shkurtër", placeholder: "Platforma shqiptare...", type: "textarea" },
      { key: "app_email_support", label: "Email suport", placeholder: "support@antokton.com", type: "text" },
    ]
  },
];

// ─── Social Links Manager (dynamic) ─────────────────────────────────────────
function SocialLinksManager({ configs, onSaved }) {
  const queryClient = useQueryClient();
  const [links, setLinks] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(null); // index

  useEffect(() => {
    const raw = configs.find(c => c.key === "social_links_v2");
    if (raw?.value) {
      try { setLinks(JSON.parse(raw.value)); return; } catch {}
    }
    // Migrate old individual social fields
    const oldKeys = ["social_facebook","social_instagram","social_youtube","social_tiktok","social_telegram"];
    const migrated = oldKeys.map((k, i) => {
      const cfg = configs.find(c => c.key === k);
      return cfg?.value ? { id: k + i, url: cfg.value, label: k.replace("social_","").charAt(0).toUpperCase() + k.slice(8), customLogo: "" } : null;
    }).filter(Boolean);
    if (migrated.length > 0) setLinks(migrated);
    else setLinks([{ id: Date.now(), url: "", label: "Facebook", customLogo: "" }]);
  }, [configs]);

  const add = () => setLinks(l => [...l, { id: Date.now(), url: "", label: "", customLogo: "" }]);
  const remove = (idx) => setLinks(l => l.filter((_, i) => i !== idx));
  const update = (idx, field, val) => setLinks(l => l.map((item, i) => i === idx ? { ...item, [field]: val } : item));

  const handleUpload = async (idx, file) => {
    setUploading(idx);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      update(idx, "customLogo", file_url);
    } catch { toast.error("Gabim gjatë ngarkimit"); }
    finally { setUploading(null); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const existing = configs.find(c => c.key === "social_links_v2");
      const val = JSON.stringify(links);
      if (existing) {
        await base44.entities.SiteConfig.update(existing.id, { value: val });
      } else {
        await base44.entities.SiteConfig.create({ key: "social_links_v2", value: val, label: "Rrjetet Sociale", group: "social" });
      }
      queryClient.invalidateQueries({ queryKey: ["siteConfig"] });
      toast.success("Rrjetet sociale u ruajtën!");
      onSaved?.();
    } catch { toast.error("Gabim gjatë ruajtjes"); }
    finally { setSaving(false); }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <h3 className="text-white font-semibold mb-4 text-sm">🌐 Rrjetet Sociale</h3>
      <div className="space-y-3">
        {links.map((link, idx) => {
          const autoLogo = getAutoLogo(link.url);
          const displayLogo = link.customLogo || autoLogo;
          return (
            <div key={link.id} className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
              <div className="flex items-center gap-2">
                {/* Logo preview */}
                <div className="w-9 h-9 rounded-lg border border-white/10 bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                  {displayLogo
                    ? <img src={displayLogo} alt="logo" className="w-7 h-7 object-contain" onError={e => e.target.style.display='none'} />
                    : <ExternalLink className="w-4 h-4 text-white/30" />
                  }
                </div>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <Input
                    value={link.label}
                    onChange={e => update(idx, "label", e.target.value)}
                    placeholder="Emri (Facebook, Grupi...)"
                    className="h-8 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                  <Input
                    value={link.url}
                    onChange={e => update(idx, "url", e.target.value)}
                    placeholder="https://..."
                    className="h-8 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                </div>
                <button onClick={() => remove(idx)} className="text-red-400 hover:text-red-300 shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {/* Custom logo upload */}
              <div className="flex items-center gap-2 pl-11">
                <span className="text-white/40 text-xs">Logo custom:</span>
                <label className="cursor-pointer flex items-center gap-1 text-xs text-[#8ab4ff] hover:text-white transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  {uploading === idx ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Ngarko logo"}
                  <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && handleUpload(idx, e.target.files[0])} />
                </label>
                {link.customLogo && (
                  <button onClick={() => update(idx, "customLogo", "")} className="text-white/30 hover:text-red-400 text-xs">✕ Hiq custom</button>
                )}
                {!link.customLogo && autoLogo && (
                  <span className="text-white/30 text-xs">← Logo automatike nga URL</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-2 mt-3">
        <Button onClick={add} variant="outline" className="h-8 text-xs border-white/10 text-white/60 hover:text-white gap-1">
          <Plus className="w-3.5 h-3.5" /> Shto Rrjet Social
        </Button>
        <Button onClick={handleSave} disabled={saving} className="h-8 text-xs bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] ml-auto">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
          Ruaj Rrjetet Sociale
        </Button>
      </div>
    </div>
  );
}

// ─── Dynamic Fields Group (add/remove fields) ────────────────────────────────
function DynamicGroup({ groupDef, configs, queryClient }) {
  const [fields, setFields] = useState(groupDef.fields.map(f => ({ ...f })));
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState("text");

  useEffect(() => {
    const map = {};
    configs.forEach(c => { map[c.key] = c.value; });
    setValues(map);
    // Load dynamic extra fields for this group
    const extraKey = `${groupDef.group}_extra_fields`;
    const raw = configs.find(c => c.key === extraKey);
    if (raw?.value) {
      try {
        const extra = JSON.parse(raw.value);
        setFields([...groupDef.fields, ...extra]);
        return;
      } catch {}
    }
    setFields(groupDef.fields.map(f => ({ ...f })));
  }, [configs]);

  const addField = () => {
    if (!newLabel.trim()) return;
    const key = `${groupDef.group}_custom_${Date.now()}`;
    setFields(f => [...f, { key, label: newLabel.trim(), placeholder: "", type: newType, custom: true }]);
    setNewLabel("");
  };

  const removeCustomField = (key) => setFields(f => f.filter(fi => fi.key !== key));

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save values
      for (const field of fields) {
        const val = values[field.key] ?? "";
        const existing = configs.find(c => c.key === field.key);
        if (existing) {
          await base44.entities.SiteConfig.update(existing.id, { value: val });
        } else {
          await base44.entities.SiteConfig.create({ key: field.key, value: val, label: field.label, group: groupDef.group });
        }
      }
      // Save extra field definitions
      const extraKey = `${groupDef.group}_extra_fields`;
      const customFields = fields.filter(f => f.custom);
      const existingExtra = configs.find(c => c.key === extraKey);
      const extraVal = JSON.stringify(customFields);
      if (existingExtra) {
        await base44.entities.SiteConfig.update(existingExtra.id, { value: extraVal });
      } else if (customFields.length > 0) {
        await base44.entities.SiteConfig.create({ key: extraKey, value: extraVal, label: "Extra Fields", group: groupDef.group });
      }
      queryClient.invalidateQueries({ queryKey: ["siteConfig"] });
      toast.success("Cilësimet u ruajtën!");
    } catch { toast.error("Gabim gjatë ruajtjes"); }
    finally { setSaving(false); }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <h3 className="text-white font-semibold mb-4 text-sm">{groupDef.label}</h3>
      <div className="space-y-3">
        {fields.map(field => (
          <div key={field.key} className="flex items-start gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-1 mb-1">
                <label className="text-white/60 text-xs font-medium">{field.label}</label>
                {field.custom && (
                  <button onClick={() => removeCustomField(field.key)} className="text-red-400/60 hover:text-red-400 ml-1">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
              {field.type === "textarea" ? (
                <Textarea
                  value={values[field.key] || ""}
                  onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="min-h-[70px] resize-none text-sm bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              ) : (
                <Input
                  value={values[field.key] || ""}
                  onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="h-9 text-sm bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add new field */}
      <div className="mt-4 pt-3 border-t border-white/10">
        <p className="text-white/40 text-xs mb-2">Shto fushë të re:</p>
        <div className="flex items-center gap-2">
          <Input
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            placeholder="Etiketa e fushës..."
            className="h-8 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/30 flex-1"
            onKeyDown={e => e.key === "Enter" && addField()}
          />
          <select
            value={newType}
            onChange={e => setNewType(e.target.value)}
            className="h-8 text-xs bg-[#0b1020] border border-white/10 text-white rounded-md px-2"
          >
            <option value="text">Tekst</option>
            <option value="textarea">Textarea</option>
          </select>
          <Button onClick={addField} variant="outline" className="h-8 text-xs border-white/10 text-white/60 hover:text-white gap-1 shrink-0">
            <Plus className="w-3.5 h-3.5" /> Shto
          </Button>
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={saving}
        className="mt-4 bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] h-8 text-xs"
      >
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
        Ruaj {groupDef.label.split(" ").slice(1).join(" ")}
      </Button>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function SiteSettingsManager() {
  const queryClient = useQueryClient();

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ["siteConfig"],
    queryFn: () => base44.entities.SiteConfig.list(),
  });

  if (isLoading) {
    return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-white/30 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Social links - special dynamic manager */}
      <SocialLinksManager configs={configs} />

      {/* Static groups - all with dynamic add/remove fields */}
      {STATIC_GROUPS.map(group => (
        <DynamicGroup key={group.group} groupDef={group} configs={configs} queryClient={queryClient} />
      ))}
    </div>
  );
}

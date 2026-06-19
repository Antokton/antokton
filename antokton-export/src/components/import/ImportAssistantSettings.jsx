import React, { useState } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2, Play, Save } from "lucide-react";

export default function ImportAssistantSettings() {
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const { data: settings = {}, isLoading } = useQuery({
    queryKey: ["importAssistant", "settings"],
    queryFn: () => base44.importAssistant.settings(),
  });
  const { data: logs = [] } = useQuery({
    queryKey: ["importAssistant", "logs"],
    queryFn: () => base44.importAssistant.logs(),
  });
  const [form, setForm] = useState(null);
  const values = form || settings;

  React.useEffect(() => {
    if (!form && settings?.id) setForm(settings);
  }, [settings, form]);

  const update = (key, value) => setForm((current) => ({ ...(current || settings), [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      await base44.importAssistant.updateSettings(values);
      await qc.invalidateQueries({ queryKey: ["importAssistant", "settings"] });
      alert("Cilësimet u ruajtën.");
    } finally {
      setSaving(false);
    }
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const result = await base44.importAssistant.run({ max_items: values.max_items_per_run || 100 });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["importedPosts"] }),
        qc.invalidateQueries({ queryKey: ["importAssistant", "logs"] }),
      ]);
      alert(`Importimi përfundoi: ${result.created_count || 0} të reja, ${result.duplicate_count || 0} dublikata.`);
    } catch (error) {
      alert(error?.message || "Importimi dështoi.");
    } finally {
      setRunning(false);
    }
  };

  if (isLoading) return <div className="py-10 text-center text-white/50">Duke ngarkuar...</div>;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_1fr]">
      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-4">
        <div>
          <h2 className="text-white font-bold">Roboti i importimit</h2>
          <p className="text-white/55 text-xs mt-1">Importon nga burime publike/API/RSS dhe i ruan si pending_review.</p>
        </div>
        <label className="flex items-center justify-between gap-3 text-sm text-white/80">
          Auto Import
          <Switch checked={values.auto_import_enabled !== false} onCheckedChange={(v) => update("auto_import_enabled", v)} />
        </label>
        <label className="block text-xs text-white/60">
          Frekuenca (orë)
          <Input type="number" min="1" value={values.import_frequency_hours || 6} onChange={(e) => update("import_frequency_hours", Number(e.target.value))} className="mt-1 bg-white/5 border-white/10 text-white" />
        </label>
        <label className="block text-xs text-white/60">
          Maksimumi për import
          <Input type="number" min="1" value={values.max_items_per_run || 100} onChange={(e) => update("max_items_per_run", Number(e.target.value))} className="mt-1 bg-white/5 border-white/10 text-white" />
        </label>
        <label className="flex items-center justify-between gap-3 text-sm text-white/80">
          Auto Publish
          <Switch checked={values.auto_publish_enabled === true} onCheckedChange={(v) => update("auto_publish_enabled", v)} />
        </label>
        <p className="rounded-lg border border-yellow-300/20 bg-yellow-300/10 p-3 text-xs text-yellow-100">
          Siguria bazë: auto-publish është OFF. Njoftimet e importuara hyjnë në radhë për miratim nga stafi.
        </p>
        <div className="flex flex-wrap gap-2">
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Ruaj
          </button>
          <button onClick={runNow} disabled={running} className="inline-flex items-center gap-2 rounded-lg bg-[#8ff0cf] px-3 py-2 text-sm font-semibold text-[#06111f] disabled:opacity-50">
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Importo tani
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h2 className="text-white font-bold mb-3">Import logs</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-white/45">
              <tr><th className="text-left py-2">Provider</th><th>Statusi</th><th>Të marra</th><th>Të reja</th><th>Dublikata</th><th>Gabime</th></tr>
            </thead>
            <tbody>
              {logs.slice(0, 12).map((log) => (
                <tr key={log.id} className="border-t border-white/5 text-white/75">
                  <td className="py-2">{log.provider_key || "—"}</td>
                  <td>{log.status || "—"}</td>
                  <td>{log.fetched_count || 0}</td>
                  <td>{log.created_count || 0}</td>
                  <td>{log.duplicate_count || 0}</td>
                  <td className="text-red-200">{log.error_count || 0}</td>
                </tr>
              ))}
              {!logs.length && <tr><td colSpan={6} className="py-8 text-center text-white/40">Ende nuk ka logs.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

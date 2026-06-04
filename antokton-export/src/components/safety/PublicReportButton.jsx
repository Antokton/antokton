import React, { useState } from "react";
import { base44 } from "@/api/antoktonClient";
import { Flag, X } from "lucide-react";

const REASONS = [
  { value: "inappropriate", label: "Përmbajtje e papërshtatshme" },
  { value: "fake", label: "Mashtrim / njoftim i rremë" },
  { value: "offensive", label: "Gjuhë fyese" },
  { value: "spam", label: "Spam" },
  { value: "other", label: "Tjetër" },
];

function cleanText(value, max = 1200) {
  return String(value || "").replace(/[<>]/g, "").trim().slice(0, max);
}

export default function PublicReportButton({
  entity,
  entityId,
  title,
  reportedUserEmail,
  currentUser,
  className = "",
  compact = false,
  onClick,
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("inappropriate");
  const [description, setDescription] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [reporterContact, setReporterContact] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!entity || !entityId || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await base44.entities.Report.create({
        post_id: entityId,
        post_title: cleanText(title, 200),
        post_category: entity,
        reported_entity: entity,
        reported_entity_id: entityId,
        reported_user_email: cleanText(reportedUserEmail, 160),
        reporter_id: currentUser?.id || "",
        reporter_email: currentUser?.email || cleanText(reporterContact, 160),
        reporter_name: currentUser?.full_name || currentUser?.first_name || cleanText(reporterName, 120),
        reporter_contact: currentUser?.email || cleanText(reporterContact, 160),
        reason,
        description: cleanText(description),
        details: cleanText(description),
        status: "new",
      });
      setDone(true);
      setTimeout(() => {
        setOpen(false);
        setDone(false);
        setDescription("");
        setReporterName("");
        setReporterContact("");
      }, 1200);
    } catch (err) {
      setError(err?.message || "Raportimi nuk u ruajt. Provo përsëri.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onClick?.(event);
          setOpen(true);
        }}
        className={className || "inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-white/55 hover:border-orange-400/30 hover:text-orange-200"}
        aria-label="Raporto"
      >
        <Flag className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        {!compact && "Raporto"}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/75 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b1020] p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-base font-bold text-white">
                <Flag className="h-4 w-4 text-orange-300" /> Raporto
              </h3>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-white/60">Arsyeja e raportimit</label>
                <select
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#111a2c] px-3 py-2 text-sm text-white"
                >
                  {REASONS.map((item) => (
                    <option key={item.value} value={item.value} className="bg-[#0b1020]">{item.label}</option>
                  ))}
                </select>
              </div>

              {!currentUser && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <input
                    value={reporterName}
                    onChange={(event) => setReporterName(event.target.value)}
                    placeholder="Emri juaj (opsional)"
                    className="rounded-xl border border-white/10 bg-[#111a2c] px-3 py-2 text-sm text-white placeholder:text-white/35"
                  />
                  <input
                    value={reporterContact}
                    onChange={(event) => setReporterContact(event.target.value)}
                    placeholder="Email kontakti (opsional)"
                    className="rounded-xl border border-white/10 bg-[#111a2c] px-3 py-2 text-sm text-white placeholder:text-white/35"
                  />
                </div>
              )}

              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Përshkrim shtesë opsional..."
                rows={4}
                className="w-full resize-none rounded-xl border border-white/10 bg-[#111a2c] px-3 py-2 text-sm text-white placeholder:text-white/35"
              />

              {error && <p className="text-xs text-red-300">{error}</p>}
              {done && <p className="text-xs text-emerald-300">Raportimi u dërgua për shqyrtim.</p>}

              <button
                type="button"
                onClick={submit}
                disabled={submitting || done}
                className="w-full rounded-xl bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] px-4 py-2.5 text-sm font-bold text-[#0b1020] disabled:opacity-60"
              >
                {submitting ? "Duke dërguar..." : "Dërgo raportimin"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

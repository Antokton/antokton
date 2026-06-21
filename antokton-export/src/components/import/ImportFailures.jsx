import React from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import moment from "moment";

const STATUS_LABELS = {
  rejected_low_quality_import: "Refuzuar: cilësi e ulët",
  rejected_non_job_page: "Refuzuar: faqe jo pune",
  rejected_missing_original_url: "Refuzuar: mungon URL",
  rejected_missing_title: "Refuzuar: mungon titulli",
  rejected_placeholder_url: "Refuzuar: URL placeholder",
  rejected_bad_encoding: "Refuzuar: tekst i prishur",
  skipped_missing_parser_config: "Kapërcyer: mungon parser-i",
};

export default function ImportFailures() {
  const { data: failures = [], isLoading } = useQuery({
    queryKey: ["importAssistant", "failures"],
    queryFn: () => base44.importAssistant.failures(),
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>;
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-yellow-300/20 bg-yellow-300/10 p-3 text-xs text-yellow-100">
        Këtu shfaqen importet që u refuzuan para krijimit të postimit, për shembull faqe marketingu,
        URL placeholder ose njoftime pa fusha minimale pune.
      </div>
      {!failures.length ? (
        <div className="py-12 text-center text-sm text-white/40">Nuk ka refuzime importi.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-left text-white/50">
                <th className="px-3 py-2.5">Statusi</th>
                <th className="px-3 py-2.5">Cilësia</th>
                <th className="px-3 py-2.5">Arsyeja</th>
                <th className="px-3 py-2.5">Burimi</th>
                <th className="px-3 py-2.5">Titulli</th>
                <th className="px-3 py-2.5">URL</th>
                <th className="px-3 py-2.5">Data</th>
              </tr>
            </thead>
            <tbody>
              {failures.map((failure) => (
                <tr key={failure.id || `${failure.original_url}-${failure.created_at}`} className="border-b border-white/5 text-white/70">
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className="rounded-full bg-red-400/15 px-2 py-0.5 text-[10px] font-semibold text-red-200">
                      {STATUS_LABELS[failure.status] || failure.status || "Refuzuar"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {Number.isFinite(Number(failure.quality_score)) ? `${Math.round(Number(failure.quality_score))}/100` : "—"}
                  </td>
                  <td className="px-3 py-2.5 min-w-[220px]">{failure.reason || "—"}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{failure.source_name || failure.provider || "—"}</td>
                  <td className="px-3 py-2.5 min-w-[180px]">{failure.original_title || "—"}</td>
                  <td className="px-3 py-2.5 min-w-[260px] max-w-[420px] truncate">
                    {failure.original_url ? (
                      <a href={failure.original_url} target="_blank" rel="noreferrer" className="text-[#8ab4ff] underline underline-offset-2">
                        {failure.original_url}
                      </a>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{failure.created_date || failure.created_at ? moment(failure.created_date || failure.created_at).format("DD/MM/YY HH:mm") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

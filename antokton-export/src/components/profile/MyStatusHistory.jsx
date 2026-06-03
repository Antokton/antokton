import React, { useMemo, useState } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery } from "@tanstack/react-query";
import { Download, Filter } from "lucide-react";
import moment from "moment";

function downloadFile(filename, content, type = "application/json") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function MyStatusHistory({ user }) {
  const [fromDate, setFromDate] = useState("");
  const [visibility, setVisibility] = useState("all");
  const threeYearsAgo = useMemo(() => moment().subtract(3, "years").startOf("day"), []);

  const { data: statuses = [], isLoading } = useQuery({
    queryKey: ["myStatuses", user?.email],
    queryFn: () => base44.entities.Status.filter({ author_email: user.email }, "-created_date", 500),
    enabled: !!user?.email,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["allStatusCommentsForHistory", user?.email],
    queryFn: () => base44.entities.StatusComment.list("-created_date", 2000),
    enabled: !!user?.email && statuses.length > 0,
  });

  const filtered = useMemo(() => {
    const minDate = fromDate ? moment(fromDate).startOf("day") : threeYearsAgo;
    return statuses
      .filter((status) => moment(status.created_date).isSameOrAfter(minDate))
      .filter((status) => visibility === "all" || (status.visibility || "public") === visibility)
      .map((status) => ({
        ...status,
        comments: comments.filter((comment) => comment.status_id === status.id),
      }));
  }, [comments, fromDate, statuses, threeYearsAgo, visibility]);

  const exportJson = () => {
    const payload = filtered.map((status) => ({
      id: status.id,
      text: status.text,
      visibility: status.visibility || "public",
      created_date: status.created_date,
      comments_count: status.comments?.length || 0,
      comments: (status.comments || []).map((comment) => ({
        author_name: comment.author_name,
        author_email: comment.author_email,
        text: comment.text,
        created_date: comment.created_date,
      })),
    }));
    downloadFile(`historiku-statuset-${moment().format("YYYYMMDD")}.json`, JSON.stringify(payload, null, 2));
  };

  const exportCsv = () => {
    const rows = [["data", "dukshmeria", "statusi", "komente"]];
    for (const status of filtered) {
      rows.push([
        status.created_date,
        status.visibility || "public",
        String(status.text || "").replace(/\s+/g, " ").trim(),
        String(status.comments?.length || 0),
      ]);
    }
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    downloadFile(`historiku-statuset-${moment().format("YYYYMMDD")}.csv`, csv, "text/csv");
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Statuset e mia</h3>
          <p className="text-sm text-white/50">Postimet e publikuara gjatë 3 viteve të fundit, me komentet përkatëse.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportJson} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15">
            <Download className="h-4 w-4" /> Shkarko JSON
          </button>
          <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15">
            <Download className="h-4 w-4" /> Shkarko CSV
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="text-xs font-semibold text-white/60">
          Nga data
          <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-[#0f1929] px-3 py-2 text-white" />
        </label>
        <label className="text-xs font-semibold text-white/60">
          Privatësia
          <select value={visibility} onChange={(event) => setVisibility(event.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-[#0f1929] px-3 py-2 text-white">
            <option value="all">Të gjitha</option>
            <option value="public">Publik</option>
            <option value="wide_circle">Rrethi i gjerë</option>
            <option value="close_circle">Rrethi i ngushtë</option>
          </select>
        </label>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-white/50">Duke ngarkuar...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/50">
          <Filter className="mx-auto mb-2 h-5 w-5" />
          Nuk ka status për këtë filtër.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((status) => (
            <article key={status.id} className="rounded-xl border border-white/10 bg-[#101b2d] p-3">
              <div className="mb-2 flex items-center justify-between gap-2 text-xs text-white/40">
                <span>{moment(status.created_date).format("DD/MM/YYYY HH:mm")}</span>
                <span>{status.visibility === "wide_circle" ? "Rrethi i gjerë" : status.visibility === "close_circle" ? "Rrethi i ngushtë" : "Publik"}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-white/85">{status.text || "(pa tekst)"}</p>
              {(status.comments || []).length > 0 && (
                <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                  {status.comments.map((comment) => (
                    <div key={comment.id} className="rounded-lg bg-white/5 px-3 py-2 text-xs text-white/70">
                      <strong className="text-white/90">{comment.author_name || comment.author_email}:</strong> {comment.text}
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

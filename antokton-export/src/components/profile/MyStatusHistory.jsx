import React, { useMemo, useState } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery } from "@tanstack/react-query";
import { Download, Filter, Globe, Link2, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import moment from "moment";
import UserAvatar from "@/components/ui/UserAvatar";

function downloadFile(filename, content, type = "application/json") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

const visibilityLabels = {
  public: "Publik",
  wide_circle: "Rrethi i gjerë",
  close_circle: "Rrethi i ngushtë",
};

function getAuthorName(user) {
  return (
    user?.display_name ||
    user?.public_name ||
    user?.full_name ||
    [user?.first_name, user?.surname].filter(Boolean).join(" ") ||
    user?.first_name ||
    user?.email?.split("@")[0] ||
    "Unë"
  );
}

function getStatusText(status) {
  return status.text || status.content || status.caption || "";
}

function getStatusLink(status) {
  return status.import_show_source_link ? (status.link_url || status.import_source_url || "") : (status.link_url || "");
}

export default function MyStatusHistory({ user }) {
  const [fromDate, setFromDate] = useState("");
  const [visibility, setVisibility] = useState("all");
  const threeYearsAgo = useMemo(() => moment().subtract(3, "years").startOf("day"), []);
  const authorName = getAuthorName(user);

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
          {filtered.map((status) => {
            const statusText = getStatusText(status);
            const statusLink = getStatusLink(status);
            const created = status.created_date || status.created_at;
            return (
              <article key={status.id} className="overflow-hidden rounded-none border border-white/10 bg-[#1a2640] sm:rounded-2xl">
                <div className="flex items-start justify-between gap-3 px-4 pb-2 pt-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <UserAvatar
                      name={authorName}
                      email={user?.email}
                      photoUrl={user?.profile_photo_url}
                      size={40}
                    />
                    <div className="min-w-0">
                      <Link
                        to={`/Member/${encodeURIComponent(user?.email || "")}?name=${encodeURIComponent(authorName)}`}
                        className="block truncate text-[14px] font-bold leading-snug text-white hover:text-[#8ab4ff]"
                      >
                        {authorName}
                      </Link>
                      <p className="mt-0.5 flex flex-wrap items-center gap-1 text-[12px] text-white/40">
                        <span>{created ? moment(created).fromNow() : "Pa datë"}</span>
                        <span>·</span>
                        <Globe className="h-3 w-3" />
                        <span>{visibilityLabels[status.visibility || "public"] || "Publik"}</span>
                      </p>
                    </div>
                  </div>
                  {status.category && (
                    <span className="shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-white/50">
                      {status.category}
                    </span>
                  )}
                </div>

                {statusText && (
                  <p className="whitespace-pre-wrap break-words px-4 pb-3 text-[14px] leading-snug text-white">
                    {statusText}
                  </p>
                )}

                {status.image_url && (
                  <img
                    src={status.image_url}
                    alt=""
                    className="max-h-[520px] w-full object-cover"
                    loading="lazy"
                  />
                )}

                {statusLink && (
                  <div className="mx-4 mb-2 mt-2">
                    <a
                      href={statusLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-w-0 items-center gap-2 rounded-xl border border-white/10 p-3 text-sm text-[#8ab4ff]"
                      style={{ background: "#253347" }}
                    >
                      <Link2 className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 break-all">{statusLink}</span>
                    </a>
                  </div>
                )}

                <div className="flex items-center gap-2 border-t border-white/[0.06] px-4 py-2 text-[13px] font-semibold text-white/50">
                  <MessageCircle className="h-4 w-4" />
                  <span>{status.comments?.length || 0} komente</span>
                </div>

                {(status.comments || []).length > 0 && (
                  <div className="space-y-2 border-t border-white/10 px-4 py-3">
                    {status.comments.map((comment) => (
                      <div key={comment.id} className="rounded-xl bg-white/[0.06] px-3 py-2 text-xs text-white/70">
                        <strong className="text-white/90">{comment.author_name || comment.author_email || "Koment"}:</strong>{" "}
                        <span className="break-words">{comment.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

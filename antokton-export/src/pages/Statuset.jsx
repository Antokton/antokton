import React, { useState, useEffect, useRef, useMemo } from "react";
import { base44 } from "@/api/antoktonClient";
import { createPortal } from "react-dom";
import PullToRefresh from "@/components/PullToRefresh";
import UserAvatar from "@/components/ui/UserAvatar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Image, Link2, Smile, MapPin, MessageCircle, Send, X,
  Briefcase, ShoppingBag, Calendar, Users, Newspaper,
  Globe, MoreHorizontal, Home, Trash2, Flag, Copy, Check,
  ThumbsUp, ThumbsDown, Forward, ArrowLeft, Edit2,
  ShieldCheck, EyeOff, Lock
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";

/* ─── LIGHTBOX PORTAL ─── */
function Lightbox({ src, onClose, status, currentUser, onLike, onComment, onShare }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [imgSaved, setImgSaved] = useState(false);

  const savePhoto = () => {
    const a = document.createElement("a");
    a.href = src;
    a.download = "foto.jpg";
    a.target = "_blank";
    a.click();
    setImgSaved(true);
    setTimeout(() => setImgSaved(false), 2000);
    setMenuOpen(false);
  };

  const reactionsMap = status?.reactions || {};
  const currentReaction = currentUser ? (reactionsMap[currentUser.email] || null) : null;
  const totalReactions = Object.keys(reactionsMap).length;
  const commentCount = status?.comments_count || 0;
  const reactionInfo = currentReaction
    ? (REACTIONS.find(r => r.emoji === currentReaction) || { emoji: currentReaction, color: "#9bffd6" })
    : null;

  return createPortal(
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 2147483647, background: "rgba(0,0,0,0.95)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>

      {/* Top bar */}
      <div
        onClick={e => e.stopPropagation()}
        style={{ position: "fixed", top: 0, left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "calc(env(safe-area-inset-top) + 12px) 16px 12px", background: "rgba(0,0,0,0.5)", zIndex: 2 }}>
        <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>
          {status?.author_name || ""}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* 3-pika menu */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setMenuOpen(v => !v)}
              style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}>
              <MoreHorizontal style={{ width: 20, height: 20 }} />
            </button>
            {menuOpen && (
              <div
                onClick={e => e.stopPropagation()}
                style={{ position: "absolute", top: 48, right: 0, background: "#1a2640", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, minWidth: 180, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.6)", zIndex: 10 }}>
                <button onClick={savePhoto}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: "none", border: "none", color: imgSaved ? "#9bffd6" : "#fff", fontSize: 13, cursor: "pointer", textAlign: "left" }}>
                  <Image style={{ width: 16, height: 16 }} /> {imgSaved ? "U ruajt!" : "Ruaj foton"}
                </button>
                {onShare && (
                  <button onClick={() => { setMenuOpen(false); onShare(); }}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: "none", border: "none", color: "#fff", fontSize: 13, cursor: "pointer", textAlign: "left" }}>
                    <Forward style={{ width: 16, height: 16 }} /> Shpërnda
                  </button>
                )}
                <button onClick={() => { setMenuOpen(false); onClose(); }}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: "none", border: "none", color: "rgba(255,255,255,0.6)", fontSize: 13, cursor: "pointer", textAlign: "left" }}>
                  <X style={{ width: 16, height: 16 }} /> Mbyll
                </button>
              </div>
            )}
          </div>
          {/* X buton */}
          <button
            onClick={e => { e.stopPropagation(); onClose(); }}
            style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", fontSize: 22, fontWeight: 700, lineHeight: 1 }}>
            ✕
          </button>
        </div>
      </div>

      {/* Image */}
      <img src={src} alt="" onClick={e => e.stopPropagation()}
        style={{ maxWidth: "92vw", maxHeight: "78vh", borderRadius: 8, objectFit: "contain" }} />

      {/* Bottom action bar */}
      {status && (
        <div
          onClick={e => e.stopPropagation()}
          style={{ position: "fixed", bottom: 0, left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 16px", background: "rgba(0,0,0,0.5)" }}>
          {/* Like */}
          <button onClick={() => onLike && onLike()}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 999, background: "rgba(255,255,255,0.1)", border: "none", color: currentReaction ? (reactionInfo?.color || "#8ab4ff") : "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
            {currentReaction
              ? <span style={{ fontSize: 18 }}>{reactionInfo?.emoji}</span>
              : <ThumbsUp style={{ width: 18, height: 18 }} />}
            {totalReactions > 0 && <span>{totalReactions}</span>}
          </button>
          {/* Comment */}
          <button onClick={() => { onClose(); onComment && onComment(); }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 999, background: "rgba(255,255,255,0.1)", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
            <MessageCircle style={{ width: 18, height: 18 }} />
            {commentCount > 0 && <span>{commentCount}</span>}
          </button>
          {/* Share */}
          <button onClick={() => onShare && onShare()}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 999, background: "rgba(255,255,255,0.1)", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
            <Forward style={{ width: 18, height: 18 }} />
          </button>
        </div>
      )}
    </div>,
    document.body
  );
}

/* ─── HELPERS ─── */
const timeAgo = (dateStr) => {
  try {
    const normalized = dateStr && !dateStr.endsWith("Z") && !dateStr.includes("+") ? dateStr + "Z" : dateStr;
    const date = new Date(normalized);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    const postHour = date.getHours();
    const postMin = date.getMinutes();
    const ampm = postHour < 12 ? "paradite" : "pasdite";
    const isEvening = (h) => h >= 20 || h < 6;

    // Orë e saktë (24-orëshe)
    const exactTime = `ora ${String(postHour).padStart(2, "0")}:${String(postMin).padStart(2, "0")}`;

    // Orë e përafërt (24-orëshe)
    const approxTime = () => {
      const h = postHour;
      if (postMin < 8) return `ora ${String(h).padStart(2, "0")}:00`;
      if (postMin < 23) return `ora ${String(h).padStart(2, "0")}:15`;
      if (postMin < 38) return `ora ${String(h).padStart(2, "0")}:30`;
      if (postMin < 53) return `ora ${String(h).padStart(2, "0")}:45`;
      const nextH = (h + 1) % 24;
      return `ora ${String(nextH).padStart(2, "0")}:00`;
    };

    if (diffMin < 1) return "tani";
    if (diffMin === 1) return "1 minutë";
    if (diffMin < 60) return `${diffMin} minuta`;
    if (diffHr < 24) return `sot ${exactTime}`;

    const aT = approxTime();
    if (diffDay === 1) return isEvening(postHour) ? `mbrëmë ${aT}` : `dje ${aT}`;
    if (diffDay === 2) return isEvening(postHour) ? `parmbrëmë ${aT}` : `pardje ${aT}`;
    if (diffDay === 3) return isEvening(postHour) ? `tjetërparmbrëmë ${aT}` : `tjetërpardje ${aT}`;
    if (diffDay === 4) return isEvening(postHour) ? `prapëtjetërparmbrëmë ${aT}` : `prapëtjetërpardje ${aT}`;
    if (diffDay < 7) return `${diffDay} ditë`;
    if (diffDay < 14) return "1 javë";
    return date.toLocaleDateString("sq-AL", { day: "numeric", month: "short", year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
  }
  catch { return ""; }
};

/* ─── AVATAR ─── */
function Avatar({ name, email, photoUrl, size = 40 }) {
  return <UserAvatar name={name} email={email} photoUrl={photoUrl} size={size} />;
}

function InlineReplyTextarea({ currentUser, targetName, onCancel, onSubmit, compact = false }) {
  const [draft, setDraft] = useState("");
  const textareaRef = useRef(null);

  useEffect(() => {
    const id = window.setTimeout(() => textareaRef.current?.focus(), 50);
    return () => window.clearTimeout(id);
  }, []);

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    onSubmit(text);
    setDraft("");
  };

  return (
    <div className={`flex ${compact ? "items-center" : "items-start"} gap-2 mt-2`}>
      <Avatar name={currentUser?.first_name || "?"} email={currentUser?.email} photoUrl={currentUser?.profile_photo_url} size={compact ? 26 : 24} />
      <div
        className={`flex-1 flex ${compact ? "items-center rounded-full" : "items-start rounded-2xl"} flex-wrap gap-1 px-3 ${compact ? "py-1.5" : "py-1.5"}`}
        style={{ background: "#253347", minHeight: compact ? "32px" : "34px" }}
      >
        {targetName && (
          <span className="flex items-center gap-1 text-[#8ab4ff] text-[12px] font-semibold shrink-0">
            @{targetName}
            <button onClick={onCancel} className="text-white/30 hover:text-white/60 ml-0.5" style={{ lineHeight: 1 }}>
              <X className="w-3 h-3" />
            </button>
          </span>
        )}
        <textarea
          ref={textareaRef}
          rows={1}
          value={draft}
          onChange={e => {
            setDraft(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = e.target.scrollHeight + "px";
          }}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Shkruaj përgjigje…"
          className={`${compact ? "text-[12px]" : "text-sm"} flex-1 bg-transparent text-white outline-none placeholder:text-white/35 min-w-0 resize-none overflow-hidden leading-snug`}
          style={{ minHeight: compact ? "20px" : "22px", minWidth: "80px" }}
        />
        {draft.trim() && (
          <button onClick={submit} className="text-[#8ab4ff] shrink-0">
            <Send className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── REACTIONS CONFIG ─── */
const COMMUNITY_IMPORT_LABEL = "Kërkesë komunitare e rishpërndarë me mbrojtje privatësie";
const IMPORT_AUTHOR_OPTIONS = [
  { value: "full", label: "Shfaq emrin e plotë të autorit origjinal" },
  { value: "first", label: "Shfaq vetëm emrin" },
  { value: "initials", label: "Shfaq vetëm inicialet" },
  { value: "hidden", label: "Fshih autorin plotësisht" },
];

const isImportedCommunityRequest = (status) =>
  Boolean(status?.imported_community_request || status?.import_type === "community_request");

const isStaffUser = (user) => ["admin", "moderator"].includes(String(user?.role || "").toLowerCase());

const formatImportedAuthorName = (name, mode = "full") => {
  const clean = String(name || "").replace(/\s+/g, " ").trim();
  if (!clean || mode === "hidden") return "";
  const parts = clean.split(" ").filter(Boolean);
  if (mode === "first") return parts[0] || "";
  if (mode === "initials") return parts.map((part) => `${part.charAt(0).toUpperCase()}.`).join("");
  return clean;
};

const getPublicSourceUrl = (status) => {
  if (!status) return "";
  if (!isImportedCommunityRequest(status)) return status.link_url || "";
  return (status.show_source_url === true || status.import_show_source_link) ? (status.source_url || status.link_url || status.import_source_url || "") : "";
};

const shouldShowStatusImage = (status) => {
  if (!status?.image_url) return false;
  return !isImportedCommunityRequest(status) || status.import_show_images !== false;
};

function ImportedStatusInfo({ status }) {
  if (!isImportedCommunityRequest(status)) return null;

  const publicAuthor = status.import_public_author_label || formatImportedAuthorName(status.import_original_author_name, status.import_author_display);
  const publicSourceUrl = getPublicSourceUrl(status);
  const publicAuthorProfileUrl = status.show_author_profile_url === true ? status.author_profile_url : "";

  return (
    <div className="mx-4 mb-2 rounded-xl border border-[#8ab4ff]/20 px-3 py-2 text-[12px]" style={{ background: "rgba(138,180,255,0.08)" }}>
      <div className="flex items-center gap-2 text-[#9bffd6] font-bold">
        <ShieldCheck className="w-4 h-4" />
        <span>{COMMUNITY_IMPORT_LABEL}</span>
      </div>
      {publicAuthor && (
        <p className="mt-1 text-white/70">Autori origjinal: <span className="text-white">{publicAuthor}</span></p>
      )}
      {publicAuthorProfileUrl && (
        <a href={publicAuthorProfileUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-[#8ab4ff] hover:underline">
          <Link2 className="w-3.5 h-3.5" /> Kontakti i postuesit
        </a>
      )}
      {!status.import_show_images && (
        <p className="mt-1 flex items-center gap-1 text-white/45"><EyeOff className="w-3.5 h-3.5" /> Fotot e importuara janë fshehur nga publiku.</p>
      )}
      {publicSourceUrl && (
        <a href={publicSourceUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-[#8ab4ff] hover:underline">
          <Link2 className="w-3.5 h-3.5" /> Shiko burimin origjinal
        </a>
      )}
      {!publicSourceUrl && status.import_source_private_note !== false && (
        <p className="mt-1 flex items-center gap-1 text-white/45"><Lock className="w-3.5 h-3.5" /> Linku origjinal mbahet privat për verifikim.</p>
      )}
    </div>
  );
}

function ImportAuditBox({ status, currentUser }) {
  if (!isImportedCommunityRequest(status) || !isStaffUser(currentUser)) return null;

  const sourceUrl = status.import_source_url || status.link_url || "";
  const authorProfileUrl = status.import_author_profile_url || status.author_profile_url || "";
  const choices = [
    `Autori: ${status.import_author_display || "full"}`,
    status.import_hide_profile_photo ? "fotoja e profilit e fshehur" : "fotoja e profilit e lejuar",
    status.import_show_images === false ? "fotot të fshehura" : "fotot publike",
    status.import_show_source_link ? "burimi publik" : "burimi privat",
  ].join(" · ");

  return (
    <details className="mx-4 mb-2 rounded-xl border border-amber-300/25 px-3 py-2 text-[12px]" style={{ background: "rgba(251,191,36,0.08)" }}>
      <summary className="cursor-pointer text-amber-200 font-bold">Audit importi për admin/moderator</summary>
      <div className="mt-2 space-y-1 text-white/70">
        <p>Autori origjinal: <span className="text-white">{status.import_original_author_name || "i panjohur"}</span></p>
        <p>Importuesi: <span className="text-white">{status.importer_name || status.author_name || "i panjohur"}</span></p>
        <p>Data e importit: <span className="text-white">{status.imported_at || status.created_date || ""}</span></p>
        <p>Zgjedhjet: <span className="text-white">{choices}</span></p>
        {sourceUrl && (
          <p>Burimi privat: <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[#8ab4ff] hover:underline break-all">{sourceUrl}</a></p>
        )}
        {authorProfileUrl && (
          <p>Linku i postuesit: <a href={authorProfileUrl} target="_blank" rel="noopener noreferrer" className="text-[#8ab4ff] hover:underline break-all">{authorProfileUrl}</a></p>
        )}
        {status.import_private_image_url && (
          <p>Foto private: <a href={status.import_private_image_url} target="_blank" rel="noopener noreferrer" className="text-[#8ab4ff] hover:underline break-all">hap foton</a></p>
        )}
      </div>
    </details>
  );
}

const REACTIONS = [
  { emoji: "👍", label: "Pëlqej",   color: "#8ab4ff" },
  { emoji: "❤️", label: "Dashuri",  color: "#f43f5e" },
  { emoji: "😂", label: "Qesh",     color: "#facc15" },
  { emoji: "😮", label: "Befasi",   color: "#fb923c" },
  { emoji: "😢", label: "Trishtim", color: "#60a5fa" },
  { emoji: "😡", label: "Zemërim",  color: "#ef4444" },
];

/* ─── REACTION PICKER ─── */
function ReactionPicker({ onReact, onClose }) {
  const [hoveredReaction, setHoveredReaction] = useState(null);

  useEffect(() => {
    const handlePointerMove = (event) => {
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest?.("[data-reaction]");
      setHoveredReaction(target?.getAttribute("data-reaction") || null);
    };
    const handlePointerUp = (event) => {
      if (event.pointerType === "mouse") return;
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest?.("[data-reaction]");
      const emoji = target?.getAttribute("data-reaction") || hoveredReaction;
      if (emoji) onReact(emoji);
      onClose();
    };
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", onClose);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", onClose);
    };
  }, [hoveredReaction, onClose, onReact]);

  return (
    <div
      className="absolute bottom-[110%] left-0 z-50 flex items-end gap-1.5 px-3 py-2.5 shadow-2xl border border-white/10 select-none touch-none"
      style={{ background: "#1a2640", borderRadius: 999, whiteSpace: "nowrap", userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
      onMouseLeave={onClose}
      onContextMenu={e => e.preventDefault()}
    >
      {REACTIONS.map((r) => (
        <button
          key={r.emoji}
          data-reaction={r.emoji}
          onPointerEnter={() => setHoveredReaction(r.emoji)}
          onClick={() => { onReact(r.emoji); onClose(); }}
          className={`flex flex-col items-center gap-0.5 group transition-transform duration-150 select-none ${hoveredReaction === r.emoji ? "-translate-y-2" : "hover:-translate-y-2"}`}
          style={{ userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
        >
          <span className="text-[26px] leading-none select-none">{r.emoji}</span>
          <span className="text-[9px] text-white/50 group-hover:text-white transition-colors opacity-0 group-hover:opacity-100">{r.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ─── REPORT MODAL ─── */
const REPORT_REASONS = [
  { value: "inappropriate", label: "Përmbajtje e papërshtatshme" },
  { value: "fake", label: "Mashtrim / njoftim i rremë" },
  { value: "offensive", label: "Gjuhë fyese" },
  { value: "spam", label: "Spam" },
  { value: "other", label: "Tjetër" },
];

function ReportModal({ status, currentUser, onClose }) {
  const [reason, setReason] = useState(REPORT_REASONS[0].value);
  const [description, setDescription] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [reporterContact, setReporterContact] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    setSending(true);
    try {
      const cleanDescription = description.replace(/<[^>]*>/g, "").trim().slice(0, 2000);
      await base44.entities.Report.create({
        post_id: status.id,
        reported_entity: "Status",
        reported_entity_id: status.id,
        reported_user_email: status.author_email || "",
        post_title: (status.text || "").replace(/\s+/g, " ").slice(0, 120),
        post_category: "status",
        reporter_id: currentUser?.id || "",
        reporter_email: currentUser?.email || "",
        reporter_name: currentUser?.full_name || reporterName.trim().slice(0, 120),
        reporter_contact: currentUser?.email || reporterContact.trim().slice(0, 180),
        reason,
        description: cleanDescription,
        details: cleanDescription,
        status: "new",
      });
      const staff = (await base44.entities.User.list()).filter(u => u.role === "admin" || u.role === "moderator");
      await Promise.all(staff.map(s => base44.entities.Notification.create({
        user_email: s.email, type: "system",
        title: "Raportim i ri",
        message: `Një status u raportua si: ${REPORT_REASONS.find(r => r.value === reason)?.label || reason}`,
        link: "/Admin?section=reports", related_id: status.id,
      })));
      onClose();
      alert("Raportimi u dërgua tek stafi. Faleminderit!");
    } catch (error) {
      alert(error.message || "Raportimi nuk u dërgua. Provo përsëri më vonë.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-white/10 overflow-hidden shadow-2xl" style={{ background: "#1a2640" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h3 className="text-white font-bold flex items-center gap-2"><Flag className="w-4 h-4 text-red-400" /> Raporto Postimin</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:bg-white/10"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-2">
          {REPORT_REASONS.map(opt => (
            <button key={opt.value} onClick={() => setReason(opt.value)}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all border ${reason === opt.value ? "border-[#8ab4ff] bg-[#8ab4ff]/10 text-white" : "border-white/10 bg-white/5 text-white/70 hover:bg-white/8"}`}>
              {opt.label}
            </button>
          ))}
          {!currentUser && (
            <div className="grid gap-2 pt-2">
              <input value={reporterName} onChange={(event) => setReporterName(event.target.value)} placeholder="Emri juaj (opsional)"
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none focus:border-[#8ab4ff]/60" />
              <input value={reporterContact} onChange={(event) => setReporterContact(event.target.value)} placeholder="Email kontakti (opsional)"
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none focus:border-[#8ab4ff]/60" />
            </div>
          )}
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Përshkrim shtesë opsional"
            className="min-h-[84px] w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none focus:border-[#8ab4ff]/60" />
          <button onClick={submit} disabled={sending}
            className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40 mt-2 bg-red-500">
            {sending ? "Duke dërguar..." : "Dërgo Raportimin"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── POST MENU ─── */
function PostMenu({ status, currentUser, onEdit }) {
  const [open, setOpen] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const ref = useRef();
  const queryClient = useQueryClient();

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const isOwner = currentUser?.email === status.author_email;
  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "moderator";

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Status.delete(status.id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["statuses"] }); setOpen(false); },
  });

  return (
    <>
      <div className="relative" ref={ref}>
        <button onClick={() => setOpen(!open)} className="fb-action-btn" style={{ color: "rgba(255,255,255,0.35)", cursor: "pointer", padding: "4px" }}>
          <MoreHorizontal style={{ width: 16, height: 16 }} />
        </button>
        {open && (
          <div className="absolute right-0 top-10 z-50 w-56 rounded-xl overflow-hidden shadow-2xl border border-white/10 py-1"
            style={{ background: "#1a2640" }}>
            {(isOwner || isAdmin) && (
              <button onClick={() => { setOpen(false); if (onEdit) onEdit(status.text); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#8ab4ff] hover:bg-white/5">
                <Edit2 className="w-4 h-4" /> Përpuno Postimin
              </button>
            )}
            {(isOwner || isAdmin) && (
              <button onClick={() => { if (confirm("Fshi këtë postim?")) deleteMutation.mutate(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-white/5">
                <Trash2 className="w-4 h-4" /> Fshi Postimin
              </button>
            )}
            <button onClick={() => { setOpen(false); setShowReport(true); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:bg-white/5">
              <Flag className="w-4 h-4 text-orange-400" /> Raporto Postimin
            </button>
            <button onClick={() => { navigator.clipboard?.writeText(status.text || ""); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:bg-white/5">
              <Copy className="w-4 h-4" /> Kopjo Tekstin
            </button>
          </div>
        )}
      </div>
      {showReport && <ReportModal status={status} currentUser={currentUser} onClose={() => setShowReport(false)} />}
    </>
  );
}

/* ─── SHARE MODAL ─── */
function ShareModal({ status, onClose }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/Statuset`;
  const text = encodeURIComponent((status.text || "").slice(0, 100));
  const copy = () => { navigator.clipboard?.writeText(url); setCopied(true); setTimeout(() => { setCopied(false); onClose(); }, 1500); };
  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.7)" }} onClick={onClose}>
      <div className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl border border-white/10 overflow-hidden shadow-2xl"
        style={{ background: "#1a2640" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h3 className="text-white font-bold text-base">Shpërnda</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:bg-white/10"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-2 pb-4">
          <button onClick={copy} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white/80 hover:bg-white/5">
            {copied ? <Check className="w-5 h-5 text-green-400"/> : <Copy className="w-5 h-5"/>}
            {copied ? "U kopjua!" : "Kopjo linkun"}
          </button>
          <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" onClick={onClose}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white/80 hover:bg-white/5">
            <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            Facebook
          </a>
          <a href={`https://wa.me/?text=${text}%20${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" onClick={onClose}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white/80 hover:bg-white/5">
            <svg className="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}

/* ─── CREATE POST MODAL ─── */
function CreatePostModal({ currentUser, onClose, initialImportMode = false }) {
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [feeling, setFeeling] = useState("");
  const [checkin, setCheckin] = useState("");
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState(null);
  const [importMode, setImportMode] = useState(initialImportMode);
  const [visibility, setVisibility] = useState("public");
  const [externalUrl, setExternalUrl] = useState("");
  const [originalAuthorName, setOriginalAuthorName] = useState("");
  const [authorProfileUrl, setAuthorProfileUrl] = useState("");
  const [externalImageUrl, setExternalImageUrl] = useState("");
  const [importPrivacy, setImportPrivacy] = useState({
    authorDisplay: "full",
    hideProfilePhoto: true,
    showImages: true,
    showSourceLink: false,
    showAuthorProfileLink: false,
  });
  const setPrivacy = (key, value) => setImportPrivacy((current) => ({ ...current, [key]: value }));
  const currentUserEmail = currentUser?.email || "";
  const importerName = currentUser?.first_name || currentUser?.full_name || currentUserEmail.split("@")[0] || "Anëtar";
  const closeImportMode = () => setImportMode(false);
  const fileRef = useRef();
  const queryClient = useQueryClient();
  const FEELINGS = ["😊 i lumtur","😢 i trishtuar","😍 i dashuruar","😡 i zemëruar","🎉 festues","💪 i motivuar","😴 i lodhur","🙏 mirënjohës"];

  const submit = useMutation({
    mutationFn: async () => {
      let image_url = "";
      let import_private_image_url = "";
      if (imageFile) {
        setUploading(true);
        const r = await base44.integrations.Core.UploadFile({ file: imageFile });
        if (importMode && !importPrivacy.showImages) import_private_image_url = r.file_url;
        else image_url = r.file_url;
        setUploading(false);
      }
      if (!image_url && !import_private_image_url && externalImageUrl.trim()) {
        if (importMode && !importPrivacy.showImages) import_private_image_url = externalImageUrl.trim();
        else image_url = externalImageUrl.trim();
      }
      const sourceUrl = externalUrl.trim();
      const profileUrl = authorProfileUrl.trim();
      const originalAuthor = originalAuthorName.trim();
      const publicAuthorLabel = formatImportedAuthorName(originalAuthor, importPrivacy.authorDisplay);
      const importFields = importMode ? {
        imported_community_request: true,
        import_type: "community_request",
        import_source_url: sourceUrl,
        import_author_profile_url: profileUrl,
        import_original_author_name: originalAuthor,
        import_original_text: text.trim(),
        import_public_author_label: publicAuthorLabel,
        import_author_display: importPrivacy.authorDisplay,
        import_hide_profile_photo: importPrivacy.hideProfilePhoto,
        import_show_images: importPrivacy.showImages,
        import_show_source_link: importPrivacy.showSourceLink,
        import_private_image_url,
        source_url: sourceUrl,
        author_profile_url: importPrivacy.showAuthorProfileLink ? profileUrl : "",
        show_source_url: importPrivacy.showSourceLink,
        show_author_profile_url: importPrivacy.showAuthorProfileLink,
        importer_email: currentUserEmail,
        importer_name: importerName,
        imported_at: new Date().toISOString(),
        import_privacy_choices: { ...importPrivacy },
        link_url: importPrivacy.showSourceLink ? sourceUrl : "",
        link_title: importPrivacy.showSourceLink && sourceUrl ? "Burimi origjinal" : "",
      } : {};
      await base44.entities.Status.create({
        author_email: currentUserEmail,
        author_name: importerName,
        author_photo_url: currentUser?.profile_photo_url || "",
        visibility,
        text: text.trim(), image_url, feeling,
        checkin_location: checkin.trim(),
        likes: [], comments_count: 0, reactions: {},
        ...importFields,
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["statuses"] }); onClose(); },
  });

  const canPost = (text.trim() || imageFile || (importMode && externalImageUrl.trim())) && !uploading && !submit.isPending;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center px-0 sm:px-4" style={{ background: "rgba(0,0,0,0.75)", paddingTop: "72px", paddingBottom: "16px", overflowY: "auto" }} onClick={onClose}>
      <div className="w-full sm:max-w-md rounded-b-2xl sm:rounded-2xl shadow-2xl border border-white/10 flex flex-col" style={{ background: "#1a2640", maxHeight: "calc(100dvh - 88px)" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 shrink-0">
          <div className="w-7" />
          <h2 className="text-white font-bold text-sm">Krijo Postim</h2>
          <button onClick={onClose} className="fb-action-btn w-7 h-7 flex items-center justify-center text-white/60" title="Mbyll" aria-label="Mbyll"><X className="w-3.5 h-3.5" /></button>
        </div>
        <div className="px-3 pt-2 pb-3 space-y-2 overflow-y-auto flex-1 min-h-0" style={{ WebkitOverflowScrolling: "touch" }}>
          <div className="flex items-center gap-2">
            <Avatar name={importerName || currentUserEmail || "?"} email={currentUserEmail} photoUrl={currentUser?.profile_photo_url} size={28} />
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-white font-bold text-sm">{importerName}</p>
              {(feeling || checkin) && <p className="text-white/50 text-xs">{feeling && `ndihet ${feeling}`}{checkin && ` 📍 ${checkin}`}</p>}
              <select
                value={visibility}
                onChange={(event) => setVisibility(event.target.value)}
                className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/80 outline-none"
                title="Dukshmëria e statusit"
              >
                <option value="public" className="bg-[#0b1020]">Publik</option>
                <option value="wide_circle" className="bg-[#0b1020]">Rrethi i gjerë</option>
                <option value="close_circle" className="bg-[#0b1020]">Rrethi i ngushtë</option>
              </select>
            </div>
          </div>
          <textarea value={text} onChange={e => { setText(e.target.value); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
            placeholder={`Çfarë ke në mend, ${currentUser?.first_name || "mik"}?`}
            className="w-full bg-transparent text-white placeholder:text-white/30 text-[15px] resize-none outline-none overflow-hidden"
            style={{ minHeight: "38px" }} autoFocus />
          {importMode && (
            <div className="rounded-xl border border-[#8ab4ff]/20 p-3 space-y-2 text-xs" style={{ background: "#20304a" }}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[#9bffd6] font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Importo nga postim i jashtëm</span>
                </div>
                <button type="button" onClick={closeImportMode}
                  className="fb-action-btn inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] text-white/60 hover:text-white"
                  title="Mbyll importimin"
                  aria-label="Mbyll importimin">
                  <X className="w-3.5 h-3.5" /> Mbyll
                </button>
              </div>
              <input value={externalUrl} onChange={e => setExternalUrl(e.target.value)}
                placeholder="URL e jashtme (Facebook, web, etj.)"
                className="w-full rounded-lg px-3 py-2 bg-[#162238] text-white outline-none placeholder:text-white/35 border border-white/10" />
              <input value={originalAuthorName} onChange={e => setOriginalAuthorName(e.target.value)}
                placeholder="Emri i autorit origjinal (opsional)"
                className="w-full rounded-lg px-3 py-2 bg-[#162238] text-white outline-none placeholder:text-white/35 border border-white/10" />
              <input value={authorProfileUrl} onChange={e => setAuthorProfileUrl(e.target.value)}
                placeholder="Linku i postuesit / kontaktit (opsional)"
                className="w-full rounded-lg px-3 py-2 bg-[#162238] text-white outline-none placeholder:text-white/35 border border-white/10" />
              <input value={externalImageUrl} onChange={e => setExternalImageUrl(e.target.value)}
                placeholder="URL e fotos origjinale (opsionale, ose ngarko foto)"
                className="w-full rounded-lg px-3 py-2 bg-[#162238] text-white outline-none placeholder:text-white/35 border border-white/10" />
              <div>
                <p className="text-white/60 font-semibold mb-1">Privatësia e autorit origjinal</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {IMPORT_AUTHOR_OPTIONS.map((option) => (
                    <button key={option.value} type="button" onClick={() => setPrivacy("authorDisplay", option.value)}
                      className={`rounded-lg px-2 py-1.5 text-left border ${importPrivacy.authorDisplay === option.value ? "border-[#8ab4ff] text-white bg-[#8ab4ff]/15" : "border-white/10 text-white/60"}`}>
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                <button type="button" onClick={() => setPrivacy("hideProfilePhoto", !importPrivacy.hideProfilePhoto)}
                  className={`rounded-lg px-2 py-1.5 text-left border ${importPrivacy.hideProfilePhoto ? "border-[#8ab4ff] text-white bg-[#8ab4ff]/15" : "border-white/10 text-white/60"}`}>
                  Fshih foton e profilit
                </button>
                <button type="button" onClick={() => setPrivacy("showImages", !importPrivacy.showImages)}
                  className={`rounded-lg px-2 py-1.5 text-left border ${importPrivacy.showImages ? "border-[#8ab4ff] text-white bg-[#8ab4ff]/15" : "border-white/10 text-white/60"}`}>
                  {importPrivacy.showImages ? "Shfaq fotot e importuara" : "Fshih fotot e importuara"}
                </button>
                <button type="button" onClick={() => setPrivacy("showSourceLink", true)}
                  className={`rounded-lg px-2 py-1.5 text-left border ${importPrivacy.showSourceLink ? "border-[#8ab4ff] text-white bg-[#8ab4ff]/15" : "border-white/10 text-white/60"}`}>
                  Shfaq linkun e burimit publikisht
                </button>
                <button type="button" onClick={() => setPrivacy("showSourceLink", false)}
                  className={`rounded-lg px-2 py-1.5 text-left border ${!importPrivacy.showSourceLink ? "border-[#8ab4ff] text-white bg-[#8ab4ff]/15" : "border-white/10 text-white/60"}`}>
                  Mbaje burimin privat
                </button>
                <button type="button" onClick={() => setPrivacy("showAuthorProfileLink", !importPrivacy.showAuthorProfileLink)}
                  className={`rounded-lg px-2 py-1.5 text-left border ${importPrivacy.showAuthorProfileLink ? "border-[#8ab4ff] text-white bg-[#8ab4ff]/15" : "border-white/10 text-white/60"}`}>
                  Shfaq linkun e postuesit si kontakt publik
                </button>
              </div>
              <p className="text-white/45 leading-relaxed">
                Publiku do të shohë tekstin si kërkesë komunitare. Linku origjinal dhe emri i plotë ruhen vetëm për auditim kur nuk i bën publik.
              </p>
            </div>
          )}
          {imagePreview && (
            <div className="relative rounded-xl overflow-hidden border border-white/10">
              <img src={imagePreview} alt="" className="w-full max-h-48 object-cover" />
              <button onClick={() => { setImageFile(null); setImagePreview(""); }}
                title="Hiq foton"
                aria-label="Hiq foton"
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 flex items-center justify-center">
                <X className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          )}
          {tab === "feelings" && (
            <div className="rounded-xl border border-white/10 p-2" style={{ background: "#253347" }}>
              <p className="text-white/50 text-xs mb-1.5 font-semibold">Si ndiheni?</p>
              <div className="flex flex-wrap gap-1.5">
                {FEELINGS.map(f => (
                  <button key={f} onClick={() => { setFeeling(f === feeling ? "" : f); setTab(null); }}
                    title={`Zgjidh: ${f}`}
                    aria-label={`Zgjidh: ${f}`}
                    className={`fb-action-btn px-2.5 py-1 rounded-full text-xs ${feeling === f ? "bg-[#8ab4ff]/30 text-[#8ab4ff]" : "text-white/70"}`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
          )}
          {tab === "checkin" && (
            <div className="flex items-center gap-2 rounded-xl px-3 py-1.5 border border-white/10" style={{ background: "#253347" }}>
              <MapPin className="w-3.5 h-3.5 text-[#8ab4ff] shrink-0" />
              <input value={checkin} onChange={e => setCheckin(e.target.value)} placeholder="Ku jeni tani?" autoFocus
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30" />
              {checkin && <button onClick={() => setCheckin("")} className="text-white/30" title="Hiq vendndodhjen" aria-label="Hiq vendndodhjen"><X className="w-3.5 h-3.5" /></button>}
            </div>
          )}
          <div className="flex items-center justify-between rounded-xl px-2 py-1" style={{ background: "#253347" }}>
            <span className="text-white/60 text-xs font-semibold">Shto në postim</span>
            <div className="flex items-center gap-0.5">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => {
                const f = e.target.files[0]; if (!f) return;
                setImagePreview(URL.createObjectURL(f)); setImageFile(f);
              }} />
              <button onClick={() => fileRef.current?.click()} className="fb-action-btn w-8 h-8 flex items-center justify-center" title="Ngarko foto" aria-label="Ngarko foto">
                <Image className="w-4 h-4 text-green-400" />
              </button>
              <button onClick={() => setImportMode(v => !v)}
                className={`fb-action-btn w-8 h-8 flex items-center justify-center ${importMode ? "bg-[#8ab4ff]/20" : ""}`}
                title="Importo nga postim i jashtëm"
                aria-label="Importo nga postim i jashtëm">
                <Link2 className="w-4 h-4 text-[#9bffd6]" />
              </button>
              <button onClick={() => setTab(t => t === "feelings" ? null : "feelings")}
                className={`fb-action-btn w-8 h-8 flex items-center justify-center ${tab === "feelings" ? "bg-yellow-400/20" : ""}`}
                title="Shto ndjenjë"
                aria-label="Shto ndjenjë">
                <Smile className="w-4 h-4 text-yellow-400" />
              </button>
              <button onClick={() => setTab(t => t === "checkin" ? null : "checkin")}
                className={`fb-action-btn w-8 h-8 flex items-center justify-center ${tab === "checkin" ? "bg-[#8ab4ff]/20" : ""}`}
                title="Shto vendndodhje"
                aria-label="Shto vendndodhje">
                <MapPin className="w-4 h-4 text-[#8ab4ff]" />
              </button>
            </div>
          </div>
          <button onClick={() => submit.mutate()} disabled={!canPost}
            className="w-full py-1.5 rounded-xl font-bold text-sm text-[#0b1020] disabled:opacity-40"
            title="Posto statusin"
            aria-label="Posto statusin"
            style={{ background: canPost ? "linear-gradient(to right, #8ab4ff, #9bffd6)" : "#2a3a52" }}>
            {uploading ? "Duke ngarkuar..." : submit.isPending ? "Duke postuar..." : "Posto"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── CREATE POST BOX ─── */
function CreatePostBox({ currentUser }) {
  const [showModal, setShowModal] = useState(false);
  const [startImportMode, setStartImportMode] = useState(false);
  const openComposer = (importMode = false) => {
    if (!currentUser) {
      base44.auth.redirectToLogin();
      return;
    }
    setStartImportMode(importMode);
    setShowModal(true);
  };
  return (
    <>
      <div className="px-3 py-2" style={{ background: "#1a2640", marginBottom: "8px" }}>
        <div className="flex items-center gap-2">
          <Avatar name={currentUser?.first_name || currentUser?.email || "?"} email={currentUser?.email} photoUrl={currentUser?.profile_photo_url} size={28} />
          <button onClick={() => openComposer(false)}
            className="flex-1 rounded-full px-3 py-1.5 text-white/40 text-[13px] text-left fb-action-btn"
            title="Shkruaj status"
            aria-label="Shkruaj status"
            style={{ background: "#253347" }}>
            Çfarë ke në mend?
          </button>
          <button onClick={() => openComposer(false)}
            className="fb-action-btn w-7 h-7 flex items-center justify-center rounded-full" style={{ background: "#253347" }}
            title="Ngarko foto"
            aria-label="Ngarko foto">
            <Image className="w-3.5 h-3.5 text-green-400" />
          </button>
          <button onClick={() => openComposer(true)}
            className="fb-action-btn w-7 h-7 flex items-center justify-center rounded-full" style={{ background: "#253347" }}
            title="Importo nga postim i jashtëm"
            aria-label="Importo nga postim i jashtëm">
            <Link2 className="w-3.5 h-3.5 text-[#9bffd6]" />
          </button>
        </div>
      </div>
      {showModal && <CreatePostModal currentUser={currentUser} initialImportMode={startImportMode} onClose={() => setShowModal(false)} />}
    </>
  );
}

/* ─── COMMENT ITEM (DEPRECATED - now inline in StatusCard) ─── */
function CommentItem({ c, onReply }) {
  const TEXT_LIMIT = 200;
  const [expanded, setExpanded] = useState(false);
  const isLong = c.text.length > TEXT_LIMIT;
  const display = isLong && !expanded ? c.text.slice(0, TEXT_LIMIT) + "…" : c.text;

  return (
    <div className="flex gap-2 items-start">
      <Avatar name={c.author_name} email={c.author_email} photoUrl={c.author_photo_url} size={28} />
      <div className="flex-1 min-w-0">
         <div className="rounded-2xl rounded-tl-sm px-3 py-2 inline-block max-w-full" style={{ background: "#253347" }}>
           <p className="text-white text-xs font-bold">{c.author_name}</p>
           <p className="text-white/85 text-[14px] mt-0.5 break-words">
             {display}
             {isLong && !expanded && (
               <button onClick={() => setExpanded(true)} className="text-[#8ab4ff] text-xs ml-1 font-semibold">Shih më shumë</button>
             )}
           </p>
         </div>
         <div className="flex items-center gap-2 mt-1 ml-1">
           <span className="text-white/30 text-[11px]">{timeAgo(c.created_date)}</span>
           <button onClick={() => onReply(c)} className="fb-action-btn text-[#8ab4ff] text-[11px] font-bold">Repliko</button>
           <div className="flex items-center gap-1 ml-1">
           <button className="fb-action-btn flex items-center gap-0.5 text-white/30">
           <ThumbsUp className="w-3.5 h-3.5" />
           </button>
           <button className="fb-action-btn flex items-center gap-0.5 text-white/30">
           <ThumbsDown className="w-3.5 h-3.5" />
           </button>
           </div>
         </div>
       </div>
    </div>
  );
}

/* ─── STATUS DETAIL PAGE (>5 comments) ─── */
function StatusDetailPage({ status, currentUser, onBack }) {
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyTexts, setReplyTexts] = useState({});
  const commentInputRef = useRef(null);

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["statusComments", status.id],
    queryFn: () => base44.entities.StatusComment.filter({ status_id: status.id }, "created_date", 100),
    staleTime: 30000,
  });

  const commentCount = status.comments_count || 0;
  const myName = currentUser ? (currentUser.first_name || currentUser.email.split("@")[0]) : "";
  const authorName = status.author_name || status.author_email?.split("@")[0] || "Anonim";

  const reactionsMap = status.reactions || {};
  const reactionCounts = Object.values(reactionsMap).reduce((acc, e) => { acc[e] = (acc[e] || 0) + 1; return acc; }, {});
  const topEmojis = Object.entries(reactionCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([e]) => e);
  const totalReactions = Object.keys(reactionsMap).length;
  const currentReaction = currentUser ? (reactionsMap[currentUser.email] || null) : null;

  const reactionInfo = currentReaction
    ? (REACTIONS.find(r => r.emoji === currentReaction) || { emoji: currentReaction, label: "Reagova", color: "#9bffd6" })
    : null;

  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [detailLightbox, setDetailLightbox] = useState(null);
  const hoverTimer = useRef(null);
  const longPressTimer = useRef(null);
  const longPressOpened = useRef(false);
  const scrollRef = useRef(null);

  const reactMutation = useMutation({
    mutationFn: async (emoji) => {
      if (!currentUser) return base44.auth.redirectToLogin();
      const newReactions = { ...reactionsMap };
      if (newReactions[currentUser.email] === emoji) delete newReactions[currentUser.email];
      else newReactions[currentUser.email] = emoji;
      return base44.entities.Status.update(status.id, { reactions: newReactions });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["statuses"] }),
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser || !commentText.trim()) return;
      await base44.entities.StatusComment.create({
        status_id: status.id,
        author_email: currentUser.email,
        author_name: currentUser.first_name || currentUser.full_name || currentUser.email.split("@")[0],
        author_photo_url: currentUser.profile_photo_url || "",
        text: commentText.trim(),
      });
      await base44.entities.Status.update(status.id, { comments_count: commentCount + 1 });
      setCommentText("");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["statusComments", status.id] });
      queryClient.invalidateQueries({ queryKey: ["statuses"] });
    },
  });

  const replyMutation = useMutation({
    mutationFn: async (payload) => {
      const parentComment = payload?.parentComment || payload;
      const txt = payload?.text ?? replyTexts[parentComment.id];
      if (!currentUser || !txt?.trim()) return;
      await base44.entities.StatusComment.create({
        status_id: status.id,
        parent_id: parentComment.id,
        author_email: currentUser.email,
        author_name: currentUser.first_name || currentUser.full_name || currentUser.email.split("@")[0],
        author_photo_url: currentUser.profile_photo_url || "",
        text: `@${parentComment.author_name} ${txt.trim()}`,
      });
      await base44.entities.Status.update(status.id, { comments_count: commentCount + 1 });
      setReplyTexts(p => { const n = { ...p }; delete n[parentComment.id]; return n; });
      setReplyingTo(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["statusComments", status.id] });
      queryClient.invalidateQueries({ queryKey: ["statuses"] });
    },
  });

  const [textExpanded, setTextExpanded] = useState(false);
  const TEXT_LIMIT = 160;
  const isLongText = (status.text || "").length > TEXT_LIMIT;
  const statusImageVisible = shouldShowStatusImage(status);
  const displayText = isLongText && !textExpanded ? status.text.slice(0, TEXT_LIMIT) + "…" : status.text;

  const handleReplyDetail = (item) => {
    setReplyingTo(item);
  };

  // top-level comments only
  const topLevel = comments.filter(c => !c.parent_id);
  const getReplies = (id) => comments.filter(c => c.parent_id === id);

  return (
    <div className="fixed inset-0 z-[999999] flex flex-col" style={{ background: "#0f1929", overflow: 'hidden' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 border-b border-white/10 shrink-0" style={{ background: "#1a2640", paddingTop: "calc(64px + env(safe-area-inset-top) + 8px)", paddingBottom: "10px" }}>
        <button onClick={onBack} className="fb-action-btn p-1.5 text-white/70 shrink-0" style={{ color: "rgba(255,255,255,0.7)" }}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Avatar name={authorName} email={status.author_email} photoUrl={status.author_photo_url} size={36} />
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm leading-tight">{authorName}</p>
          <p className="text-white/40 text-xs">{timeAgo(status.created_date)} · <Globe className="w-3 h-3 inline" /></p>
        </div>
      </div>

      <div id="detail-scroll" className="flex-1 overflow-y-auto" ref={scrollRef} style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
      <style>{`
        #detail-scroll::-webkit-scrollbar{display:none!important}
        #detail-scroll{scrollbar-width:none!important}
        .fb-action-btn {
          background: transparent !important;
          background-image: none !important;
          border: none !important;
          box-shadow: none !important;
          outline: none !important;
        }
        .fb-action-btn:hover,
        .fb-action-btn:focus,
        .fb-action-btn:active {
          background: rgba(255,255,255,0.06) !important;
          border: none !important;
          box-shadow: none !important;
        }
        button.fb-action-btn:not(.bg-primary):not(.bg-accent) {
          background: transparent !important;
          border: none !important;
          color: inherit !important;
        }
        button.fb-action-btn:not(.bg-primary):not(.bg-accent):hover {
          background: rgba(255,255,255,0.06) !important;
          border: none !important;
          color: inherit !important;
        }
      `}</style>
      <div className="max-w-[600px] mx-auto pb-4">
        {/* Post content */}
        <div style={{ background: "#1a2640", marginBottom: "8px" }}>
          <div className="flex items-start gap-3 px-4 pt-3 pb-2">
            <Avatar name={authorName} email={status.author_email} photoUrl={status.author_photo_url} size={44} />
            <div>
              <p className="text-white font-bold text-[15px]">{authorName}</p>
              <p className="text-white/40 text-[12px] flex items-center gap-1">{timeAgo(status.created_date)} · <Globe className="w-3 h-3" /></p>
            </div>
          </div>
          {status.text && (
            <p className="px-4 pb-3 text-white text-[15px] leading-relaxed">
              {displayText}
              {isLongText && !textExpanded && <button onClick={() => setTextExpanded(true)} className="text-white/50 font-semibold ml-1">Shfaq më shumë</button>}
            </p>
          )}
          <ImportedStatusInfo status={status} />
          <ImportAuditBox status={status} currentUser={currentUser} />
          {statusImageVisible && <img src={status.image_url} alt="" className="w-full object-cover cursor-pointer" style={{ maxHeight: 400 }} onClick={() => setDetailLightbox(status.image_url)} />}

          {/* Single action bar */}
          <div className="flex items-center px-4 py-2 gap-1" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="relative">
              <button
                onClick={() => { if (!currentUser) { base44.auth.redirectToLogin(); return; } reactMutation.mutate(currentReaction || "👍"); }}
                onMouseEnter={() => { hoverTimer.current = setTimeout(() => setShowReactionPicker(true), 600); }}
                onMouseLeave={() => clearTimeout(hoverTimer.current)}
                onPointerDown={(e) => {
                  if (e.pointerType === "mouse") return;
                  e.preventDefault();
                  longPressOpened.current = false;
                  longPressTimer.current = setTimeout(() => {
                    longPressOpened.current = true;
                    setShowReactionPicker(true);
                  }, 260);
                }}
                onPointerUp={(e) => {
                  clearTimeout(longPressTimer.current);
                  if (e.pointerType !== "mouse" && !longPressOpened.current) {
                    if (!currentUser) { base44.auth.redirectToLogin(); return; }
                    reactMutation.mutate(currentReaction || "👍");
                  }
                }}
                onPointerCancel={() => clearTimeout(longPressTimer.current)}
                onContextMenu={e => e.preventDefault()}
                className="fb-action-btn flex items-center gap-1.5 select-none"
                style={{ padding: "6px 10px 6px 6px", fontSize: "14px", fontWeight: 600, color: currentReaction ? (reactionInfo?.color || "#8ab4ff") : "rgba(255,255,255,0.5)", cursor: "pointer", userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none" }}>
                {currentReaction
                  ? <span style={{ fontSize: 18 }}>{reactionInfo?.emoji}</span>
                  : <ThumbsUp style={{ width: 18, height: 18 }} />}
                {totalReactions > 0 && <span style={{ fontSize: 13 }}>{totalReactions}</span>}
              </button>
              {showReactionPicker && (
                <div onMouseEnter={() => clearTimeout(hoverTimer.current)} onMouseLeave={() => setShowReactionPicker(false)}>
                  <ReactionPicker onReact={(e) => reactMutation.mutate(e)} onClose={() => setShowReactionPicker(false)} />
                </div>
              )}
            </div>
            <button onClick={() => setTimeout(() => commentInputRef.current?.focus(), 100)}
              className="fb-action-btn flex items-center gap-1.5"
              style={{ padding: "6px 10px 6px 6px", fontSize: "14px", fontWeight: 600, color: "rgba(255,255,255,0.5)", cursor: "pointer" }}>
              <MessageCircle style={{ width: 18, height: 18 }} />
              {commentCount > 0 && <span style={{ fontSize: 13 }}>{commentCount}</span>}
            </button>
            <button onClick={() => setShowShare(true)}
              className="fb-action-btn flex items-center gap-1.5"
              style={{ padding: "6px 10px 6px 6px", fontSize: "14px", fontWeight: 600, color: "rgba(255,255,255,0.5)", cursor: "pointer" }}>
              <Forward style={{ width: 18, height: 18 }} />
            </button>
          </div>
            </div>

            {/* Comments */}
        <div style={{ background: "#1a2640" }} className="px-4 pt-3 pb-4 space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-6"><div className="w-6 h-6 border-2 border-[#8ab4ff] border-t-transparent rounded-full animate-spin" /></div>
          ) : topLevel.map(c => {
            const replies = getReplies(c.id);
            return (
              <div key={c.id}>
                {/* Main comment */}
                <div className="flex gap-2 items-start">
                  <Avatar name={c.author_name} email={c.author_email} photoUrl={c.author_photo_url} size={32} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <div className="rounded-2xl rounded-tl-sm px-3 py-2 inline-block max-w-full" style={{ background: "#253347" }}>
                        <p className="text-white text-xs font-bold">{c.author_name} <span className="text-white/30 font-normal">· {timeAgo(c.created_date)}</span></p>
                        <p className="text-white/85 text-[14px] mt-0.5 break-words">{c.text}</p>
                      </div>
                      <CommentMenu comment={c} currentUser={currentUser} statusId={status.id} />
                    </div>
                    <div className="flex items-center gap-3 mt-1 ml-1">
                      <button onClick={() => handleReplyDetail(replyingTo?.id === c.id ? null : c)} className="fb-action-btn text-[#8ab4ff] text-[12px] font-bold">Repliko</button>
                      <button className="fb-action-btn text-white/30"><ThumbsUp className="w-3.5 h-3.5" /></button>
                    </div>
                    {/* Reply input inline below main comment */}
                    {replyingTo?.id === c.id && (
                      <InlineReplyTextarea
                        currentUser={currentUser}
                        targetName={c.author_name}
                        onCancel={() => setReplyingTo(null)}
                        onSubmit={(text) => replyMutation.mutate({ parentComment: c, text })}
                      />
                    )}

                    {/* Replies */}
                    {replies.length > 0 && (
                      <div className="ml-4 mt-2 space-y-2">
                        {replies.map(r => (
                          <div key={r.id} className="flex gap-2 items-start">
                            <Avatar name={r.author_name} email={r.author_email} photoUrl={r.author_photo_url} size={20} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-1">
                                <div className="rounded-2xl rounded-tl-sm px-3 py-1.5 inline-block max-w-full" style={{ background: "#253347" }}>
                                  <p className="text-white text-xs font-bold">{r.author_name} <span className="text-white/30 font-normal">· {timeAgo(r.created_date)}</span></p>
                                  <p className="text-white/85 text-[13px] mt-0.5 break-words">{r.text}</p>
                                </div>
                                <CommentMenu comment={r} currentUser={currentUser} statusId={status.id} />
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 ml-1">
                                <button onClick={() => handleReplyDetail(replyingTo?.id === r.id ? null : r)} className="fb-action-btn text-[#8ab4ff] text-[11px] font-bold">Repliko</button>
                                <button className="fb-action-btn text-white/30"><ThumbsUp className="w-3 h-3" /></button>
                              </div>
                              {/* Reply input inline below reply */}
                              {replyingTo?.id === r.id && (
                                <InlineReplyTextarea
                                  currentUser={currentUser}
                                  targetName={r.author_name}
                                  onCancel={() => setReplyingTo(null)}
                                  onSubmit={(text) => replyMutation.mutate({ parentComment: r, text })}
                                />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      </div>

      {/* Fixed comment input at bottom */}
      <div className="shrink-0 px-4 pt-2 border-t border-white/10" style={{ background: "#1a2640", paddingBottom: "calc(env(safe-area-inset-bottom) + 72px)" }}>
        <div className="max-w-[600px] mx-auto flex items-start gap-2">
          <Avatar name={currentUser?.first_name || currentUser?.email || "?"} email={currentUser?.email} photoUrl={currentUser?.profile_photo_url} size={36} />
          <div className="flex-1 flex items-start gap-2 rounded-2xl px-3 py-1.5" style={{ background: "#253347" }}>
            <textarea
              ref={commentInputRef}
              value={commentText}
              rows={1}
              onChange={e => { setCommentText(e.target.value); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
              onFocus={() => { if (!currentUser) base44.auth.redirectToLogin(); }}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (commentText.trim() && currentUser) commentMutation.mutate(); } }}
              placeholder={currentUser ? `Komento si ${myName}…` : "Komento…"}
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/35 min-w-0 resize-none overflow-hidden leading-snug pt-0.5"
              style={{ minHeight: "22px" }}
            />
            {commentText.trim() && (
              <button onClick={() => { if (currentUser) commentMutation.mutate(); }} disabled={commentMutation.isPending} className="text-[#8ab4ff] shrink-0 mt-0.5">
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {showShare && <ShareModal status={status} onClose={() => setShowShare(false)} />}

      {detailLightbox && (
        <Lightbox
          src={detailLightbox}
          onClose={() => setDetailLightbox(null)}
          status={status}
          currentUser={currentUser}
          onLike={() => { if (!currentUser) { base44.auth.redirectToLogin(); return; } reactMutation.mutate(currentReaction || "👍"); }}
          onComment={() => { setDetailLightbox(null); setTimeout(() => commentInputRef.current?.focus(), 100); }}
          onShare={() => { setDetailLightbox(null); setShowShare(true); }}
        />
      )}
    </div>
  );
}

/* ─── COMMENT INPUT (reusable) ─── */
function CommentInput({ currentUser, commentText, setCommentText, replyingTo, setReplyingTo, commentInputRef, myName, onFocus, onSubmit, isPending }) {
  return (
    <div className="flex items-center gap-2">
      <Avatar name={currentUser?.first_name || currentUser?.email || "?"} email={currentUser?.email} photoUrl={currentUser?.profile_photo_url} size={32} />
      <div className="flex-1 flex items-center flex-wrap gap-1 rounded-full px-3 py-2" style={{ background: "#253347", minHeight: "36px" }}>
        {replyingTo && (
          <span className="flex items-center gap-1 text-[#8ab4ff] text-[13px] font-semibold shrink-0">
            @{replyingTo.author_name}
            <button onClick={() => { setReplyingTo(null); setCommentText(""); }} className="text-white/30 hover:text-white/60 ml-0.5" style={{ lineHeight: 1 }}>
              <X className="w-3 h-3" />
            </button>
          </span>
        )}
        <textarea
          ref={commentInputRef}
          value={commentText}
          rows={1}
          onChange={e => { setCommentText(e.target.value); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
          onFocus={onFocus}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (commentText.trim() && currentUser) onSubmit(); } }}
          placeholder={replyingTo ? `Shkruaj përgjigje…` : (currentUser ? `Komento si ${myName}…` : "Komento…")}
          className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/35 min-w-0 resize-none overflow-hidden leading-snug"
          style={{ minHeight: "20px", minWidth: "80px" }}
        />
        {commentText.trim() && (
          <button onClick={onSubmit} disabled={isPending} className="text-[#8ab4ff] shrink-0">
            <Send className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── COMMENT MENU ─── */
function CommentMenu({ comment, currentUser, statusId }) {
  const [open, setOpen] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [editingText, setEditingText] = useState(null);
  const ref = useRef();
  const queryClient = useQueryClient();

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const isOwner = currentUser?.email === comment.author_email;
  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "moderator";

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.StatusComment.delete(comment.id);
      const status = await base44.entities.Status.filter({ id: statusId });
      if (status[0]) {
        const newCount = Math.max(0, (status[0].comments_count || 1) - 1);
        await base44.entities.Status.update(statusId, { comments_count: newCount });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["statusComments", statusId] });
      queryClient.invalidateQueries({ queryKey: ["statuses"] });
      setOpen(false);
    },
  });

  const editMutation = useMutation({
    mutationFn: (text) => base44.entities.StatusComment.update(comment.id, { text }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["statusComments", statusId] }); setEditingText(null); },
  });

  return (
    <>
      <div className="relative" ref={ref}>
        <button onClick={() => setOpen(!open)} className="fb-action-btn" style={{ color: "rgba(255,255,255,0.35)", cursor: "pointer", padding: "2px" }}>
          <MoreHorizontal style={{ width: 14, height: 14 }} />
        </button>
        {open && (
          <div className="absolute right-0 top-6 z-50 w-48 rounded-lg overflow-hidden shadow-2xl border border-white/10 py-1"
            style={{ background: "#1a2640" }}>
            {(isOwner || isAdmin) && (
              <button onClick={() => { setOpen(false); setEditingText(comment.text); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#8ab4ff] hover:bg-white/5">
                <Edit2 className="w-3.5 h-3.5" /> Përpuno
              </button>
            )}
            {(isOwner || isAdmin) && (
              <button onClick={() => { if (confirm("Fshi këtë koment?")) deleteMutation.mutate(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-white/5">
                <Trash2 className="w-3.5 h-3.5" /> Fshi
              </button>
            )}
            <button onClick={() => { setOpen(false); if (!currentUser) { base44.auth.redirectToLogin(); return; } setShowReport(true); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/80 hover:bg-white/5">
              <Flag className="w-3.5 h-3.5 text-orange-400" /> Raporto
            </button>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editingText !== null && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[72px] px-0 sm:px-4" style={{ background: "rgba(0,0,0,0.75)" }} onClick={() => setEditingText(null)}>
          <div className="w-full sm:max-w-md rounded-b-2xl sm:rounded-2xl shadow-2xl border border-white/10" style={{ background: "#1a2640" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
              <div className="w-7" />
              <h2 className="text-white font-bold text-sm">Përpuno Komentin</h2>
              <button onClick={() => setEditingText(null)} className="fb-action-btn w-7 h-7 flex items-center justify-center text-white/60"><X className="w-3.5 h-3.5" /></button>
            </div>
            <div className="px-3 pt-2 pb-3 space-y-2">
              <textarea value={editingText} onChange={e => { setEditingText(e.target.value); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
                className="w-full bg-transparent text-white placeholder:text-white/30 text-[14px] resize-none outline-none overflow-hidden"
                style={{ minHeight: "60px" }} autoFocus />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setEditingText(null)} className="px-4 py-1.5 rounded-lg text-sm text-white/60 hover:bg-white/5">Anulo</button>
                <button onClick={() => editMutation.mutate(editingText.trim())} disabled={editMutation.isPending || !editingText.trim()}
                  className="px-4 py-1.5 rounded-lg text-sm font-bold text-[#0b1020] disabled:opacity-40"
                  style={{ background: "linear-gradient(to right, #8ab4ff, #9bffd6)" }}>
                  {editMutation.isPending ? "Duke ruajtur..." : "Ruaj"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report modal */}
      {showReport && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }} onClick={() => setShowReport(false)}>
          <div className="w-full max-w-xs rounded-lg border border-white/10 overflow-hidden shadow-2xl" style={{ background: "#1a2640" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h3 className="text-white font-bold text-xs flex items-center gap-2"><Flag className="w-3 h-3 text-red-400" /> Raporto Koment</h3>
              <button onClick={() => setShowReport(false)} className="w-6 h-6 rounded-full flex items-center justify-center text-white/50 hover:bg-white/10"><X className="w-3 h-3" /></button>
            </div>
            <div className="p-3 space-y-1.5">
              {REPORT_REASONS.map(opt => (
                <button key={opt.value} onClick={async () => {
                  await base44.entities.Report.create({
                    post_id: comment.id, post_title: (comment.text || "").slice(0, 80),
                    post_category: "comment", reporter_email: currentUser?.email || "",
                    reason: opt.value, status: "pending",
                  });
                  setShowReport(false);
                  alert("Raportimi u dërgua tek stafi. Faleminderit!");
                }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs transition-all border border-white/10 bg-white/5 text-white/70 hover:bg-white/10">
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── STATUS CARD ─── */
export function StatusCard({ status, currentUser }) {
  const queryClient = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [showDetailPage, setShowDetailPage] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [editingStatusText, setEditingStatusText] = useState(null);
  const [lightboxImg, setLightboxImg] = useState(null);
  const hoverTimer = useRef(null);
  const longPressTimer = useRef(null);
  const longPressOpened = useRef(false);
  const commentInputRef = useRef(null);

  const reactionsMap = status.reactions || {};
  const currentReaction = currentUser ? (reactionsMap[currentUser.email] || null) : null;
  const reactionCounts = Object.values(reactionsMap).reduce((acc, e) => { acc[e] = (acc[e] || 0) + 1; return acc; }, {});
  const topEmojis = Object.entries(reactionCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([e]) => e);
  const totalReactions = Object.keys(reactionsMap).length;
  const commentCount = status.comments_count || 0;
  const myName = currentUser ? (currentUser.first_name || currentUser.email.split("@")[0]) : "";
  const authorName = status.author_name || status.author_email?.split("@")[0] || "Anonim";

  const manyComments = commentCount > 5;

  const reactionInfo = currentReaction
    ? (REACTIONS.find(r => r.emoji === currentReaction) || { emoji: currentReaction, label: "Reagova", color: "#9bffd6" })
    : null;

  const { data: comments = [] } = useQuery({
    queryKey: ["statusComments", status.id],
    queryFn: () => base44.entities.StatusComment.filter({ status_id: status.id }, "created_date", 100),
    enabled: showComments && !manyComments,
    staleTime: 60000,
  });

  const reactMutation = useMutation({
    mutationFn: async (emoji) => {
      if (!currentUser) return base44.auth.redirectToLogin();
      const newReactions = { ...reactionsMap };
      if (newReactions[currentUser.email] === emoji) delete newReactions[currentUser.email];
      else newReactions[currentUser.email] = emoji;
      return base44.entities.Status.update(status.id, { reactions: newReactions });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["statuses"] }),
  });

  const commentMutation = useMutation({
    mutationFn: async (payload = {}) => {
      const replyTarget = payload.replyTarget || replyingTo;
      const textValue = payload.text ?? commentText;
      if (!currentUser || !textValue.trim()) return;
      const commentData = {
        status_id: status.id,
        author_email: currentUser.email,
        author_name: currentUser.first_name || currentUser.full_name || currentUser.email.split("@")[0],
        author_photo_url: currentUser.profile_photo_url || "",
        text: textValue.trim(),
      };
      if (replyTarget) {
        commentData.parent_id = replyTarget.parent_id || replyTarget.id;
        commentData.reply_to_name = replyTarget.author_name;
      }
      await base44.entities.StatusComment.create(commentData);
      await base44.entities.Status.update(status.id, { comments_count: commentCount + 1 });
    },
    onSuccess: (_data, variables = {}) => {
      if (variables.replyTarget) setReplyingTo(null);
      else setCommentText("");
      queryClient.invalidateQueries({ queryKey: ["statusComments", status.id] });
      queryClient.invalidateQueries({ queryKey: ["statuses"] });
    },
  });

  const editStatusMutation = useMutation({
    mutationFn: (text) => base44.entities.Status.update(status.id, { text }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["statuses"] });
      setEditingStatusText(null);
    },
  });

  const toggleComments = () => {
    if (manyComments) { setShowDetailPage(true); return; }
    setShowComments(v => {
      if (!v) setTimeout(() => commentInputRef.current?.focus(), 150);
      return !v;
    });
  };

  const handleReply = (c) => {
    if (!showComments) setShowComments(true);
    setReplyingTo(c);
    setCommentText("");
    // Textarea inline do të marrë fokus automatikisht (ref autoFocus)
  };

  const handleEditComment = (text) => {
    setCommentText(text);
    setTimeout(() => commentInputRef.current?.focus(), 150);
  };

  const [textExpanded, setTextExpanded] = useState(false);
  const TEXT_LIMIT = 160;
  const isLongText = (status.text || "").length > TEXT_LIMIT;
  const displayText = isLongText && !textExpanded ? status.text.slice(0, TEXT_LIMIT) + "…" : status.text;

  const statusImageVisible = shouldShowStatusImage(status);
  const publicSourceUrl = getPublicSourceUrl(status);

  if (hidden) return null;
  if (showDetailPage) return <StatusDetailPage status={status} currentUser={currentUser} onBack={() => setShowDetailPage(false)} />;

  return (
    <div style={{ background: "#1a2640", marginBottom: "8px" }}>

      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-2 pb-1">
        <div className="flex items-center gap-3">
          <Avatar name={authorName} email={status.author_email} photoUrl={status.author_photo_url} size={40} />
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link
                to={`/Member/${encodeURIComponent(status.author_email || "")}?name=${encodeURIComponent(authorName)}`}
                className="text-white font-bold text-[14px] leading-snug hover:text-[#8ab4ff]"
              >
                {authorName}
              </Link>
              {currentUser && currentUser.email !== status.author_email && (
                <button className="text-[#8ab4ff] font-bold text-[13px]">· Ndiq</button>
              )}
              {status.feeling && (
                <span className="text-white/50 font-normal text-[13px]">· ndihet {status.feeling}</span>
              )}
            </div>
            {status.checkin_location && <p className="text-white/50 text-[12px]">📍 {status.checkin_location}</p>}
            <p className="text-white/40 text-[12px] flex items-center gap-1 mt-0.5">
              {timeAgo(status.created_date)} · <Globe className="w-3 h-3" />
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 2, marginTop: 2 }}>
          <PostMenu status={status} currentUser={currentUser} onEdit={(text) => setEditingStatusText(text)} />
          <button onClick={() => setHidden(true)} className="fb-action-btn" style={{ color: "rgba(255,255,255,0.35)", cursor: "pointer", padding: "4px" }}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>
      </div>

      {/* Edit status modal */}
      {editingStatusText !== null && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[72px] px-0 sm:px-4" style={{ background: "rgba(0,0,0,0.75)" }} onClick={() => setEditingStatusText(null)}>
          <div className="w-full sm:max-w-md rounded-b-2xl sm:rounded-2xl shadow-2xl border border-white/10" style={{ background: "#1a2640" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
              <div className="w-7" />
              <h2 className="text-white font-bold text-sm">Përpuno Postimin</h2>
              <button onClick={() => setEditingStatusText(null)} className="fb-action-btn w-7 h-7 flex items-center justify-center text-white/60"><X className="w-3.5 h-3.5" /></button>
            </div>
            <div className="px-3 pt-2 pb-3 space-y-2">
              <textarea value={editingStatusText} onChange={e => { setEditingStatusText(e.target.value); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
                className="w-full bg-transparent text-white placeholder:text-white/30 text-[15px] resize-none outline-none overflow-hidden"
                style={{ minHeight: "80px" }} autoFocus />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setEditingStatusText(null)} className="px-4 py-1.5 rounded-lg text-sm text-white/60 hover:bg-white/5">Anulo</button>
                <button onClick={() => editStatusMutation.mutate(editingStatusText.trim())} disabled={editStatusMutation.isPending}
                  className="px-4 py-1.5 rounded-lg text-sm font-bold text-[#0b1020] disabled:opacity-40"
                  style={{ background: "linear-gradient(to right, #8ab4ff, #9bffd6)" }}>
                  {editStatusMutation.isPending ? "Duke ruajtur..." : "Ruaj"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Text */}
      {status.text && (
        <p className="px-4 pb-2 text-white text-[14px] leading-snug">
          {displayText}
          {isLongText && !textExpanded && (
            <button onClick={() => setTextExpanded(true)} className="text-white/50 font-semibold ml-1">Shfaq më shumë</button>
          )}
        </p>
      )}

      <ImportedStatusInfo status={status} />
      <ImportAuditBox status={status} currentUser={currentUser} />

      {/* Image */}
      {statusImageVisible && (
        <img
          src={status.image_url} alt="" className="w-full object-cover cursor-pointer"
          style={{ maxHeight: 520 }} loading="lazy"
          onClick={() => setLightboxImg(status.image_url)}
        />
      )}

      {/* Link */}
      {publicSourceUrl && (
        <div className="mx-4 mt-2 mb-1">
          <a href={publicSourceUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 rounded-xl text-[#8ab4ff] text-sm border border-white/10" style={{ background: "#253347" }}>
            <Link2 className="w-4 h-4 shrink-0" /><span className="truncate">{publicSourceUrl}</span>
          </a>
        </div>
      )}

      {/* Single action bar: reaction + count | comment + count | share */}
      <div className="flex items-center px-4 py-1 gap-1" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        {/* Reaction button */}
        <div className="relative">
          <button
            onClick={() => { if (!currentUser) { base44.auth.redirectToLogin(); return; } reactMutation.mutate(currentReaction || "👍"); }}
            onMouseEnter={() => { hoverTimer.current = setTimeout(() => setShowReactionPicker(true), 600); }}
            onMouseLeave={() => clearTimeout(hoverTimer.current)}
            onPointerDown={(e) => {
              if (e.pointerType === "mouse") return;
              e.preventDefault();
              longPressOpened.current = false;
              longPressTimer.current = setTimeout(() => {
                longPressOpened.current = true;
                setShowReactionPicker(true);
              }, 260);
            }}
            onPointerUp={(e) => {
              clearTimeout(longPressTimer.current);
              if (e.pointerType !== "mouse" && !longPressOpened.current) {
                if (!currentUser) { base44.auth.redirectToLogin(); return; }
                reactMutation.mutate(currentReaction || "👍");
              }
            }}
            onPointerCancel={() => clearTimeout(longPressTimer.current)}
            onContextMenu={e => e.preventDefault()}
            className="fb-action-btn flex items-center gap-1 border-none select-none"
            style={{ padding: "4px 8px 4px 4px", fontSize: "13px", fontWeight: 600, color: currentReaction ? (reactionInfo?.color || "#8ab4ff") : "rgba(255,255,255,0.5)", cursor: "pointer", userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none" }}>
            {currentReaction
              ? <span style={{ fontSize: "16px", lineHeight: 1 }}>{reactionInfo?.emoji}</span>
              : <ThumbsUp style={{ width: 16, height: 16 }} />}
            {totalReactions > 0 && <span style={{ fontSize: 12 }}>{totalReactions}</span>}
          </button>
          {showReactionPicker && (
            <div onMouseEnter={() => clearTimeout(hoverTimer.current)} onMouseLeave={() => setShowReactionPicker(false)}>
              <ReactionPicker onReact={(e) => reactMutation.mutate(e)} onClose={() => setShowReactionPicker(false)} />
            </div>
          )}
        </div>
        {/* Comment button */}
        <button onClick={toggleComments}
          className="fb-action-btn flex items-center gap-1"
          style={{ padding: "4px 8px 4px 4px", fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.5)", cursor: "pointer" }}>
          <MessageCircle style={{ width: 16, height: 16 }} />
          {commentCount > 0 && <span style={{ fontSize: 12 }}>{commentCount}</span>}
        </button>
        {/* Share button */}
        <button onClick={() => setShowShare(true)}
          className="fb-action-btn flex items-center gap-1"
          style={{ padding: "4px 8px 4px 4px", fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.5)", cursor: "pointer" }}>
          <Forward style={{ width: 16, height: 16 }} />
        </button>
      </div>



      {/* ≤5 comments: inline list */}
      {showComments && !manyComments && (
        <div className="px-4 pb-3 space-y-3">
          {comments.filter(c => !c.parent_id).map(c => {
            const replies = comments.filter(r => r.parent_id === c.id).sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

            return (
              <div key={c.id}>
                {/* Main comment */}
                <div className="flex gap-2 items-start">
                  <div className="flex flex-col items-center shrink-0" style={{ width: 36 }}>
                    <Avatar name={c.author_name} email={c.author_email} photoUrl={c.author_photo_url} size={36} />
                    {replies.length > 0 && (
                      <div style={{ width: 2, flex: 1, minHeight: 8, marginTop: 4, background: "rgba(255,255,255,0.18)", borderRadius: 1 }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-1">
                      <div className="rounded-2xl rounded-tl-sm px-3 py-2" style={{ background: "#253347", display: "inline-block", maxWidth: "100%" }}>
                        <span className="text-white text-[13px] font-bold">{c.author_name} <span className="text-white/30 text-[11px] font-normal">{timeAgo(c.created_date)}</span></span>
                        <p className="text-white/85 text-[14px] mt-0.5 break-words leading-snug">{c.text.replace(/^@\S+\s*/, '').trim()}</p>
                      </div>
                      <CommentMenu comment={c} currentUser={currentUser} statusId={status.id} />
                    </div>
                    <div className="flex items-center gap-3 mt-1 ml-1">
                      <button onClick={() => handleReply(c)} className="fb-action-btn text-[#8ab4ff] text-[12px] font-bold px-0 py-0">Repliko</button>
                      <button className="fb-action-btn text-white/30 flex items-center gap-1 text-[11px]"><ThumbsUp className="w-3 h-3" /></button>
                    </div>
                    {/* INPUT: direkt poshtë action-row të komentit kryesor */}
                    {replyingTo?.id === c.id && (
                      <InlineReplyTextarea
                        currentUser={currentUser}
                        targetName={c.author_name}
                        compact
                        onCancel={() => setReplyingTo(null)}
                        onSubmit={(text) => commentMutation.mutate({ replyTarget: c, text })}
                      />
                    )}

                    {/* Replies — brenda flex-1 */}
                    {replies.length > 0 && (
                      <div className="mt-1" style={{ paddingLeft: "44px" }}>
                        {replies.map((r) => (
                          <div key={r.id} className="mb-1">
                            <div className="flex gap-2 items-start">
                              <div className="shrink-0" style={{ width: 28 }}>
                                <Avatar name={r.author_name} email={r.author_email} photoUrl={r.author_photo_url} size={28} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start gap-1">
                                  <div className="rounded-2xl rounded-tl-sm px-3 py-1.5" style={{ background: "#253347", display: "inline-block", maxWidth: "100%" }}>
                                    <span className="text-white text-[12px] font-bold">{r.author_name} <span className="text-white/30 text-[11px] font-normal">{timeAgo(r.created_date)}</span></span>
                                    <p className="text-[13px] mt-0.5 break-words leading-snug">
                                      {r.reply_to_name && <span className="text-[#8ab4ff] font-semibold mr-1">@{r.reply_to_name}</span>}
                                      <span className="text-white/85">{r.text.replace(/^@\S+\s*/, '').trim()}</span>
                                    </p>
                                  </div>
                                  <CommentMenu comment={r} currentUser={currentUser} statusId={status.id} />
                                </div>
                                <div className="flex items-center gap-3 mt-0.5 ml-1">
                                  <button onClick={() => handleReply(r)} className="fb-action-btn text-[#8ab4ff] text-[11px] font-bold px-0 py-0">Repliko</button>
                                  <button className="fb-action-btn text-white/30 flex items-center gap-1 text-[11px]"><ThumbsUp className="w-3 h-3" /></button>
                                </div>
                                {/* INPUT: direkt poshtë action-row të këtij reply */}
                                {replyingTo?.id === r.id && (
                                  <InlineReplyTextarea
                                    currentUser={currentUser}
                                    targetName={r.author_name}
                                    compact
                                    onCancel={() => setReplyingTo(null)}
                                    onSubmit={(text) => commentMutation.mutate({ replyTarget: r, text })}
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {/* Input për koment të ri — gjithmonë i dukshëm */}
          <CommentInput
            currentUser={currentUser}
            commentText={replyingTo ? "" : commentText}
            setCommentText={replyingTo ? () => {} : setCommentText}
            replyingTo={null}
            setReplyingTo={setReplyingTo}
            commentInputRef={commentInputRef}
            myName={myName}
            onFocus={() => { if (!currentUser) base44.auth.redirectToLogin(); }}
            onSubmit={() => { if (currentUser && !replyingTo) commentMutation.mutate(); }}
            isPending={commentMutation.isPending}
          />
        </div>
      )}

      {showShare && <ShareModal status={status} onClose={() => setShowShare(false)} />}

      {lightboxImg && (
        <Lightbox
          src={lightboxImg}
          onClose={() => setLightboxImg(null)}
          status={status}
          currentUser={currentUser}
          onLike={() => { if (!currentUser) { base44.auth.redirectToLogin(); return; } reactMutation.mutate(currentReaction || "👍"); }}
          onComment={() => { toggleComments(); }}
          onShare={() => setShowShare(true)}
        />
      )}
    </div>
  );
}

/* ─── SPONSORED AD ─── */
function SponsoredAd() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div style={{ background: "#1a2640", marginBottom: "8px" }}>
      <div className="flex items-start justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-[#0b1020] text-sm shrink-0"
            style={{ background: "linear-gradient(135deg, #8ab4ff, #9bffd6)" }}>A</div>
          <div>
            <p className="text-white font-bold text-sm">Beta Publike</p>
            <p className="text-white/40 text-xs flex items-center gap-1">Sponsorizuar · <Globe className="w-3 h-3" /></p>
          </div>
        </div>
        <button onClick={() => setDismissed(true)} className="p-1.5 text-white/40 hover:text-white/70">
          <X className="w-5 h-5" />
        </button>
      </div>
      <p className="px-4 pb-3 text-white/80 text-[15px]">
        Antoktoni është në fazë beta publike. Aksesi bazë është falas; mbështetja vullnetare ndihmon zhvillimin dhe mirëmbajtjen e platformës.
      </p>
      <div className="flex items-center justify-between px-4 py-3 border-t border-white/8">
        <p className="text-white/30 text-xs">antokton.com</p>
        <Link to={createPageUrl("Subscriptions")} className="text-sm font-bold px-5 py-2 rounded-lg text-[#0b1020]"
          style={{ background: "linear-gradient(to right, #8ab4ff, #9bffd6)" }}>Mbështet</Link>
      </div>
    </div>
  );
}

/* ─── LEFT SIDEBAR ─── */
const SIDEBAR_LINKS = [
  { icon: Home, label: "Kryefaqe", to: "/" },
  { icon: Users, label: "Anëtarë", to: "/Members" },
  { icon: ShoppingBag, label: "Pazar", to: "/Pazar" },
  { icon: Calendar, label: "Ngjarje", to: "/Events" },
  { icon: Briefcase, label: "Punë", to: "/Feed?category=pune" },
  { icon: Newspaper, label: "Media", to: "/Media" },
];

function LeftSidebar({ currentUser }) {
  return (
    <div className="hidden lg:flex flex-col w-64 xl:w-72 shrink-0 py-4 space-y-1 sticky top-20 self-start">
      {currentUser && (
        <Link to={createPageUrl("Profile")} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 mb-2">
          <Avatar name={currentUser.first_name || currentUser.email} email={currentUser.email} photoUrl={currentUser.profile_photo_url} size={36} />
          <span className="text-white font-semibold text-sm">{currentUser.first_name || currentUser.email.split("@")[0]}</span>
        </Link>
      )}
      {SIDEBAR_LINKS.map(l => (
        <Link key={l.to} to={l.to}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:bg-white/8 hover:text-white font-medium text-[15px]">
          <l.icon className="w-5 h-5" />{l.label}
        </Link>
      ))}
    </div>
  );
}

/* ─── RIGHT SIDEBAR ─── */
function RightSidebar() {
  return (
    <div className="hidden xl:flex flex-col w-64 shrink-0 py-4 space-y-4 sticky top-20 self-start">
      <div className="rounded-2xl border border-white/8 overflow-hidden" style={{ background: "#1a2640" }}>
        <div className="p-4 border-b border-white/8">
          <p className="text-white font-bold text-sm">📣 Sponsorizuar</p>
        </div>
        <div className="p-4">
          <div className="text-center p-4 rounded-xl border border-white/8" style={{ background: "#253347" }}>
            <div className="text-3xl mb-2">🌍</div>
            <p className="text-white font-semibold text-sm">Diaspora Shqiptare</p>
            <p className="text-white/50 text-xs mt-1">Komunitet global · 1000+ anëtarë</p>
            <Link to={createPageUrl("Subscriptions")}
              className="mt-3 block text-center text-xs font-bold px-4 py-2 rounded-lg text-[#0b1020]"
              style={{ background: "linear-gradient(to right, #8ab4ff, #9bffd6)" }}>
              Mbështet Antoktonin
            </Link>
          </div>
        </div>
      </div>
      <p className="text-white/20 text-xs px-1">© 2026 Antokton · Privatësia · Kushtet</p>
    </div>
  );
}

/* ─── MAIN PAGE ─── */
const PAGE_SIZE = 20;

export default function Statuset() {
  const [currentUser, setCurrentUser] = useState(null);
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.isAuthenticated().then(async auth => {
      if (auth) setCurrentUser(await base44.auth.me());
    });
  }, []);

  const { data: allStatuses = [], isLoading, isFetching } = useQuery({
    queryKey: ["statuses"],
    queryFn: () => base44.entities.Status.list("-created_date", 500),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const { data: statusAuthors = [] } = useQuery({
    queryKey: ["statusAuthors"],
    queryFn: () => base44.entities.User.list("-updated_date", 1000),
    staleTime: 60000,
  });

  const { data: myConnections = [] } = useQuery({
    queryKey: ["userConnections", currentUser?.email],
    queryFn: () => base44.entities.UserConnection.filter({ owner_email: currentUser.email }, "-updated_date", 500),
    enabled: !!currentUser?.email,
    staleTime: 60000,
  });

  const { data: myBlocks = [] } = useQuery({
    queryKey: ["userBlocks", currentUser?.email],
    queryFn: () => base44.entities.UserBlock.filter({ blocker_email: currentUser.email }, "-created_date", 500),
    enabled: !!currentUser?.email,
    staleTime: 60000,
  });

  const visibleStatuses = useMemo(() => {
    const connectionByEmail = new Map(myConnections.map((item) => [item.contact_email, item.circle]));
    const blockedEmails = new Set(myBlocks.map((item) => String(item.blocked_email || "").toLowerCase()).filter(Boolean));
    return allStatuses.filter((status) => {
      if (blockedEmails.has(String(status.author_email || "").toLowerCase())) return false;
      const visibility = status.visibility || "public";
      if (visibility === "public") return true;
      if (!currentUser?.email) return false;
      if (status.author_email === currentUser.email) return true;
      const circle = connectionByEmail.get(status.author_email);
      if (visibility === "wide_circle") return circle === "wide" || circle === "close";
      if (visibility === "close_circle") return circle === "close";
      return true;
    });
  }, [allStatuses, currentUser?.email, myBlocks, myConnections]);

  const authorByEmail = useMemo(() => {
    const map = new Map();
    statusAuthors.forEach((author) => {
      const email = String(author.email || "").toLowerCase();
      if (!email || map.has(email)) return;
      map.set(email, author);
    });
    return map;
  }, [statusAuthors]);

  const enrichedStatuses = useMemo(() => visibleStatuses.map((status) => {
    const author = authorByEmail.get(String(status.author_email || "").toLowerCase());
    if (!author?.profile_photo_url || status.author_photo_url) return status;
    return { ...status, author_photo_url: author.profile_photo_url };
  }), [authorByEmail, visibleStatuses]);

  const statuses = enrichedStatuses.slice(0, page * PAGE_SIZE);
  const hasMore = enrichedStatuses.length > page * PAGE_SIZE;

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["statuses"] });
    }, 60000);
    return () => clearInterval(interval);
  }, [queryClient]);

  const feed = useMemo(() => {
    const items = [];
    statuses.forEach((s, i) => {
      items.push({ type: "post", data: s });
      if ((i + 1) % 5 === 0) items.push({ type: "ad", id: `ad-${i}` });
    });
    return items;
  }, [statuses]);

  return (
    <div className="min-h-screen" style={{ background: "#0f1929" }}>
      <style>{`
        .fb-action-btn {
          background: transparent !important;
          background-image: none !important;
          border: none !important;
          border-image: none !important;
          box-shadow: none !important;
          outline: none !important;
        }
        .fb-action-btn:hover,
        .fb-action-btn:focus,
        .fb-action-btn:active {
          background: rgba(255,255,255,0.06) !important;
          border: none !important;
          box-shadow: none !important;
        }
        /* Override index.css aggressive button rule for action buttons */
        button.fb-action-btn:not(.bg-primary):not(.bg-accent) {
          background: transparent !important;
          border: none !important;
          color: inherit !important;
        }
        button.fb-action-btn:not(.bg-primary):not(.bg-accent):hover {
          background: rgba(255,255,255,0.06) !important;
          border: none !important;
          color: inherit !important;
        }
      `}</style>
      <div className="max-w-6xl mx-auto px-0 sm:px-4 py-0 sm:py-4 flex gap-4 items-start">
        <LeftSidebar currentUser={currentUser} />
        <div className="flex-1 min-w-0 max-w-[600px] mx-auto">
          <CreatePostBox currentUser={currentUser} />
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-[#8ab4ff] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : statuses.length === 0 ? (
            <div className="py-20 text-center rounded-lg mt-2" style={{ background: "#1a2640" }}>
              <div className="text-5xl mb-4">✍️</div>
              <p className="text-white font-bold text-lg">Nuk ka postime ende</p>
              <p className="text-white/50 text-sm mt-2 mb-6">Bëhu i pari që poston në komunitet!</p>
            </div>
          ) : (
            <PullToRefresh onRefresh={async () => { await queryClient.invalidateQueries({ queryKey: ["statuses"] }); setPage(1); }}>
              {feed.map(item =>
                item.type === "ad"
                  ? <SponsoredAd key={item.id} />
                  : <StatusCard key={item.data.id} status={item.data} currentUser={currentUser} />
              )}

              {/* Load more */}
              {hasMore && (
                <div className="flex justify-center py-4">
                  <button onClick={() => setPage(p => p + 1)}
                    className="fb-action-btn px-6 py-2 rounded-full text-sm font-semibold text-white/70 hover:text-white"
                    style={{ background: "#1a2640" }}>
                    Ngarko më shumë
                  </button>
                </div>
              )}
            </PullToRefresh>
          )}
        </div>
        <RightSidebar />
      </div>
    </div>
  );
}

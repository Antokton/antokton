import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/antoktonClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, ChevronDown, ChevronUp, CornerDownRight, Flag, X, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import moment from "moment";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

moment.locale("sq", {
  relativeTime: {
    future: "pas %s",
    past: "%s më parë",
    s: "disa sekonda",
    ss: "%d sekonda",
    m: "1 minutë",
    mm: "%d minuta",
    h: "1 orë",
    hh: "%d orë",
    d: "1 ditë",
    dd: "%d ditë",
    M: "1 muaj",
    MM: "%d muaj",
    y: "1 vit",
    yy: "%d vite",
  },
});

const COMMENT_REPORT_REASONS = [
  { value: "spam", label: "🚫 Spam / Reklamë e padëshiruar" },
  { value: "offensive", label: "⚠️ Ofensiv / Fyerje" },
  { value: "fake", label: "❌ Dezinformim / Rremë" },
  { value: "harassment", label: "😡 Ngacmim / Kërcënim" },
  { value: "other", label: "💬 Tjetër" },
];

function CommentReportModal({ comment, user, onClose }) {
  const [reason, setReason] = useState(COMMENT_REPORT_REASONS[0].value);
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    setSending(true);
    await base44.entities.CommentReport.create({
      comment_id: comment.id,
      reported_by: user.email,
      reason,
      details,
    });
    setSending(false);
    onClose();
    alert("Komenti u raportua. Faleminderit!");
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-white/10 p-5 space-y-4"
        style={{ background: '#1c2333' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Flag className="w-4 h-4 text-red-400" /> Raporto Komentin
          </h3>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-white/40 text-xs">Raporti shkon direkt tek stafi ynë për shqyrtim.</p>
        <div className="space-y-2">
          {COMMENT_REPORT_REASONS.map(opt => (
            <button key={opt.value} onClick={() => setReason(opt.value)}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all border ${
                reason === opt.value
                  ? "border-[#8ab4ff] bg-[#8ab4ff]/10 text-white"
                  : "border-white/10 bg-white/5 text-white/70 hover:bg-white/8"
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Shpjegim shtesë (opsional)"
          rows={3}
          className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white placeholder:text-white/35 outline-none"
        />
        <button onClick={handleSubmit} disabled={sending}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40 bg-red-500 hover:bg-red-600 transition-colors">
          {sending ? "Duke dërguar..." : "Dërgo Raportimin"}
        </button>
      </div>
    </div>
  );
}

const REACTIONS = [
  { emoji: "👍", label: "Pëlqej" },
  { emoji: "❤️", label: "Dashuri" },
  { emoji: "😂", label: "Qesh" },
  { emoji: "😮", label: "Befasi" },
  { emoji: "😢", label: "Trishtim" },
  { emoji: "😡", label: "Zemërim" },
  { emoji: "👎", label: "Nuk Pëlqej" },
];

// Picker rendered via portal to avoid clipping inside nested elements
function ReactionPickerFloating({ anchorRef, onReact, onClose }) {
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPos({ top: rect.top - 48 + window.scrollY, left: rect.left });
    }
    const handler = (e) => {
      if (anchorRef.current && !anchorRef.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!pos) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 4 }}
      transition={{ duration: 0.12 }}
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        zIndex: 9999,
        background: "rgba(15,23,42,0.98)",
        border: "1px solid rgba(255,255,255,0.18)",
        borderRadius: 999,
        padding: "6px 8px",
        display: "flex",
        gap: 2,
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}
    >
      {REACTIONS.map((r) => (
        <button
          key={r.emoji}
          onClick={() => { onReact(r.emoji); onClose(); }}
          title={r.label}
          className="hover:scale-150 active:scale-125 transition-transform duration-100 select-none"
          style={{ fontSize: 20, lineHeight: 1, padding: "0 2px" }}
        >
          {r.emoji}
        </button>
      ))}
    </motion.div>
  );
}

export default function CommentItem({
  comment,
  allComments,
  commentLikes,
  user,
  isAuth,
  canComment,
  jobId,
  depth = 0,
}) {
  const queryClient = useQueryClient();
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [showReplies, setShowReplies] = useState(true);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(comment.text || "");
  const replyRef = useRef(null);
  const reactionBtnRef = useRef(null);
  const hoverTimer = useRef(null);

  const replies = allComments.filter(c => c.parent_id === comment.id);
  const myReaction = commentLikes.find(l => l.comment_id === comment.id && l.user_email === user?.email);
  const canModerateComment = user?.role === "admin" || user?.role === "moderator" || comment.created_by === user?.email;

  const reactionGroups = REACTIONS.map(r => ({
    ...r,
    count: commentLikes.filter(l => l.comment_id === comment.id && l.reaction === r.emoji).length,
  })).filter(r => r.count > 0);

  const reactMutation = useMutation({
    mutationFn: async (emoji) => {
      if (myReaction) {
        if (myReaction.reaction === emoji) {
          await base44.entities.CommentLike.delete(myReaction.id);
        } else {
          await base44.entities.CommentLike.update(myReaction.id, { reaction: emoji });
        }
      } else {
        await base44.entities.CommentLike.create({
          comment_id: comment.id,
          user_email: user.email,
          reaction: emoji,
        });
      }
    },
    onSuccess: () => {
      setShowReactionPicker(false);
      queryClient.invalidateQueries({ queryKey: ["commentLikes", jobId] });
    },
  });

  const replyMutation = useMutation({
    mutationFn: async () => {
      const displayName = user?.first_name && user?.surname
        ? `${user.first_name} ${user.surname}`
        : user?.first_name || user?.full_name || user?.email?.split("@")[0] || "Anonim";
      await base44.entities.JobComment.create({
        job_id: jobId,
        parent_id: comment.id,
        text: replyText,
        author_name: displayName,
      });
    },
    onSuccess: () => {
      setReplyText("");
      setShowReplyInput(false);
      setShowReplies(true);
      queryClient.invalidateQueries({ queryKey: ["comments", jobId] });
    },
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.JobComment.update(comment.id, { text: editedText.trim() });
    },
    onSuccess: () => {
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["comments", jobId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.JobComment.delete(comment.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", jobId] });
      queryClient.invalidateQueries({ queryKey: ["job", jobId] });
    },
  });

  const handleReact = (emoji) => {
    if (!isAuth) { base44.auth.redirectToLogin(); return; }
    reactMutation.mutate(emoji);
  };

  const handleReplyKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (replyText.trim() && !replyMutation.isPending) replyMutation.mutate();
    }
  };

  const handleMouseEnterBtn = () => {
    hoverTimer.current = setTimeout(() => setShowReactionPicker(true), 300);
  };
  const handleMouseLeaveBtn = () => clearTimeout(hoverTimer.current);

  // Shqip relative time
  const timeAgo = moment(comment.created_date).locale("sq").fromNow();

  return (
    <div className={depth > 0 ? "ml-7 mt-2 border-l-2 border-white/5 pl-3" : ""}>
      <div className="flex items-start gap-2.5">
        {/* Avatar */}
        <div
          className="flex-shrink-0 rounded-full flex items-center justify-center font-bold text-[#0b1020]"
          style={{
            width: depth > 0 ? 26 : 30,
            height: depth > 0 ? 26 : 30,
            fontSize: depth > 0 ? 10 : 11,
            background: "linear-gradient(135deg, #8ab4ff, #9bffd6)",
            marginTop: 2,
          }}
        >
          {(comment.author_name || "A")[0].toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          {/* Bubble */}
          <div className="rounded-2xl rounded-tl-sm px-3 py-2" style={{ background: "rgba(255,255,255,0.07)" }}>
            {/* Name + time inline, name wraps if needed */}
            <div className="mb-0.5 flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-baseline gap-1.5 flex-wrap">
                <span className="text-[12px] font-semibold text-white">{comment.author_name || "Anonim"}</span>
                <span className="text-[10px] text-white/30 whitespace-nowrap">{timeAgo}</span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full p-1 text-white/35 transition-colors hover:bg-white/8 hover:text-white/80">
                    <MoreVertical className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 border-white/10 bg-[#0b1020] text-white">
                  {canModerateComment && (
                    <DropdownMenuItem onSelect={(event) => { event.preventDefault(); setEditedText(comment.text || ""); setIsEditing(true); }} className="cursor-pointer gap-2 text-white/85">
                      <Pencil className="h-4 w-4" /> Përpuno
                    </DropdownMenuItem>
                  )}
                  {canModerateComment && (
                    <DropdownMenuItem
                      onSelect={(event) => {
                        event.preventDefault();
                        if (window.confirm("Ta fshijmë këtë koment?")) deleteMutation.mutate();
                      }}
                      className="cursor-pointer gap-2 text-red-300"
                    >
                      <Trash2 className="h-4 w-4" /> Fshi
                    </DropdownMenuItem>
                  )}
                  {(!canModerateComment || user?.email !== comment.created_by) && (
                    <DropdownMenuItem onSelect={(event) => { event.preventDefault(); if (!isAuth) { base44.auth.redirectToLogin(); return; } setShowReportModal(true); }} className="cursor-pointer gap-2 text-orange-200">
                      <Flag className="h-4 w-4 text-orange-300" /> Raporto
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-white/10 bg-[#0b1020]/70 p-2 text-sm text-white outline-none"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => editedText.trim() && editMutation.mutate()}
                    disabled={!editedText.trim() || editMutation.isPending}
                    className="rounded-full bg-[#8ab4ff]/20 px-3 py-1 text-xs font-semibold text-white disabled:opacity-40"
                  >
                    {editMutation.isPending ? "Duke ruajtur..." : "Ruaj"}
                  </button>
                  <button
                    onClick={() => { setIsEditing(false); setEditedText(comment.text || ""); }}
                    className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80"
                  >
                    Anulo
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-white/85 text-sm leading-relaxed">{comment.text}</p>
            )}
          </div>

          {/* Reaction summary badges */}
          {reactionGroups.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1 ml-1">
              {reactionGroups.map(r => (
                <button
                  key={r.emoji}
                  onClick={() => handleReact(r.emoji)}
                  className={`text-[11px] rounded-full px-1.5 py-0.5 transition-all select-none flex items-center gap-0.5 ${
                    myReaction?.reaction === r.emoji
                      ? "bg-[#8ab4ff]/25 border border-[#8ab4ff]/50 text-white"
                      : "bg-white/8 border border-white/10 text-white/60 hover:bg-white/12"
                  }`}
                >
                  <span>{r.emoji}</span><span>{r.count}</span>
                </button>
              ))}
            </div>
          )}

          {/* Action row */}
          <div className="flex items-center gap-0.5 mt-1 ml-1">
            {/* Reago button — icon + text on ONE line */}
            <div ref={reactionBtnRef} className="relative">
              <button
                onClick={() => {
                  if (!isAuth) { base44.auth.redirectToLogin(); return; }
                  setShowReactionPicker(v => !v);
                }}
                onMouseEnter={handleMouseEnterBtn}
                onMouseLeave={handleMouseLeaveBtn}
                className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full transition-all select-none whitespace-nowrap ${
                  myReaction
                    ? "text-[#9bffd6] bg-[#9bffd6]/10"
                    : "text-white/40 hover:text-white/80 hover:bg-white/5"
                }`}
              >
                <span style={{ lineHeight: 1 }}>{myReaction ? myReaction.reaction : "👍"}</span>
                <span>{myReaction ? "Reagova" : "Reago"}</span>
              </button>

              <AnimatePresence>
                {showReactionPicker && (
                  <ReactionPickerFloating
                    anchorRef={reactionBtnRef}
                    onReact={handleReact}
                    onClose={() => setShowReactionPicker(false)}
                  />
                )}
              </AnimatePresence>
            </div>

            <span className="text-white/15 text-xs">·</span>

            {/* Përgjigju */}
            {canComment && depth < 2 && (
              <>
                <button
                  onClick={() => {
                    setShowReplyInput(v => !v);
                    if (!showReplyInput) setTimeout(() => replyRef.current?.focus(), 50);
                  }}
                  className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full transition-all select-none whitespace-nowrap ${
                    showReplyInput
                      ? "text-[#8ab4ff] bg-[#8ab4ff]/10"
                      : "text-white/40 hover:text-white/80 hover:bg-white/5"
                  }`}
                >
                  <CornerDownRight className="w-3 h-3 flex-shrink-0" />
                  <span>Përgjigju</span>
                </button>
                <span className="text-white/15 text-xs">·</span>
              </>
            )}

            {/* Raporto */}
            <button
              onClick={() => {
                if (!isAuth) { base44.auth.redirectToLogin(); return; }
                setShowReportModal(true);
              }}
              className="text-[11px] font-medium px-2 py-0.5 rounded-full text-white/25 hover:text-red-400 hover:bg-red-500/8 transition-all ml-auto whitespace-nowrap"
            >
              Raporto
            </button>
          </div>

          {/* Comment Report Modal */}
          {showReportModal && (
            <CommentReportModal comment={comment} user={user} onClose={() => setShowReportModal(false)} />
          )}

          {/* Reply input */}
          <AnimatePresence>
            {showReplyInput && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 flex items-center gap-2"
              >
                <div
                  className="flex-shrink-0 rounded-full flex items-center justify-center font-bold text-[#0b1020]"
                  style={{ width: 22, height: 22, fontSize: 9, background: "linear-gradient(135deg, #8ab4ff, #9bffd6)", flexShrink: 0 }}
                >
                  {(user?.first_name || user?.full_name || "A")[0].toUpperCase()}
                </div>
                <div
                  className="flex-1 flex items-center gap-1.5 rounded-full px-3 py-1"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <input
                    ref={replyRef}
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={handleReplyKeyDown}
                    placeholder={`Përgjigju ${comment.author_name ? comment.author_name.split(" ")[0] : ""}…`}
                    className="flex-1 bg-transparent text-white text-xs outline-none placeholder:text-white/30 min-w-0"
                    autoFocus
                  />
                  <button
                    onClick={() => replyText.trim() && !replyMutation.isPending && replyMutation.mutate()}
                    disabled={!replyText.trim() || replyMutation.isPending}
                    className={`flex-shrink-0 transition-colors ${replyText.trim() ? "text-[#8ab4ff] hover:text-[#9bffd6]" : "text-white/20"}`}
                  >
                    <Send className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Replies toggle */}
          {replies.length > 0 && (
            <div className="mt-1.5">
              <button
                onClick={() => setShowReplies(v => !v)}
                className="flex items-center gap-1 text-[11px] font-medium text-[#8ab4ff] hover:text-[#9bffd6] ml-1 transition-colors"
              >
                {showReplies ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {replies.length} {replies.length === 1 ? "përgjigje" : "përgjigje"}
              </button>
              {showReplies && (
                <div className="space-y-2 mt-1.5">
                  {replies.map(reply => (
                    <CommentItem
                      key={reply.id}
                      comment={reply}
                      allComments={allComments}
                      commentLikes={commentLikes}
                      user={user}
                      isAuth={isAuth}
                      canComment={canComment}
                      jobId={jobId}
                      depth={depth + 1}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

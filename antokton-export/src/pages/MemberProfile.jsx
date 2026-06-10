import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/antoktonClient";
import UserAvatar from "@/components/ui/UserAvatar";
import { Button } from "@/components/ui/button";
import { StatusCard } from "./Statuset";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Ban,
  Briefcase,
  Check,
  Copy,
  Flag,
  Globe,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  RotateCcw,
  Share2,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import moment from "moment";

const privacyLabel = {
  public: "Publik",
  wide_circle: "Rrethi i gjerë",
  close_circle: "Rrethi i ngushtë",
};

const cleanValue = (value) => String(value || "").trim();

const cleanText = (value, max = 1200) => String(value || "").replace(/[<>]/g, "").trim().slice(0, max);

const firstNonEmpty = (...values) => values.map(cleanValue).find(Boolean) || "";

const reportReasons = [
  { value: "inappropriate", label: "Përmbajtje e papërshtatshme" },
  { value: "fake", label: "Profil i rremë / mashtrim" },
  { value: "offensive", label: "Sjellje fyese" },
  { value: "spam", label: "Spam" },
  { value: "other", label: "Tjetër" },
];

const chosenMemberName = (member, fallback = "Anëtar i Antokton") => {
  if (!member) return fallback;
  const firstLast = `${member.first_name || ""} ${member.surname || ""}`.trim();
  return firstNonEmpty(
    member.display_name,
    member.public_name,
    member.preferred_name,
    member.profile_name,
    member.username,
    member.full_name,
    firstLast,
    member.first_name,
    member.name,
    member.email ? member.email.split("@")[0] : "",
    fallback
  );
};

const joinPlace = (...parts) => parts.map(cleanValue).filter(Boolean).join(", ");

const isPublicStatusForViewer = (status, currentUser, memberEmail) => {
  if (!status) return false;
  if (currentUser?.email && currentUser.email === memberEmail) return true;
  return (status.visibility || "public") === "public";
};

function formatDate(value) {
  if (!value) return "";
  return moment(value).isValid() ? moment(value).format("DD MMM YYYY") : "";
}

function StatusPreview({ status, comments }) {
  const statusComments = comments.filter((comment) => comment.status_id === status.id).slice(0, 3);
  const created = status.created_date || status.created_at;
  return (
    <article className="rounded-2xl border border-white/10 bg-[#101827]/85 p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-white/45">
        <span>{formatDate(created) || "Pa datë"}</span>
        <span className="rounded-full border border-white/10 px-2 py-0.5 text-white/55">
          {privacyLabel[status.visibility || "public"] || "Publik"}
        </span>
        {status.category && <span>{status.category}</span>}
      </div>
      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-white/85">
        {status.text || status.content || status.caption || "Status pa tekst."}
      </p>
      {status.image_url && (
        <img
          src={status.image_url}
          alt=""
          className="mt-3 max-h-64 w-full rounded-xl object-cover"
          loading="lazy"
        />
      )}
      {statusComments.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-white/10 pt-3">
          {statusComments.map((comment) => (
            <div key={comment.id} className="rounded-xl bg-white/[0.04] px-3 py-2 text-xs text-white/65">
              <span className="font-semibold text-white/80">{comment.author_name || comment.author_email || "Koment"}:</span>{" "}
              {comment.text}
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

export default function MemberProfile() {
  const { email = "" } = useParams();
  const [searchParams] = useSearchParams();
  const decodedEmail = decodeURIComponent(email);
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [copied, setCopied] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState(reportReasons[0].value);
  const [reportDescription, setReportDescription] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const [reportError, setReportError] = useState("");

  useEffect(() => {
    let active = true;
    base44.auth.isAuthenticated().then(async (auth) => {
      if (auth && active) setCurrentUser(await base44.auth.me());
    });
    return () => {
      active = false;
    };
  }, []);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["memberProfile", decodedEmail],
    queryFn: () => base44.entities.User.filter({ email: decodedEmail }, "-created_date", 1),
    enabled: !!decodedEmail,
  });
  const member = users[0];

  const statusNameFallback = cleanValue(searchParams.get("name"));
  const displayName = useMemo(() => chosenMemberName(member, statusNameFallback || decodedEmail), [decodedEmail, member, statusNameFallback]);
  const profileUrl = useMemo(() => {
    if (typeof window === "undefined") return `/Member/${encodeURIComponent(decodedEmail)}`;
    return `${window.location.origin}/Member/${encodeURIComponent(decodedEmail)}`;
  }, [decodedEmail]);

  const { data: connections = [] } = useQuery({
    queryKey: ["userConnection", currentUser?.email, decodedEmail],
    queryFn: () => base44.entities.UserConnection.filter({ owner_email: currentUser.email, contact_email: decodedEmail }, "-updated_date", 1),
    enabled: !!currentUser?.email && !!decodedEmail && currentUser.email !== decodedEmail,
  });
  const connection = connections[0];

  const { data: blocks = [] } = useQuery({
    queryKey: ["userBlock", currentUser?.email, decodedEmail],
    queryFn: () => base44.entities.UserBlock.filter({ blocker_email: currentUser.email, blocked_email: decodedEmail }, "-created_date", 1),
    enabled: !!currentUser?.email && !!decodedEmail && currentUser.email !== decodedEmail,
  });
  const block = blocks[0];

  const { data: statuses = [] } = useQuery({
    queryKey: ["memberStatuses", decodedEmail, currentUser?.email],
    queryFn: () => base44.entities.Status.filter({ author_email: decodedEmail }, "-created_date", 80),
    enabled: !!decodedEmail,
  });

  const visibleStatuses = useMemo(
    () => statuses.filter((status) => isPublicStatusForViewer(status, currentUser, decodedEmail)).slice(0, 20),
    [currentUser, decodedEmail, statuses]
  );

  const { data: comments = [] } = useQuery({
    queryKey: ["memberStatusComments", visibleStatuses.map((item) => item.id).join(",")],
    queryFn: () => base44.entities.StatusComment.list("-created_date", 1000),
    enabled: visibleStatuses.length > 0,
  });

  const cannotBlock = ["admin", "superadmin"].includes(String(member?.role || "").toLowerCase()) ||
    ["admin", "superadmin"].includes(String(member?.member_category || "").toLowerCase());
  const isSelf = currentUser?.email && currentUser.email === member?.email;
  const origin = joinPlace(
    member?.origin_city || member?.birth_city || member?.birthplace || member?.place_of_origin,
    member?.origin_country || member?.birth_country || member?.country_of_origin
  );
  const residence = joinPlace(member?.city, member?.country) || cleanValue(member?.location || member?.residence || member?.current_residence);
  const roleLine = firstNonEmpty(member?.profession_title, member?.job_title, member?.profession, member?.industry, "Anëtar i Antokton");

  const saveConnection = useMutation({
    mutationFn: async (circle) => {
      const payload = {
        owner_email: currentUser.email,
        contact_email: decodedEmail,
        contact_name: displayName,
        contact_photo_url: member?.profile_photo_url || "",
        circle,
      };
      if (connection?.id) return base44.entities.UserConnection.update(connection.id, payload);
      return base44.entities.UserConnection.create(payload);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["userConnection", currentUser?.email, decodedEmail] }),
  });

  const removeConnection = useMutation({
    mutationFn: () => connection?.id ? base44.entities.UserConnection.delete(connection.id) : Promise.resolve(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["userConnection", currentUser?.email, decodedEmail] }),
  });

  const blockUser = useMutation({
    mutationFn: async () => {
      if (cannotBlock) throw new Error("Administratorët nuk mund të bllokohen nga përdoruesit e zakonshëm.");
      return base44.entities.UserBlock.create({
        blocker_user_id: currentUser.id || "",
        blocker_email: currentUser.email,
        blocked_user_id: member?.id || "",
        blocked_email: decodedEmail,
        blocked_name: displayName,
        blocked_photo_url: member?.profile_photo_url || "",
        created_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userBlock", currentUser?.email, decodedEmail] });
      queryClient.invalidateQueries({ queryKey: ["userBlocks", currentUser?.email] });
    },
    onError: (error) => alert(error.message || "Bllokimi nuk u krye."),
  });

  const unblockUser = useMutation({
    mutationFn: () => block?.id ? base44.entities.UserBlock.delete(block.id) : Promise.resolve(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userBlock", currentUser?.email, decodedEmail] });
      queryClient.invalidateQueries({ queryKey: ["userBlocks", currentUser?.email] });
    },
  });

  const copyProfile = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      alert("Linku i profilit nuk u kopjua automatikisht.");
    }
  };

  const shareProfile = async () => {
    if (navigator.share) {
      await navigator.share({ title: displayName, text: `Profili i ${displayName} në Antokton`, url: profileUrl }).catch(() => {});
      return;
    }
    copyProfile();
  };

  const submitProfileReport = async () => {
    if (reportSubmitting) return;
    setReportSubmitting(true);
    setReportError("");
    try {
      await base44.entities.Report.create({
        post_id: member.id || decodedEmail,
        post_title: cleanText(displayName, 200),
        post_category: "User",
        reported_entity: "User",
        reported_entity_id: member.id || decodedEmail,
        reported_user_email: member.email,
        reporter_id: currentUser?.id || "",
        reporter_email: currentUser?.email || "",
        reporter_name: currentUser ? chosenMemberName(currentUser, currentUser.email) : "",
        reporter_contact: currentUser?.email || "",
        reason: reportReason,
        description: cleanText(reportDescription),
        details: cleanText(reportDescription),
        status: "new",
      });
      setReportDone(true);
      setTimeout(() => {
        setReportOpen(false);
        setReportDone(false);
        setReportDescription("");
        setReportReason(reportReasons[0].value);
      }, 1200);
    } catch (error) {
      setReportError(error?.message || "Raportimi nuk u ruajt. Provo përsëri.");
    } finally {
      setReportSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 text-white">
        <div className="h-60 animate-pulse rounded-3xl border border-white/10 bg-white/5" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-white">
        <Link to="/Statuset" className="mb-6 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Kthehu te statuset
        </Link>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">Profili nuk u gjet.</div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] text-white sm:px-6 lg:py-8">
      <Link to="/Statuset" className="mb-4 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Kthehu te statuset
      </Link>

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#0d1524] shadow-2xl">
        <div className="h-28 bg-[radial-gradient(circle_at_22%_20%,rgba(138,180,255,0.28),transparent_36%),linear-gradient(135deg,#111a2c,#07101f)] sm:h-36" />
        <div className="px-4 pb-5 sm:px-6">
          <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex min-w-0 items-end gap-4">
              <UserAvatar name={displayName} email={member.email} photoUrl={member.profile_photo_url} size={104} />
              <div className="min-w-0 pb-1">
                <h1 className="truncate text-2xl font-black tracking-tight text-white sm:text-3xl">{displayName}</h1>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-white/60">
                  <Briefcase className="h-4 w-4 text-[#8ab4ff]" />
                  <span>{roleLine}</span>
                </p>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/75 hover:bg-white/10 hover:text-white"
                  aria-label="Veprime për profilin"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 border-white/10 bg-[#0b1020] text-white">
                <DropdownMenuItem onClick={copyProfile} className="cursor-pointer text-white/85">
                  {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Linku u kopjua" : "Kopjo linkun e profilit"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={shareProfile} className="cursor-pointer text-white/85">
                  <Share2 className="h-4 w-4" /> Shpërndaje profilin
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem onClick={() => setReportOpen(true)} className="cursor-pointer text-orange-200">
                  <Flag className="h-4 w-4" /> Raporto profilin
                </DropdownMenuItem>
                {currentUser && !isSelf && (
                  <>
                    {block ? (
                      <DropdownMenuItem onClick={() => unblockUser.mutate()} className="cursor-pointer text-emerald-200">
                        <RotateCcw className="h-4 w-4" /> Zhblloko përdoruesin
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        disabled={cannotBlock || blockUser.isPending}
                        onClick={() => blockUser.mutate()}
                        className="cursor-pointer text-red-200 disabled:opacity-50"
                      >
                        <Ban className="h-4 w-4" /> Blloko përdoruesin
                      </DropdownMenuItem>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase text-white/40">
                <Globe className="h-4 w-4" /> Origjina
              </p>
              <p className="text-sm text-white/85">{origin || "Nuk është plotësuar"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase text-white/40">
                <MapPin className="h-4 w-4" /> Vendbanimi aktual
              </p>
              <p className="text-sm text-white/85">{residence || "Nuk është plotësuar"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase text-white/40">
                <ShieldCheck className="h-4 w-4" /> Statusi
              </p>
              <p className="text-sm text-white/85">
                {member.is_verified ? "Profil i verifikuar" : member.role === "moderator" ? "Moderator" : member.role === "admin" ? "Administrator" : "Anëtar"}
              </p>
            </div>
          </div>

          {member.bio && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <h2 className="mb-2 text-sm font-bold text-white">Rreth {displayName}</h2>
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-white/70">{member.bio}</p>
            </div>
          )}

          {currentUser && !isSelf && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-[#101b2d] p-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Users className="h-4 w-4 text-[#8ab4ff]" /> Shto në rrethin tim të interesit
              </h2>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button disabled={Boolean(block)} onClick={() => saveConnection.mutate("close")} className={connection?.circle === "close" ? "bg-[#8ab4ff] text-[#0b1020]" : "bg-white/10 text-white hover:bg-white/15"}>
                  <UserPlus className="mr-2 h-4 w-4" /> Rrethi i ngushtë
                </Button>
                <Button disabled={Boolean(block)} onClick={() => saveConnection.mutate("wide")} className={connection?.circle === "wide" ? "bg-[#9bffd6] text-[#0b1020]" : "bg-white/10 text-white hover:bg-white/15"}>
                  <UserPlus className="mr-2 h-4 w-4" /> Rrethi i gjerë
                </Button>
                <Link to={`/Messages?to=${encodeURIComponent(decodedEmail)}&name=${encodeURIComponent(displayName)}`}>
                  <Button className="w-full bg-white/10 text-white hover:bg-white/15 sm:w-auto">
                    <MessageCircle className="mr-2 h-4 w-4" /> Mesazh
                  </Button>
                </Link>
                {connection && (
                  <Button onClick={() => removeConnection.mutate()} className="bg-red-500/15 text-red-200 hover:bg-red-500/25">
                    <Trash2 className="mr-2 h-4 w-4" /> Hiqe nga rrethi
                  </Button>
                )}
              </div>
              {block && <p className="mt-3 text-xs text-red-100/70">Ky përdorues është i bllokuar. Nuk do t'i shohësh postimet në statuset e tua dhe mesazhet mes jush nuk lejohen.</p>}
              {cannotBlock && <p className="mt-3 text-xs text-white/45">Administratorët nuk mund të bllokohen nga përdoruesit e zakonshëm.</p>}
            </div>
          )}
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">Statuset e {displayName}</h2>
            <p className="text-sm text-white/45">Postime publike dhe ato që ke të drejtë t'i shohësh.</p>
          </div>
          <Link to="/Statuset" className="text-sm text-[#8ab4ff] hover:text-white">
            Shko te statuset
          </Link>
        </div>

        {block ? (
          <div className="rounded-2xl border border-red-400/15 bg-red-500/10 p-4 text-sm text-red-100/75">
            Nuk shfaqen statuset sepse ky përdorues është i bllokuar.
          </div>
        ) : visibleStatuses.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-sm text-white/50">
            Nuk ka statuse publike për t'u shfaqur.
          </div>
        ) : (
          <div className="space-y-3">
            {visibleStatuses.map((status) => (
              <StatusCard key={status.id} status={status} currentUser={currentUser} />
            ))}
          </div>
        )}
      </section>

      {reportOpen && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/75 p-4"
          onClick={() => setReportOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b1020] p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-base font-bold text-white">
                <Flag className="h-4 w-4 text-orange-300" /> Raporto profilin
              </h3>
              <button type="button" onClick={() => setReportOpen(false)} className="rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-white/60">Arsyeja e raportimit</label>
                <select
                  value={reportReason}
                  onChange={(event) => setReportReason(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#111a2c] px-3 py-2 text-sm text-white"
                >
                  {reportReasons.map((item) => (
                    <option key={item.value} value={item.value} className="bg-[#0b1020]">{item.label}</option>
                  ))}
                </select>
              </div>
              <textarea
                value={reportDescription}
                onChange={(event) => setReportDescription(event.target.value)}
                placeholder="Përshkrim shtesë opsional..."
                rows={4}
                className="w-full resize-none rounded-xl border border-white/10 bg-[#111a2c] px-3 py-2 text-sm text-white placeholder:text-white/35"
              />
              {reportError && <p className="text-xs text-red-300">{reportError}</p>}
              {reportDone && <p className="text-xs text-emerald-300">Raportimi u dërgua për shqyrtim.</p>}
              <button
                type="button"
                onClick={submitProfileReport}
                disabled={reportSubmitting || reportDone}
                className="w-full rounded-xl bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] px-4 py-2.5 text-sm font-bold text-[#0b1020] disabled:opacity-60"
              >
                {reportSubmitting ? "Duke dërguar..." : "Dërgo raportimin"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from "react";
import { base44 } from "@/api/antoktonClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Ban, UserCheck, Trash2, Clock3, LockKeyhole, MoreHorizontal, KeyRound } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import toast from "react-hot-toast";

const ROLES = [
  { value: "user", label: "Përdorues" },
  { value: "moderator", label: "Moderator" },
  { value: "admin", label: "Admin" },
  { value: "inspector", label: "Inspektor" },
];

const FLAGS = [
  { value: "", label: "Pa flamur", color: "bg-gray-500/20 text-gray-400" },
  { value: "yellow", label: "⚠️ Verdhë", color: "bg-yellow-500/20 text-yellow-400" },
  { value: "red", label: "🚩 Kuq", color: "bg-red-500/20 text-red-400" },
];

function passwordResetToastMessage(result, email) {
  if (result?.delivered === true) return `Linku i reset-it u dërgua te ${email}.`;
  if (result?.reason === "no_active_account") return `Nuk u dërgua: ${email} nuk ka llogari aktive.`;
  if (result?.reason === "inactive_auth_account") return `Nuk u dërgua: llogaria e ${email} nuk është aktive.`;
  if (result?.reason === "email_provider_not_configured") return "Nuk u dërgua: shërbimi i email-it nuk është konfiguruar.";
  return "Nuk u konfirmua dërgimi i email-it.";
}

function restoreUserAccessData() {
  return {
    is_active: true,
    is_deleted: false,
    is_disabled: false,
    is_blocked: false,
    blocked_until: "",
    blocked_permanently: false,
    registration_block_until: "",
    registration_block_reason: "",
    account_status: "active",
    status: "active",
    block_reason: "",
  };
}

function hasAccessBlock(user) {
  const status = String(user?.status || "").toLowerCase();
  const accountStatus = String(user?.account_status || "").toLowerCase();
  const blockedUntil = Date.parse(user?.blocked_until || "");
  return Boolean(
    user?.is_deleted ||
    user?.is_disabled ||
    user?.is_blocked ||
    user?.blocked_permanently ||
    (Number.isFinite(blockedUntil) && blockedUntil > Date.now()) ||
    status.includes("blocked") ||
    status === "deleted" ||
    status === "disabled" ||
    accountStatus === "deleted" ||
    accountStatus === "disabled"
  );
}

export default function UserManager({ allUsers = [] }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [tempBlocks, setTempBlocks] = useState({});
  const [openUserId, setOpenUserId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const isAdmin = currentUser?.role === "admin" || currentUser?.member_category === "admin";

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => setCurrentUser(null));
  }, []);

  const writeAudit = async (user, actionType, reason, newStatus) => {
    try {
      const actor = await base44.auth.me();
      await base44.entities.AdminAction.create({
        action_type: actionType,
        entity_type: "member",
        entity_id: user.id,
        entity_title: user.email || user.full_name || user.first_name || "Anëtar",
        performed_by: actor?.email || "",
        reason,
        previous_status: user.status || (user.is_blocked ? "blocked" : "active"),
        new_status: newStatus,
      });
    } catch (error) {
      console.warn("Admin audit failed", error);
    }
  };

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allUsersAdmin"] });
      toast.success("Anëtari u përditësua!");
    }
  });

  const hardDeleteMutation = useMutation({
    mutationFn: async (targetUser) => {
      const actor = await base44.auth.me();
      if (actor?.role !== "admin" && actor?.member_category !== "admin") {
        throw new Error("Vetëm administratori mund ta fshijë përfundimisht anëtarin.");
      }
      if (targetUser.email === actor.email) {
        throw new Error("Nuk mund të fshish llogarinë tënde.");
      }
      await writeAudit(targetUser, "hard_delete", "Fshirje përfundimtare nga administratori", "hard_deleted");
      await base44.entities.User.delete(targetUser.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allUsersAdmin"] });
      setOpenUserId(null);
      toast.success("Anëtari u fshi përfundimisht nga lista.");
    },
    onError: (error) => {
      toast.error(error.message || "Fshirja përfundimtare dështoi.");
    }
  });

  const applyModeration = async (user, data, actionType, reason, newStatus) => {
    await base44.entities.User.update(user.id, data);
    await writeAudit(user, actionType, reason, newStatus);
    queryClient.invalidateQueries({ queryKey: ["allUsersAdmin"] });
    toast.success("Veprimi u ruajt!");
  };

  const sendPasswordReset = async (user) => {
    const email = String(user.email || "").trim().toLowerCase();
    if (!email) {
      toast.error("Ky anëtar nuk ka email.");
      return;
    }
    try {
      const result = await base44.auth.requestPasswordReset(email);
      await writeAudit(
        user,
        "password_reset_request",
        result?.delivered ? "Dërgim linku reset nga administrata" : passwordResetToastMessage(result, email),
        result?.delivered ? "reset_email_sent" : "reset_email_not_sent"
      );
      if (result?.delivered === true) toast.success(passwordResetToastMessage(result, email));
      else toast.error(passwordResetToastMessage(result, email));
    } catch (error) {
      toast.error(error.message || "Dërgimi i reset-it dështoi.");
    }
  };

  const temporaryBlockUntil = (user) => {
    const settings = tempBlocks[user.id] || { amount: 7, unit: "days" };
    const amount = Math.max(1, Number(settings.amount || 1));
    const date = new Date();
    if (settings.unit === "weeks") date.setDate(date.getDate() + amount * 7);
    else if (settings.unit === "months") date.setMonth(date.getMonth() + amount);
    else date.setDate(date.getDate() + amount);
    return date.toISOString();
  };

  const filtered = allUsers.filter(u => {
    const matchSearch = !search ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      (u.first_name + " " + u.surname)?.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all" ||
      (filter === "admin" && (u.role === "admin" || u.role === "moderator")) ||
      (filter === "flagged" && (u.flag_color === "yellow" || u.flag_color === "red")) ||
      (filter === "blocked" && hasAccessBlock(u));
    return matchSearch && matchFilter;
  });

  const roleLabel = (u) => {
    const role = String(u.role || u.member_category || "user").toLowerCase();
    if (role === "admin" || u.member_category === "admin") return "Admin";
    if (role === "moderator" || u.member_category === "moderator") return "Moderator";
    if (role === "inspector" || u.member_category === "inspector") return "Inspektor";
    return "Përdorues";
  };

  const roleBadgeClass = (u) => {
    const role = roleLabel(u);
    if (role === "Admin") return "bg-[#8ab4ff]/20 text-[#8ab4ff] border-[#8ab4ff]/30";
    if (role === "Moderator") return "bg-purple-500/20 text-purple-300 border-purple-500/30";
    if (role === "Inspektor") return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    return "bg-white/10 text-white/55 border-white/10";
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Kërko sipas emrit ose emailit..."
            className="pl-9 h-9 text-sm bg-white/5 border-white/10 text-white"
          />
        </div>
        {["all", "admin", "flagged", "blocked"].map(f => (
          <Button key={f} onClick={() => setFilter(f)} size="sm"
            className={filter === f ? "bg-[#8ab4ff]/30 text-[#8ab4ff] border-[#8ab4ff]/30 h-9" : "bg-white/5 border-white/10 text-white/60 h-9"}>
            {f === "all" ? "Të gjithë" : f === "admin" ? "Admin/Mod" : f === "flagged" ? "Të Flamosur" : "Të Bllokuar"}
            <span className="ml-1 text-[10px] opacity-60">
              ({f === "all" ? allUsers.length :
                f === "admin" ? allUsers.filter(u => u.role === "admin" || u.role === "moderator").length :
                f === "flagged" ? allUsers.filter(u => u.flag_color).length :
                allUsers.filter(hasAccessBlock).length})
            </span>
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-white/30 text-sm py-8">Nuk u gjet asnjë anëtar</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10">
          {filtered.map(u => (
            <div key={u.id} className="border-b border-white/10 bg-white/[0.03] last:border-b-0">
              <div className="flex items-center gap-3 px-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-white">
                      {u.first_name && u.surname ? `${u.first_name} ${u.surname}` : u.full_name || "—"}
                    </p>
                    <Badge className={`${roleBadgeClass(u)} text-[10px]`}>
                      {roleLabel(u)}
                    </Badge>
                    {hasAccessBlock(u) && (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">Bllokuar</Badge>
                    )}
                    {!hasAccessBlock(u) && (
                      <Badge className="bg-green-500/15 text-green-300 border-green-500/25 text-[10px]">Aktiv</Badge>
                    )}
                  </div>
                  <p className="truncate text-xs text-white/40">{u.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenUserId(openUserId === u.id ? null : u.id)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                  aria-label="Veprime për anëtarin"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>

              {openUserId === u.id && (
                <div className="border-t border-white/10 bg-[#0d1424] px-3 py-2.5">
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="min-w-[118px] flex-1 sm:flex-none text-[9px] font-semibold uppercase tracking-wide text-white/35">
                      Rol
                      <select
                        value={u.role || "user"}
                        onChange={e => updateUserMutation.mutate({ id: u.id, data: { role: e.target.value } })}
                        className="mt-1 h-8 w-full rounded-lg border border-white/15 bg-white/[0.06] px-2 text-[11px] normal-case text-white outline-none"
                      >
                        {ROLES.map(r => (
                          <option key={r.value} value={r.value} className="bg-[#0b1020]">{r.label}</option>
                        ))}
                      </select>
                    </label>

                    <label className="min-w-[128px] flex-1 sm:flex-none text-[9px] font-semibold uppercase tracking-wide text-white/35">
                      Kategori
                      <select
                        value={u.member_category || "standard"}
                        onChange={e => updateUserMutation.mutate({ id: u.id, data: { member_category: e.target.value } })}
                        className="mt-1 h-8 w-full rounded-lg border border-white/15 bg-white/[0.06] px-2 text-[11px] normal-case text-white outline-none"
                      >
                        {["standard","privileged","leader","moderator","inspector","admin"].map(c => (
                          <option key={c} value={c} className="bg-[#0b1020]">{c}</option>
                        ))}
                      </select>
                    </label>

                    <label className="min-w-[104px] flex-1 sm:flex-none text-[9px] font-semibold uppercase tracking-wide text-white/35">
                      Flamur
                      <select
                        value={u.flag_color || ""}
                        onChange={e => updateUserMutation.mutate({ id: u.id, data: { flag_color: e.target.value } })}
                        className="mt-1 h-8 w-full rounded-lg border border-white/15 bg-white/[0.06] px-2 text-[11px] normal-case text-white outline-none"
                      >
                        {FLAGS.map(f => (
                          <option key={f.value} value={f.value} className="bg-[#0b1020]">{f.label}</option>
                        ))}
                      </select>
                    </label>

                    <div className="flex flex-wrap items-end gap-1.5 rounded-lg border border-white/10 bg-black/10 p-1.5">
                      <label className="flex flex-col gap-1 text-[9px] font-semibold uppercase tracking-wide text-white/35">
                        Blloko
                        <input
                          type="number"
                          min="1"
                          value={tempBlocks[u.id]?.amount || 7}
                          onChange={(e) => setTempBlocks((current) => ({ ...current, [u.id]: { ...(current[u.id] || {}), amount: e.target.value } }))}
                          className="h-8 w-14 rounded-lg border border-white/15 bg-white/[0.06] px-2 text-[11px] normal-case text-white outline-none"
                        />
                      </label>
                      <select
                        value={tempBlocks[u.id]?.unit || "days"}
                        onChange={(e) => setTempBlocks((current) => ({ ...current, [u.id]: { ...(current[u.id] || {}), unit: e.target.value } }))}
                        className="h-8 rounded-lg border border-white/15 bg-white/[0.06] px-2 text-[11px] text-white outline-none"
                        aria-label="Njësia e bllokimit"
                      >
                        <option value="days" className="bg-[#0b1020]">ditë</option>
                        <option value="weeks" className="bg-[#0b1020]">javë</option>
                        <option value="months" className="bg-[#0b1020]">muaj</option>
                      </select>
                      <button
                        onClick={() => applyModeration(u, {
                          is_blocked: true,
                          blocked_until: temporaryBlockUntil(u),
                          blocked_permanently: false,
                          status: "temporarily_blocked",
                          block_reason: "Bllokim i përkohshëm nga administrata",
                        }, "temporary_block", "Bllokim i përkohshëm", "temporarily_blocked")}
                        className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-yellow-500/25 bg-yellow-500/10 px-2 text-[11px] font-medium text-yellow-300 hover:bg-yellow-500/20"
                      >
                        <Clock3 className="w-3 h-3" /> <span className="hidden sm:inline">Blloko</span>
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        if (hasAccessBlock(u)) {
                          updateUserMutation.mutate({ id: u.id, data: restoreUserAccessData() });
                          return;
                        }
                        updateUserMutation.mutate({ id: u.id, data: { is_blocked: true, status: "blocked", block_reason: "Bllokim nga administrata" } });
                      }}
                      className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2 text-[11px] font-medium transition-colors ${hasAccessBlock(u)
                        ? "bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30"
                        : "bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30"
                      }`}
                    >
                      {hasAccessBlock(u) ? <UserCheck className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                      {hasAccessBlock(u) ? "Rikthe aksesin" : "Blloko"}
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2 text-[11px] font-medium text-white/75 hover:bg-white/10">
                          <MoreHorizontal className="w-3.5 h-3.5" /> Veprime
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 bg-[#0b1020] border-white/10">
                        <DropdownMenuItem
                          onClick={() => sendPasswordReset(u)}
                          className="cursor-pointer text-[#8ab4ff] hover:text-[#9bffd6]"
                        >
                          <KeyRound className="w-3.5 h-3.5 mr-2" /> Dërgo link reset
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-white/10" />
                        <DropdownMenuItem
                          onClick={() => applyModeration(u, {
                            is_blocked: true,
                            blocked_permanently: true,
                            blocked_until: "",
                            status: "permanently_blocked",
                            block_reason: "Bllokim i përhershëm nga administrata",
                          }, "permanent_block", "Bllokim i përhershëm", "permanently_blocked")}
                          className="cursor-pointer text-red-300 hover:text-red-200"
                        >
                          <LockKeyhole className="w-3.5 h-3.5 mr-2" /> Blloko përgjithmonë
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            const until = new Date();
                            until.setMonth(until.getMonth() + 1);
                            applyModeration(u, {
                              registration_block_until: until.toISOString(),
                              registration_block_reason: "Pamundësim ri-regjistrimi për 1 muaj",
                            }, "registration_block", "Pamundëso ri-regjistrimin për 1 muaj", "registration_blocked");
                          }}
                          className="cursor-pointer text-orange-300 hover:text-orange-200"
                        >
                          <Ban className="w-3.5 h-3.5 mr-2" /> Pa ri-regjistrim 1 muaj
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            if (!confirm("Fshi/blloko këtë anëtar? Ky është soft-delete dhe ruhet për auditim.")) return;
                            const until = new Date();
                            until.setMonth(until.getMonth() + 1);
                            applyModeration(u, {
                              is_deleted: true,
                              is_active: false,
                              is_blocked: true,
                              blocked_permanently: true,
                              registration_block_until: until.toISOString(),
                              status: "deleted",
                              block_reason: "Anëtari u fshi nga administrata",
                            }, "delete", "Fshirje e anëtarit me bllokim ri-regjistrimi", "deleted");
                          }}
                          className="cursor-pointer text-red-200 hover:text-red-100"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-2" /> Fshi nga lista
                        </DropdownMenuItem>
                        {isAdmin && (
                          <>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem
                              onClick={() => {
                                if (!confirm("Fshirje përfundimtare: ky anëtar hiqet nga lista dhe nuk ruhet si kontakt. Ky veprim është vetëm për administratorin. Vazhdo?")) return;
                                hardDeleteMutation.mutate(u);
                              }}
                              className="cursor-pointer text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" /> Fshi përgjithmonë
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

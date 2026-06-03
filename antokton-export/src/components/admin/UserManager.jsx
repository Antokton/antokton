import React, { useState } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Shield, AlertTriangle, Ban, Star, UserCheck, Trash2, Clock3, LockKeyhole } from "lucide-react";
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

export default function UserManager({ allUsers = [] }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [tempBlocks, setTempBlocks] = useState({});

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

  const applyModeration = async (user, data, actionType, reason, newStatus) => {
    await base44.entities.User.update(user.id, data);
    await writeAudit(user, actionType, reason, newStatus);
    queryClient.invalidateQueries({ queryKey: ["allUsersAdmin"] });
    toast.success("Veprimi u ruajt!");
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
      (filter === "blocked" && u.is_blocked);
    return matchSearch && matchFilter;
  });

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
                allUsers.filter(u => u.is_blocked).length})
            </span>
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-white/30 text-sm py-8">Nuk u gjet asnjë anëtar</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(u => (
            <div key={u.id} className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-3">
              {/* Rreshti 1: emri + statusi */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-white font-medium text-sm truncate">
                    {u.first_name && u.surname ? `${u.first_name} ${u.surname}` : u.full_name || "—"}
                  </p>
                  <p className="text-white/40 text-xs truncate">{u.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={u.is_blocked
                    ? "bg-red-500/20 text-red-400 border-red-500/30 text-[10px]"
                    : "bg-green-500/20 text-green-400 border-green-500/30 text-[10px]"
                  }>
                    {u.is_blocked ? "Bllokuar" : "Aktiv"}
                  </Badge>
                </div>
              </div>

              {/* Rreshti 2: selectat + butoni bllokimit */}
              <div className="flex flex-wrap gap-2 items-center">
                <div className="flex flex-col gap-0.5">
                  <span className="text-white/30 text-[10px]">Roli</span>
                  <select
                    value={u.role || "user"}
                    onChange={e => updateUserMutation.mutate({ id: u.id, data: { role: e.target.value } })}
                    className="bg-white/10 border border-white/20 text-white rounded px-2 py-1 text-[11px]"
                  >
                    {ROLES.map(r => (
                      <option key={r.value} value={r.value} className="bg-[#0b1020]">{r.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-0.5">
                  <span className="text-white/30 text-[10px]">Kategoria</span>
                  <select
                    value={u.member_category || "standard"}
                    onChange={e => updateUserMutation.mutate({ id: u.id, data: { member_category: e.target.value } })}
                    className="bg-white/10 border border-white/20 text-white rounded px-2 py-1 text-[11px]"
                  >
                    {["standard","privileged","leader","moderator","inspector","admin"].map(c => (
                      <option key={c} value={c} className="bg-[#0b1020]">{c}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-0.5">
                  <span className="text-white/30 text-[10px]">Flamuri</span>
                  <select
                    value={u.flag_color || ""}
                    onChange={e => updateUserMutation.mutate({ id: u.id, data: { flag_color: e.target.value } })}
                    className="bg-white/10 border border-white/20 text-white rounded px-2 py-1 text-[11px]"
                  >
                    {FLAGS.map(f => (
                      <option key={f.value} value={f.value} className="bg-[#0b1020]">{f.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-0.5 ml-auto">
                  <span className="text-white/30 text-[10px]">&nbsp;</span>
                  <button
                    onClick={() => updateUserMutation.mutate({ id: u.id, data: { is_blocked: !u.is_blocked, blocked_until: "", blocked_permanently: false, status: !u.is_blocked ? "blocked" : "active" } })}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${u.is_blocked
                      ? "bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30"
                      : "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
                    }`}
                  >
                    {u.is_blocked ? <UserCheck className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                    {u.is_blocked ? "Zhblloko" : "Blloko"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 border-t border-white/10 pt-3 md:grid-cols-[minmax(0,1fr)_auto]">
                <div className="flex flex-wrap items-end gap-2">
                  <label className="flex flex-col gap-0.5">
                    <span className="text-white/30 text-[10px]">Bllokim i përkohshëm</span>
                    <input
                      type="number"
                      min="1"
                      value={tempBlocks[u.id]?.amount || 7}
                      onChange={(e) => setTempBlocks((current) => ({ ...current, [u.id]: { ...(current[u.id] || {}), amount: e.target.value } }))}
                      className="w-20 rounded border border-white/20 bg-white/10 px-2 py-1 text-[11px] text-white"
                    />
                  </label>
                  <select
                    value={tempBlocks[u.id]?.unit || "days"}
                    onChange={(e) => setTempBlocks((current) => ({ ...current, [u.id]: { ...(current[u.id] || {}), unit: e.target.value } }))}
                    className="rounded border border-white/20 bg-white/10 px-2 py-1 text-[11px] text-white"
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
                    className="inline-flex items-center gap-1 rounded border border-yellow-500/30 bg-yellow-500/10 px-2 py-1 text-[11px] font-medium text-yellow-300 hover:bg-yellow-500/20"
                  >
                    <Clock3 className="w-3 h-3" /> Blloko përkohësisht
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 md:justify-end">
                  <button
                    onClick={() => applyModeration(u, {
                      is_blocked: true,
                      blocked_permanently: true,
                      blocked_until: "",
                      status: "permanently_blocked",
                      block_reason: "Bllokim i përhershëm nga administrata",
                    }, "permanent_block", "Bllokim i përhershëm", "permanently_blocked")}
                    className="inline-flex items-center gap-1 rounded border border-red-500/30 bg-red-500/10 px-2 py-1 text-[11px] font-medium text-red-300 hover:bg-red-500/20"
                  >
                    <LockKeyhole className="w-3 h-3" /> Blloko përgjithmonë
                  </button>
                  <button
                    onClick={() => {
                      const until = new Date();
                      until.setMonth(until.getMonth() + 1);
                      applyModeration(u, {
                        registration_block_until: until.toISOString(),
                        registration_block_reason: "Pamundësim ri-regjistrimi për 1 muaj",
                      }, "registration_block", "Pamundëso ri-regjistrimin për 1 muaj", "registration_blocked");
                    }}
                    className="inline-flex items-center gap-1 rounded border border-orange-500/30 bg-orange-500/10 px-2 py-1 text-[11px] font-medium text-orange-300 hover:bg-orange-500/20"
                  >
                    <Ban className="w-3 h-3" /> Pa ri-regjistrim 1 muaj
                  </button>
                  <button
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
                    className="inline-flex items-center gap-1 rounded border border-red-600/40 bg-red-600/15 px-2 py-1 text-[11px] font-medium text-red-200 hover:bg-red-600/25"
                  >
                    <Trash2 className="w-3 h-3" /> Fshi anëtarin
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import React, { useState } from "react";
import { Table } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Crown, Flag, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import moment from "moment";
import { useMediaQuery } from "../useMediaQuery";

export default function AdvancedMemberTable({ members, onSelectMember, activeSubs, language = 'sq' }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState("last_seen");
  const [sortOrder, setSortOrder] = useState("desc");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const isMobile = useMediaQuery("(max-width: 768px)");

  const t = (sq, en) => language === 'sq' ? sq : en;

  const filteredMembers = members
    .filter(m => {
      if (search) {
        const q = search.toLowerCase();
        const searchable = `${m.first_name || ""} ${m.surname || ""} ${m.full_name || ""} ${m.email}`.toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      if (roleFilter !== "all" && m.role !== roleFilter) return false;
      if (typeFilter !== "all" && m.user_type !== typeFilter) return false;
      return true;
    })
    .sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });

  const paginatedMembers = filteredMembers.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filteredMembers.length / pageSize);

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("Kërko anëtar...", "Search member...")}
          className="flex-1 min-w-[200px] bg-white/8 border-white/15 text-white"
        />
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-32 bg-white/8 border-white/15 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("Të gjithë", "All")}</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="moderator">Moderator</SelectItem>
            <SelectItem value="inspector">Inspektor</SelectItem>
            <SelectItem value="user">{t("Anëtar", "Member")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40 bg-white/8 border-white/15 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("Të gjithë", "All")}</SelectItem>
            <SelectItem value="job_seeker">{t("Punëkërkues", "Job Seeker")}</SelectItem>
            <SelectItem value="employer">{t("Punëdhënës", "Employer")}</SelectItem>
            <SelectItem value="recruiter">{t("Rekrutues", "Recruiter")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(parseInt(v))}>
          <SelectTrigger className="w-24 bg-white/8 border-white/15 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isMobile ? (
        <div className="space-y-2">
          {paginatedMembers.map((member) => (
            <Card 
              key={member.id}
              className="bg-white/8 border-white/15 cursor-pointer hover:bg-white/12 transition-colors"
              onClick={() => onSelectMember(member)}
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-white/90 font-medium text-sm">
                      {member.first_name && member.surname
                        ? `${member.first_name} ${member.surname}`
                        : member.first_name || member.full_name || member.email}
                    </span>
                    {activeSubs.some(s => s.user_email === member.email) && (
                      <Crown className="w-3.5 h-3.5 text-yellow-400" />
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {member.flag_color === "yellow" && <Flag className="w-3 h-3 text-yellow-500" />}
                    {member.flag_color === "red" && <Flag className="w-3 h-3 text-red-500" />}
                    {member.is_online && (
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Badge className="text-xs bg-white/15 text-white/85 border-white/30">
                    {member.user_type === 'job_seeker' ? t('Punëkërkues', 'Job Seeker') :
                     member.user_type === 'employer' ? t('Punëdhënës', 'Employer') :
                     member.user_type === 'recruiter' ? t('Rekrutues', 'Recruiter') : '-'}
                  </Badge>
                  <Badge className={`text-xs ${
                    member.role === 'admin' ? 'bg-red-500/25 text-red-300 border-red-500/40' :
                    member.role === 'moderator' ? 'bg-blue-500/25 text-blue-300 border-blue-500/40' :
                    member.role === 'inspector' ? 'bg-purple-500/25 text-purple-300 border-purple-500/40' :
                    'bg-white/15 text-white/85 border-white/30'
                  }`}>
                    {member.role === 'admin' ? 'Admin' :
                     member.role === 'moderator' ? 'Moderator' :
                     member.role === 'inspector' ? 'Inspektor' :
                     t('Anëtar', 'Member')}
                  </Badge>
                </div>
                <p className="text-white/60 text-xs">{member.last_seen ? moment(member.last_seen).fromNow() : '-'}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-white/15 overflow-hidden bg-white/8">
          <table className="w-full">
            <thead className="bg-white/15 border-b border-white/10">
              <tr>
                <th className="px-4 py-3 text-left">
                  <button onClick={() => toggleSort("first_name")} className="flex items-center gap-1 text-white/90 text-xs font-medium hover:text-white">
                    {t("Emri", "Name")}
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button onClick={() => toggleSort("user_type")} className="flex items-center gap-1 text-white/90 text-xs font-medium hover:text-white">
                    {t("Lloji", "Type")}
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button onClick={() => toggleSort("role")} className="flex items-center gap-1 text-white/90 text-xs font-medium hover:text-white">
                    {t("Roli", "Role")}
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button onClick={() => toggleSort("last_seen")} className="flex items-center gap-1 text-white/90 text-xs font-medium hover:text-white">
                    {t("Aktiv", "Active")}
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-white/90 text-xs font-medium">
                  {t("Status", "Status")}
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedMembers.map((member) => (
                <tr
                  key={member.id}
                  onClick={() => onSelectMember(member)}
                  className="border-t border-white/10 hover:bg-white/15 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-white/90 text-sm font-medium">
                        {member.first_name && member.surname
                          ? `${member.first_name} ${member.surname}`
                          : member.first_name || member.full_name || member.email}
                      </span>
                      {activeSubs.some(s => s.user_email === member.email) && (
                        <Crown className="w-3.5 h-3.5 text-yellow-400" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-white/90 text-xs">
                      {member.user_type === 'job_seeker' ? t('Punëkërkues', 'Job Seeker') :
                       member.user_type === 'employer' ? t('Punëdhënës', 'Employer') :
                       member.user_type === 'recruiter' ? t('Rekrutues', 'Recruiter') : '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={
                      member.role === 'admin' ? 'bg-red-500/25 text-red-300 border-red-500/40' :
                      member.role === 'moderator' ? 'bg-blue-500/25 text-blue-300 border-blue-500/40' :
                      member.role === 'inspector' ? 'bg-purple-500/25 text-purple-300 border-purple-500/40' :
                      'bg-white/15 text-white/85 border-white/30'
                    }>
                      {member.role === 'admin' ? 'Admin' :
                       member.role === 'moderator' ? 'Moderator' :
                       member.role === 'inspector' ? 'Inspektor' :
                       t('Anëtar', 'Member')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-white/80 text-xs">
                      {member.last_seen ? moment(member.last_seen).fromNow() : '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {member.flag_color === "yellow" && <Flag className="w-3 h-3 text-yellow-500" />}
                      {member.flag_color === "red" && <Flag className="w-3 h-3 text-red-500" />}
                      {member.is_online && (
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-white/75 text-xs">
          {t(`Duke shfaqur ${((page - 1) * pageSize) + 1}-${Math.min(page * pageSize, filteredMembers.length)} nga ${filteredMembers.length}`,
             `Showing ${((page - 1) * pageSize) + 1}-${Math.min(page * pageSize, filteredMembers.length)} of ${filteredMembers.length}`)}
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="border-white/10 text-white hover:bg-white/10"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-white/80 text-sm px-3 py-1">
            {page} / {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="border-white/10 text-white hover:bg-white/10"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
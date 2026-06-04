import React, { useState, useEffect } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import UserAvatar from "@/components/ui/UserAvatar";
import { Users, MessageCircle, Send, X, Loader2, Circle, Flag, Shield, UserCog, Crown, CheckCircle, Briefcase, SlidersHorizontal, MoreHorizontal, Eye } from "lucide-react";
import { motion } from "framer-motion";
import moment from "moment";
import { Link } from "react-router-dom";
import AdvancedMemberTable from "../components/members/AdvancedMemberTable";

export default function Members() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("online");
  const [selectedUser, setSelectedUser] = useState(null);
  const [message, setMessage] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [skillsFilter, setSkillsFilter] = useState("");
  const [languageFilter, setLanguageFilter] = useState("");
  const [experienceFilter, setExperienceFilter] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [language, setLanguage] = useState('sq');
  const queryClient = useQueryClient();

  useEffect(() => {
    const savedLang = localStorage.getItem('language') || 'sq';
    setLanguage(savedLang);
  }, []);

  const t = (sq, en) => language === 'sq' ? sq : en;

  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = await base44.auth.isAuthenticated();
      if (authenticated) {
        const me = await base44.auth.me();
        setUser(me);
      }
    };
    checkAuth();
  }, []);

  const { data: allUsers = [], isLoading } = useQuery({
    queryKey: ["allUsers"],
    queryFn: () => base44.entities.User.list("-last_seen", 500),
    refetchInterval: 10000,
  });

  const { data: activeSubs = [] } = useQuery({
    queryKey: ["activeSubscriptions"],
    queryFn: async () => {
      const subs = await base44.entities.PremiumSubscription.filter({ is_active: true });
      const now = new Date();
      return subs.filter(s => new Date(s.end_date) > now);
    }
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["chatMessages", selectedUser?.email],
    queryFn: () => {
      if (!selectedUser) return [];
      return base44.entities.ChatMessage.filter({
        $or: [
          { sender_email: user.email, receiver_email: selectedUser.email },
          { sender_email: selectedUser.email, receiver_email: user.email }
        ]
      }, "created_date", 200);
    },
    enabled: !!selectedUser,
    refetchInterval: 3000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.ChatMessage.create({
        sender_email: user.email,
        receiver_email: selectedUser.email,
        message: message,
        is_read: false,
      });
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["chatMessages", selectedUser?.email] });
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (messageId) => {
      await base44.entities.ChatMessage.update(messageId, {
        is_read: true,
        read_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatMessages", selectedUser?.email] });
    },
  });

  const promoteMutation = useMutation({
    mutationFn: async (userEmail) => {
      const moderatorCount = allUsers.filter(u => u.role === 'moderator').length;
      if (moderatorCount >= 7) {
        throw new Error('Maximum 7 moderators allowed');
      }
      await base44.entities.User.update(userEmail, { role: 'moderator' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allUsers"] });
      alert(t('Anëtari u promovua në moderator!', 'Member promoted to moderator!'));
    },
    onError: (error) => {
      alert(error.message);
    }
  });

  const demoteMutation = useMutation({
    mutationFn: async (userEmail) => {
      await base44.entities.User.update(userEmail, { role: 'user' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allUsers"] });
      alert(t('Moderatori u kthye në anëtar të thjeshtë!', 'Moderator demoted to regular member!'));
    }
  });

  useEffect(() => {
    if (selectedUser && messages.length > 0) {
      messages
        .filter(m => m.sender_email === selectedUser.email && !m.is_read)
        .forEach(m => markAsReadMutation.mutate(m.id));
    }
  }, [messages, selectedUser]);

  const isOnline = (member) => {
    if (!member.last_seen) return false;
    if (member.is_online) return true;
    const diff = moment().diff(moment(member.last_seen), 'minutes');
    return diff < 2;
  };

  const filteredUsers = allUsers
    .filter(u => {
      if (tab === "online") return isOnline(u);
      if (tab === "offline") return !isOnline(u);
      return true;
    })
    .filter(u => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      
      if (memberSearch) {
        const q = memberSearch.toLowerCase();
        const searchable = `${u.first_name || ""} ${u.surname || ""} ${u.full_name || ""} ${u.job_title || ""} ${u.country || ""} ${u.city || ""} ${u.birth_country || ""} ${u.bio || ""}`.toLowerCase();
        if (!searchable.includes(q)) return false;
      }

      if (skillsFilter) {
        const q = skillsFilter.toLowerCase();
        const skills = (u.skills || "").toLowerCase();
        if (!skills.includes(q)) return false;
      }

      if (languageFilter) {
        const q = languageFilter.toLowerCase();
        const langs = (u.languages || []).map(l => `${l.language} ${l.level}`.toLowerCase()).join(" ");
        if (!langs.includes(q)) return false;
      }

      if (experienceFilter) {
        const years = parseInt(experienceFilter);
        const userYears = u.years_of_experience || 0;
        if (userYears < years) return false;
      }

      if (industryFilter) {
        const q = industryFilter.toLowerCase();
        const industry = (u.industry || "").toLowerCase();
        if (!industry.includes(q)) return false;
      }

      return true;
    });

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <Users className="w-12 h-12 text-white/20 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white">{t("Kyçu për të vazhduar", "Login to continue")}</h2>
        <p className="text-white/40 mt-2 text-sm">{t("Duhet të jeni i kyçur për të parë anëtarët.", "You must be logged in to view members.")}</p>
      </div>
    );
  }

  const isAdmin = user?.role === "admin";
  const isModerator = user?.role === "moderator";
  const canSeeStaffStatus = isAdmin || isModerator;

  const memberName = (member) => {
    const firstLast = `${member.first_name || ""} ${member.surname || ""}`.trim();
    return (
      member.display_name ||
      member.public_name ||
      member.preferred_name ||
      member.profile_name ||
      member.username ||
      member.full_name ||
      firstLast ||
      member.first_name ||
      member.name ||
      member.email?.split("@")[0] ||
      "Anëtar"
    );
  };

  const memberProfilePath = (member) => member.email ? `/Member/${encodeURIComponent(member.email)}` : "/Members";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8ab4ff]/20 to-[#9bffd6]/20 flex items-center justify-center">
          <Users className="w-5 h-5 text-[#8ab4ff]" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{t("Anëtarët", "Members")}</h1>
          <p className="text-white/40 text-sm">
            {allUsers.length} {t("anëtarë regjistruar", "registered members")} • {t("Menaxho dhe komuniko me anëtarët", "Manage and communicate with members")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Members List */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.06)' }}>
            <div className="p-3 border-b border-white/10 space-y-2">
              {/* Main search row */}
              <div className="flex gap-2">
                <Input
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder={t("Kërko sipas emrit, profesionit, vendit...", "Search by name, profession, location...")}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 text-sm h-9"
                />
                <button
                  onClick={() => setShowFilters(f => !f)}
                  className={`flex-shrink-0 px-2.5 h-9 rounded-lg border transition-all flex items-center gap-1 text-xs font-medium ${showFilters ? "bg-[#8ab4ff]/20 border-[#8ab4ff]/40 text-[#8ab4ff]" : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"}`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Expandable filters — inline grid */}
              {showFilters && (
                <div className="grid grid-cols-2 gap-1.5">
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="border-white/10 bg-white/5 text-white h-8 text-xs">
                      <SelectValue placeholder={t("Roli", "Role")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("Të gjithë", "All")}</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="moderator">Moderator</SelectItem>
                      <SelectItem value="user">{t("Anëtar", "Member")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={languageFilter}
                    onChange={(e) => setLanguageFilter(e.target.value)}
                    placeholder={t("Gjuha...", "Language...")}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40 h-8 text-xs"
                  />
                  <Input
                    value={industryFilter}
                    onChange={(e) => setIndustryFilter(e.target.value)}
                    placeholder={t("Industria...", "Industry...")}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40 h-8 text-xs"
                  />
                  <Input
                    value={skillsFilter}
                    onChange={(e) => setSkillsFilter(e.target.value)}
                    placeholder={t("Aftësitë...", "Skills...")}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40 h-8 text-xs"
                  />
                  <Input
                    value={experienceFilter}
                    onChange={(e) => setExperienceFilter(e.target.value)}
                    placeholder={t("Përvojë min (vite)", "Min exp (years)")}
                    type="number"
                    min="0"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40 h-8 text-xs col-span-2"
                  />
                </div>
              )}
            </div>

            <Tabs value={tab} onValueChange={setTab} className="px-4 pt-4">
              <TabsList className="bg-white/5 w-full">
                <TabsTrigger value="online" className="flex-1 text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10">
                  {t("Online", "Online")} ({allUsers.filter(u => isOnline(u)).length})
                </TabsTrigger>
                <TabsTrigger value="offline" className="flex-1 text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10">
                  {t("Offline", "Offline")}
                </TabsTrigger>
                <TabsTrigger value="table" className="flex-1 text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10">
                  {t("Tabela", "Table")}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {tab === "table" ? (
              <div className="p-4">
                <AdvancedMemberTable
                  members={filteredUsers}
                  onSelectMember={setSelectedUser}
                  activeSubs={activeSubs}
                  language={language}
                />
              </div>
            ) : (
              <div className="max-h-[600px] overflow-y-auto p-4 space-y-2">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <p className="text-white/30 text-sm text-center py-8">{t("Asnjë anëtar", "No members")}</p>
              ) : (
                filteredUsers.map((member) => (
                  <div
                    key={member.id}
                    className={`w-full rounded-xl border transition-all ${
                      selectedUser?.id === member.id
                        ? "bg-white/15 border border-[#8ab4ff]/30"
                        : "bg-white/5 border border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-3 p-3">
                      <div className="relative">
                        <UserAvatar name={memberName(member)} email={member.email} photoUrl={member.profile_photo_url} size={40} />
                        {isOnline(member) && (
                          <Circle className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 fill-green-500 text-green-500" />
                        )}
                      </div>
                      <Link
                        to={memberProfilePath(member)}
                        className="min-w-0 flex-1 text-left"
                      >
                       <div className="flex items-center gap-2 flex-wrap">
                         <p className="text-white text-sm font-medium truncate">
                           {memberName(member)}
                         </p>
                         {member.is_verified && (
                           <CheckCircle className="w-3.5 h-3.5 text-green-400" title="Verifikuar" />
                         )}
                         {(member.user_type === 'employer' || member.user_type === 'recruiter') && (
                           <Briefcase className="w-3.5 h-3.5 text-orange-400" title="Punëdhënës" />
                         )}
                         {activeSubs.some(s => s.user_email === member.email) && (
                           <Crown className="w-3.5 h-3.5 text-yellow-400" title="Premium" />
                         )}
                         {member.member_category === 'privileged' && (
                           <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[10px]">Privilegjuar</Badge>
                         )}
                         {member.member_category === 'leader' && (
                           <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-[10px]">Udhëheqës</Badge>
                         )}
                         {canSeeStaffStatus && member.role === 'moderator' && (
                           <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-[10px]">Moderator</Badge>
                         )}
                         {canSeeStaffStatus && member.role === 'admin' && (
                           <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-[10px]">Admin</Badge>
                         )}
                         {member.flag_color === "yellow" && <Flag className="w-3 h-3 text-yellow-500" />}
                         {member.flag_color === "red" && <Flag className="w-3 h-3 text-red-500" />}
                         </div>
                         <p className="text-white/40 text-xs truncate">
                         {member.user_type === 'job_seeker' ? t('Punëkërkues', 'Job Seeker') :
                          member.user_type === 'employer' ? t('Punëdhënës', 'Employer') :
                          member.user_type === 'recruiter' ? t('Rekrutues', 'Recruiter') :
                          t('Përdorues', 'User')}
                         </p>
                      </Link>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                            aria-label="Veprime për anëtarin"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 border-white/10 bg-[#0b1020] text-white">
                          <DropdownMenuItem asChild className="cursor-pointer text-white/85">
                            <Link to={memberProfilePath(member)}>
                              <Eye className="h-4 w-4" /> Shiko profilin
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer text-white/85"
                            onClick={() => setSelectedUser(member)}
                          >
                            <MessageCircle className="h-4 w-4" /> Shkruaj mesazh
                          </DropdownMenuItem>
                          {canSeeStaffStatus && (
                            <>
                              <DropdownMenuSeparator className="bg-white/10" />
                              <DropdownMenuItem disabled className="text-white/45">
                                <Shield className="h-4 w-4" />
                                {member.role === "admin" ? "Admin" : member.role === "moderator" ? "Moderator" : "Anëtar"}
                              </DropdownMenuItem>
                            </>
                          )}
                          {isAdmin && member.role === 'user' && (
                            <DropdownMenuItem
                              className="cursor-pointer text-[#8ab4ff]"
                              onClick={() => {
                                if (confirm(t('A jeni të sigurt që dëshironi ta promovoni këtë anëtar në moderator?', 'Are you sure you want to promote this member to moderator?'))) {
                                  promoteMutation.mutate(member.email);
                                }
                              }}
                            >
                              <UserCog className="h-4 w-4" /> Promovo në Moderator
                            </DropdownMenuItem>
                          )}
                          {isAdmin && member.role === 'moderator' && (
                            <DropdownMenuItem
                              className="cursor-pointer text-orange-300"
                              onClick={() => {
                                if (confirm(t('A jeni të sigurt që dëshironi ta hiqni këtë anëtar nga moderatorët?', 'Are you sure you want to remove this moderator?'))) {
                                  demoteMutation.mutate(member.email);
                                }
                              }}
                            >
                              <Shield className="h-4 w-4" /> Hiq Moderatorin
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))
              )}
              </div>
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div className="lg:col-span-2">
          {selectedUser ? (
            <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.06)' }}>
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#8ab4ff] to-[#9bffd6] flex items-center justify-center">
                        <span className="text-[#0b1020] font-bold">
                          {memberName(selectedUser)[0].toUpperCase()}
                        </span>
                      </div>
                      {isOnline(selectedUser) && (
                        <Circle className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 fill-green-500 text-green-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        {memberName(selectedUser)}
                      </p>
                      <p className="text-white/40 text-xs">
                        {isOnline(selectedUser) 
                          ? "Online" 
                          : `Aktiv ${moment(selectedUser.last_seen).fromNow()}`}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedUser(null)} 
                    aria-label="Close chat"
                    className="text-white/40 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-2">
                   {isAdmin && selectedUser?.role === 'user' && (
                    <Button
                      onClick={() => {
                        if (confirm(t('A jeni të sigurt që dëshironi ta promovoni këtë anëtar në moderator?', 'Are you sure you want to promote this member to moderator?'))) {
                          promoteMutation.mutate(selectedUser.email);
                        }
                      }}
                      disabled={promoteMutation.isPending}
                      size="sm"
                      className="w-full bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020]"
                    >
                      <UserCog className="w-3 h-3 mr-1" />
                      {t('Promovo në Moderator', 'Promote to Moderator')}
                    </Button>
                  )}

                  {isAdmin && selectedUser?.role === 'moderator' && (
                    <Button
                      onClick={() => {
                        if (confirm(t('A jeni të sigurt që dëshironi ta hiqni këtë anëtar nga moderatorët?', 'Are you sure you want to remove this moderator?'))) {
                          demoteMutation.mutate(selectedUser.email);
                        }
                      }}
                      disabled={demoteMutation.isPending}
                      size="sm"
                      variant="outline"
                      className="w-full text-orange-400 border-orange-400/50 hover:bg-orange-400/10"
                    >
                      <Shield className="w-3 h-3 mr-1" />
                      {t('Hiq Moderatorin', 'Remove Moderator')}
                    </Button>
                  )}
                </div>
              </div>

              <div className="h-[500px] overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <p className="text-white/30 text-sm text-center py-20">{t("Asnjë mesazh ende", "No messages yet")}</p>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.sender_email === user.email;
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`max-w-[70%] ${isMine ? "bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6]" : "bg-white/10"} rounded-2xl px-4 py-2.5`}>
                          <p className={`text-sm ${isMine ? "text-[#0b1020]" : "text-white"}`}>{msg.message}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className={`text-xs ${isMine ? "text-[#0b1020]/60" : "text-white/40"}`}>
                              {moment(msg.created_date).format("HH:mm")}
                            </p>
                            {isMine && msg.is_read && (
                              <p className="text-xs text-[#0b1020]/60">✓✓ {t("Lexuar", "Read")}</p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>

              <div className="p-4 border-t border-white/10">
                <div className="flex gap-2">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && message.trim() && sendMessageMutation.mutate()}
                    placeholder={t("Shkruaj mesazh...", "Write a message...")}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/70"
                  />
                  <Button
                    onClick={() => sendMessageMutation.mutate()}
                    disabled={!message.trim() || sendMessageMutation.isPending}
                    className="bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] hover:opacity-90"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 h-[600px] flex items-center justify-center" style={{ background: 'rgba(255, 255, 255, 0.06)' }}>
              <div className="text-center">
                <MessageCircle className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <p className="text-white/40">{t("Zgjidh një anëtar për të filluar chat-in", "Select a member to start chatting")}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Mail, MapPin, Calendar, Shield, Edit2, Save, X, Loader2, Activity, Zap, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import moment from "moment";

export default function UserProfiles() {
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = await base44.auth.isAuthenticated();
      if (authenticated) {
        const me = await base44.auth.me();
        if (me?.role !== 'admin' && me?.role !== 'moderator') {
          window.location.href = '/';
        }
        setUser(me);
      } else {
        window.location.href = '/';
      }
    };
    checkAuth();
  }, []);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list("-created_date", 500),
    enabled: !!user
  });

  const { data: userActivities = [] } = useQuery({
    queryKey: ["userActivities", selectedUser?.id],
    queryFn: () => base44.entities.UserActivity?.list?.("-created_date", 50) || Promise.resolve([]),
    enabled: !!selectedUser?.id
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ email, data }) => base44.asServiceRole.entities.User.update(email, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setEditingUser(null);
    }
  });

  const handleEditUser = (user) => {
    setEditingUser(user.id);
    setEditForm({
      role: user.role,
      member_category: user.member_category,
      flag_color: user.flag_color
    });
  };

  const handleSaveEdit = () => {
    updateUserMutation.mutate({
      email: selectedUser.email,
      data: editForm
    });
  };

  const handleAnalyzeUser = async () => {
    setLoadingAnalysis(true);
    try {
      const result = await base44.functions.invoke('analyzeUserBehavior', {
        user_email: selectedUser.email
      });
      setAiAnalysis(result.data.analysis);
    } catch (error) {
      console.error('Error analyzing user:', error);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = !searchTerm || 
      u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (!user?.role?.includes('admin') && user?.role !== 'moderator') {
    return <div className="text-center py-20 text-white">Nuk keni akses në këtë faqe</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight">Profilet e Përdoruesve</h1>
        <p className="text-white/50 mt-1">Menaxhoni përdoruesit, rolet dhe preferencat e njoftimeve</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Users List */}
        <div className="lg:col-span-1">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-lg">Përdoruesit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 w-4 h-4 text-white/40" />
                <Input
                  placeholder="Kërko..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 bg-white/5 border-white/10 text-white"
                />
              </div>

              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Të gjitha rolet</SelectItem>
                  <SelectItem value="user">Përdorues</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="inspector">Inspektori</SelectItem>
                </SelectContent>
              </Select>

              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {isLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-5 h-5 animate-spin text-white/40" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-white/40 text-sm text-center py-8">Nuk ka përdorues</div>
                ) : (
                  filteredUsers.map(u => (
                    <motion.button
                      key={u.id}
                      onClick={() => setSelectedUser(u)}
                      className={`w-full text-left p-2 rounded-lg transition-all ${
                        selectedUser?.id === u.id
                          ? 'bg-white/10 border border-white/20'
                          : 'hover:bg-white/5 border border-white/10'
                      }`}
                    >
                      <div className="text-white/80 text-sm font-medium truncate">{u.full_name}</div>
                      <div className="text-white/40 text-xs truncate">{u.email}</div>
                      <Badge className="mt-1 text-xs">{u.role}</Badge>
                    </motion.button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Details */}
        {selectedUser && (
          <div className="lg:col-span-3 space-y-6">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-white">{selectedUser.full_name}</CardTitle>
                  <Badge className="bg-blue-500/20 text-blue-400">{selectedUser.role}</Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-white/40 text-xs">Email</div>
                      <div className="flex items-center gap-2 text-white mt-1">
                        <Mail className="w-4 h-4" />
                        {selectedUser.email}
                      </div>
                    </div>
                    <div>
                      <div className="text-white/40 text-xs">Vendndodhja</div>
                      <div className="flex items-center gap-2 text-white mt-1">
                        <MapPin className="w-4 h-4" />
                        {selectedUser.location || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-white/40 text-xs">Anëtarë Nga</div>
                      <div className="flex items-center gap-2 text-white mt-1">
                        <Calendar className="w-4 h-4" />
                        {moment(selectedUser.created_date).format('D MMM YYYY')}
                      </div>
                    </div>
                    <div>
                      <div className="text-white/40 text-xs">Hera e Fundit Online</div>
                      <div className="text-white mt-1 text-sm">
                        {selectedUser.last_seen ? moment(selectedUser.last_seen).fromNow() : 'Nuk është online'}
                      </div>
                    </div>
                  </div>

                  {/* Role & Preferences Management */}
                  <div className="border-t border-white/10 pt-4 mt-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-white font-semibold flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Roli & Preferencat
                      </h3>
                      {editingUser !== selectedUser.id && (
                        <Button
                          onClick={() => handleEditUser(selectedUser)}
                          size="sm"
                          variant="ghost"
                          className="text-white/60 hover:text-white"
                        >
                          <Edit2 className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      )}
                    </div>

                    {editingUser === selectedUser.id ? (
                      <div className="space-y-4 p-4 bg-white/5 rounded-lg">
                        <div>
                          <label className="text-white/60 text-xs">Roli</label>
                          <Select value={editForm.role} onValueChange={(val) => setEditForm({ ...editForm, role: val })}>
                            <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">Përdorues</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="moderator">Moderator</SelectItem>
                              <SelectItem value="inspector">Inspektori</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-white/60 text-xs">Kategoria Anëtari</label>
                          <Select value={editForm.member_category} onValueChange={(val) => setEditForm({ ...editForm, member_category: val })}>
                            <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="standard">Standard</SelectItem>
                              <SelectItem value="privileged">Privilegued</SelectItem>
                              <SelectItem value="leader">Lider</SelectItem>
                              <SelectItem value="moderator">Moderator</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-white/60 text-xs">Flamur Paralajmërimi</label>
                          <Select value={editForm.flag_color} onValueChange={(val) => setEditForm({ ...editForm, flag_color: val })}>
                            <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Asnjë</SelectItem>
                              <SelectItem value="yellow">Verbalim</SelectItem>
                              <SelectItem value="red">Bllokad</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={handleSaveEdit}
                            size="sm"
                            disabled={updateUserMutation.isPending}
                            className="flex-1 bg-green-500/20 text-green-400 hover:bg-green-500/30"
                          >
                            <Save className="w-4 h-4 mr-1" />
                            Ruaj
                          </Button>
                          <Button
                            onClick={() => setEditingUser(null)}
                            size="sm"
                            variant="ghost"
                            className="flex-1"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Anulo
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-white/60">Roli:</span>
                          <Badge>{selectedUser.role}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Kategoria:</span>
                          <Badge className="bg-purple-500/20 text-purple-400">{selectedUser.member_category}</Badge>
                        </div>
                        {selectedUser.flag_color !== 'none' && (
                          <div className="flex justify-between">
                            <span className="text-white/60">Flamur:</span>
                            <Badge className={selectedUser.flag_color === 'yellow' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}>
                              {selectedUser.flag_color === 'yellow' ? 'Verbalim' : 'Bllokad'}
                            </Badge>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* AI Suggestions */}
            {aiAnalysis && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Zap className="w-5 h-5 text-yellow-400" />
                      Sugjerime AI
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-white/60 text-xs font-semibold mb-2">Përmbledhje:</p>
                      <p className="text-white/80">{aiAnalysis.summary}</p>
                    </div>

                    {aiAnalysis.suggestions?.length > 0 && (
                      <div>
                        <p className="text-white/60 text-xs font-semibold mb-2">Sugjerime për Përmirësim:</p>
                        <ul className="space-y-1">
                          {aiAnalysis.suggestions.map((sugg, i) => (
                            <li key={i} className="text-white/80 text-sm flex items-start gap-2">
                              <span className="text-[#8ab4ff] mt-0.5">→</span>
                              {sugg}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {aiAnalysis.risk_flags?.length > 0 && (
                      <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                        <p className="text-red-400 text-xs font-semibold mb-2 flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4" />
                          Shenjat e Rrezikut:
                        </p>
                        <ul className="space-y-1">
                          {aiAnalysis.risk_flags.map((flag, i) => (
                            <li key={i} className="text-red-400/80 text-sm">• {flag}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <Badge className={
                      aiAnalysis.recommendation_priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                      aiAnalysis.recommendation_priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                      aiAnalysis.recommendation_priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-green-500/20 text-green-400'
                    }>
                      Prioriteti: {aiAnalysis.recommendation_priority?.toUpperCase()}
                    </Badge>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* AI Analysis Button */}
            {!aiAnalysis && (
              <Button
                onClick={handleAnalyzeUser}
                disabled={loadingAnalysis}
                className="w-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 hover:from-yellow-500/30 hover:to-orange-500/30 border border-yellow-500/30"
              >
                {loadingAnalysis ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Po analizohet...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Analizo me AI
                  </>
                )}
              </Button>
            )}

            {/* Activity History */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Historia e Aktivitetit
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {userActivities?.length > 0 ? (
                      userActivities.map(activity => (
                        <div key={activity.id} className="p-3 bg-white/5 rounded-lg border border-white/10">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="text-white/80 text-sm">{activity.action}</div>
                              <div className="text-white/40 text-xs mt-1">{activity.details}</div>
                            </div>
                            <div className="text-white/40 text-xs">
                              {moment(activity.created_date).fromNow()}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-white/40 text-center py-8">Nuk ka aktivitet të regjistruar</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
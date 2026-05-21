import React, { useState, useEffect } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, Send, Loader2, Search, User, RotateCcw, Trash2, Shield, Copy, Paperclip, Archive, ArchiveRestore, CheckCircle, Crown, AlertCircle, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

export default function Messages() {
  const [user, setUser] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [messageSearchQuery, setMessageSearchQuery] = useState("");
  const [archivedConversations, setArchivedConversations] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [activeTab, setActiveTab] = useState("conversations");
  const [staffMessage, setStaffMessage] = useState("");
  const [autocorrectEnabled, setAutocorrectEnabled] = useState(true);
  const queryClient = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  const toEmail = urlParams.get("to");

  useEffect(() => {
    let cancelled = false;
    const loadUser = async () => {
      setAuthLoading(true);
      setAuthError("");
      try {
        const authenticated = await base44.auth.isAuthenticated();
        if (!authenticated) {
          base44.auth.redirectToLogin();
          return;
        }
        const me = await base44.auth.me();
        if (!cancelled) setUser(me);
      } catch (error) {
        console.warn("Messages auth restore failed", error);
        if (!cancelled) setAuthError(error.message || "Nuk u hap sesioni i mesazheve.");
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    };
    loadUser();
    return () => { cancelled = true; };
  }, []);

  const {
    data: messages = [],
    isLoading: messagesLoading,
    isError: messagesError,
    error: messagesLoadError,
    refetch: refetchMessages,
    isFetching: messagesFetching
  } = useQuery({
    queryKey: ["messages", user?.email],
    queryFn: async () => {
      const sent = await base44.entities.ChatMessage.filter({ sender_email: user.email }, "-created_date", 500);
      const received = await base44.entities.ChatMessage.filter({ receiver_email: user.email }, "-created_date", 500);
      return [...sent, ...received].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!user,
    refetchInterval: 5000,
    staleTime: 3000,
  });

  const { data: allUsers = [], isError: usersError } = useQuery({
    queryKey: ["allUsers"],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user
  });

  const { data: activeSubs = [] } = useQuery({
    queryKey: ["activeSubscriptions"],
    queryFn: async () => {
      const subs = await base44.entities.PremiumSubscription.filter({ is_active: true });
      const now = new Date();
      return subs.filter(s => new Date(s.end_date) > now);
    },
    enabled: !!user
  });

  const isStaff = user?.role === 'admin' || user?.role === 'moderator';

  const { data: staffMessages = [], isError: staffMessagesError, refetch: refetchStaffMessages } = useQuery({
    queryKey: ['staffMessages', user?.email],
    queryFn: () => {
      if (isStaff) {
        return base44.entities.StaffMessage.list('-created_date', 100);
      } else {
        return base44.entities.StaffMessage.filter({ sender_email: user.email }, '-created_date', 50);
      }
    },
    enabled: !!user,
    refetchInterval: 5000
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.ChatMessage.create(data);
    },
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    }
  });

  const deleteMessageMutation = useMutation({
    mutationFn: (messageId) => base44.entities.ChatMessage.delete(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });

  const unsendMessageMutation = useMutation({
    mutationFn: (messageId) => base44.entities.ChatMessage.delete(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (messageId) => {
      await base44.entities.ChatMessage.update(messageId, {
        is_read: true,
        read_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    }
  });

  const sendStaffMessageMutation = useMutation({
    mutationFn: (data) => base44.entities.StaffMessage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffMessages'] });
      setStaffMessage("");
    }
  });

  const resolveStaffMessageMutation = useMutation({
    mutationFn: ({ id, response }) => base44.entities.StaffMessage.update(id, {
      is_resolved: true,
      resolved_by: user.email,
      response
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffMessages'] });
    }
  });

  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem(`archived_${user.email}`);
      if (saved) {
        setArchivedConversations(JSON.parse(saved));
      }
    }
  }, [user]);

  useEffect(() => {
    if (toEmail && user && !selectedConversation) {
      setSelectedConversation(toEmail);
    }
  }, [toEmail, user]);

  useEffect(() => {
    if (!selectedConversation || !user || !messages.length) return;
    
    const conversationMessages = messages.filter(msg => 
      (msg.sender_email === selectedConversation && msg.receiver_email === user.email) ||
      (msg.receiver_email === selectedConversation && msg.sender_email === user.email)
    );
    
    const unreadMessages = conversationMessages.filter(
      msg => msg.receiver_email === user.email && !msg.is_read
    );
    
    unreadMessages.forEach(msg => {
      markAsReadMutation.mutate(msg.id);
    });
  }, [selectedConversation, messages.length]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen px-6 text-center">
        <div className="max-w-xs">
          {authLoading ? (
            <>
              <Loader2 className="w-8 h-8 text-[#8ab4ff] animate-spin mx-auto mb-3" />
              <p className="text-white font-semibold">Duke hapur mesazhet...</p>
              <p className="text-white/50 text-sm mt-1">Po rikthejmë sesionin në pajisje.</p>
            </>
          ) : (
            <>
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <p className="text-white font-semibold">Mesazhet nuk u hapën.</p>
              <p className="text-white/50 text-sm mt-1">{authError || "Ju lutemi provoni përsëri."}</p>
              <div className="mt-4 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-white"
                >
                  Rifresko
                </button>
                <button
                  type="button"
                  onClick={() => base44.auth.redirectToLogin()}
                  className="rounded-lg border border-[#8ab4ff]/40 bg-[#8ab4ff]/15 px-3 py-2 text-sm font-semibold text-[#8ab4ff]"
                >
                  Hyr përsëri
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  const conversations = {};
  messages.forEach(msg => {
    if (msg.deleted_for?.includes(user.email)) return;
    
    const otherEmail = msg.sender_email === user.email ? msg.receiver_email : msg.sender_email;
    if (!conversations[otherEmail]) {
      conversations[otherEmail] = [];
    }
    conversations[otherEmail].push(msg);
  });

  const conversationList = Object.entries(conversations).map(([email, msgs]) => {
    const latestMsg = msgs[0];
    const unreadCount = msgs.filter(m => m.receiver_email === user.email && !m.is_read).length;
    const otherUser = allUsers.find(u => u.email === email);
    return { email, messages: msgs, latestMessage: latestMsg, unreadCount, otherUser };
  }).sort((a, b) => new Date(b.latestMessage.created_date) - new Date(a.latestMessage.created_date));

  const activeConversations = conversationList.filter(conv => !archivedConversations.includes(conv.email));
  const archivedConvList = conversationList.filter(conv => archivedConversations.includes(conv.email));
  
  const displayConversations = showArchived ? archivedConvList : activeConversations;
  
  const filteredConversations = displayConversations.filter(conv => 
    !searchQuery || conv.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedMessages = selectedConversation 
    ? (conversations[selectedConversation]?.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)) || [])
        .filter(msg => !messageSearchQuery || msg.message.toLowerCase().includes(messageSearchQuery.toLowerCase()))
    : [];

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedConversation) return;
    
    sendMessageMutation.mutate({
      sender_email: user.email,
      receiver_email: selectedConversation,
      message: messageText
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedConversation) return;

    try {
      setUploadingFile(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      await sendMessageMutation.mutateAsync({
        sender_email: user.email,
        receiver_email: selectedConversation,
        message: file.type.startsWith('image/') ? `📷 ${file.name}` : `📎 ${file.name}`,
        file_url: file_url,
        file_name: file.name,
        file_type: file.type
      });
      
      e.target.value = '';
      setUploadingFile(false);
    } catch (error) {
      alert('Error uploading file: ' + error.message);
      setUploadingFile(false);
    }
  };

  const handleCopyMessage = (text) => {
    navigator.clipboard.writeText(text);
    alert('Message copied!');
  };

  const handleUnsendMessage = (messageId, messageDate) => {
    const now = new Date();
    const sentTime = new Date(messageDate);
    const diffMinutes = (now - sentTime) / 1000 / 60;
    
    if (diffMinutes <= 2) {
      if (confirm('Are you sure you want to unsend this message?')) {
        unsendMessageMutation.mutate(messageId);
      }
    } else {
      alert('You can only unsend messages sent within the last 2 minutes.');
    }
  };

  const handleDeleteMessage = (messageId) => {
    if (confirm('Are you sure you want to delete this message?')) {
      deleteMessageMutation.mutate(messageId);
    }
  };

  const handleDeleteAllMessages = () => {
    if (confirm('Are you sure you want to delete all messages?')) {
      const messagesToDelete = [...messages];
      Promise.all(messagesToDelete.map(msg => base44.entities.ChatMessage.delete(msg.id)))
        .then(() => queryClient.invalidateQueries({ queryKey: ['messages'] }));
    }
  };

  const handleArchiveConversation = (email) => {
    const archived = [...archivedConversations, email];
    setArchivedConversations(archived);
    localStorage.setItem(`archived_${user.email}`, JSON.stringify(archived));
    if (selectedConversation === email) {
      setSelectedConversation(null);
    }
  };

  const handleUnarchiveConversation = (email) => {
    const archived = archivedConversations.filter(e => e !== email);
    setArchivedConversations(archived);
    localStorage.setItem(`archived_${user.email}`, JSON.stringify(archived));
  };

  const handleDeleteConversation = (email) => {
    if (confirm('Are you sure you want to delete this entire conversation?')) {
      const conversationMessages = conversations[email] || [];
      Promise.all(conversationMessages.map(msg => base44.entities.ChatMessage.delete(msg.id)))
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['messages'] });
          if (selectedConversation === email) {
            setSelectedConversation(null);
          }
        });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white tracking-tight">Mesazhet</h1>
        <p className="text-white/50 mt-1">Bisedo me anëtarë dhe stafin</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="bg-white/5 border-white/10">
          <TabsTrigger value="conversations" className="data-[state=active]:bg-white/10">
            <MessageCircle className="w-4 h-4 mr-2" />
            Bisedat
          </TabsTrigger>
          <TabsTrigger value="staff" className="data-[state=active]:bg-white/10">
            <Shield className="w-4 h-4 mr-2" />
            {isStaff ? "Mesazhet nga përdoruesit" : "Chat me Stafin"}
          </TabsTrigger>

        </TabsList>

        <TabsContent value="conversations" className="mt-6">

      {(messagesError || usersError) && (
        <div className="mb-4 rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Mesazhet nuk u ngarkuan plotësisht.</p>
              <p className="text-red-100/75">{messagesLoadError?.message || "Kontrolloni lidhjen dhe provoni përsëri."}</p>
              <button
                type="button"
                onClick={() => refetchMessages()}
                disabled={messagesFetching}
                className="mt-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                {messagesFetching ? "Duke provuar..." : "Provo përsëri"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="mb-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search conversations..."
                  className="pl-9 bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowArchived(false)}
                  variant="ghost"
                  size="sm"
                  className={`flex-1 ${!showArchived ? 'bg-white/10 text-white' : 'text-white/60'}`}
                >
                  Active ({activeConversations.length})
                </Button>
                <Button
                  onClick={() => setShowArchived(true)}
                  variant="ghost"
                  size="sm"
                  className={`flex-1 ${showArchived ? 'bg-white/10 text-white' : 'text-white/60'}`}
                >
                  <Archive className="w-3 h-3 mr-1" />
                  Archived ({archivedConvList.length})
                </Button>
              </div>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {messagesLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 text-[#8ab4ff] animate-spin mx-auto mb-3" />
                  <p className="text-white/50 text-sm">Duke ngarkuar bisedat...</p>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="text-white/40 text-sm">No messages</p>
                </div>
              ) : (
                filteredConversations.map(conv => (
                  <div
                    key={conv.email}
                    className={`p-3 rounded-lg transition-colors group relative ${
                      selectedConversation === conv.email 
                        ? "bg-white/10" 
                        : "bg-white/5 hover:bg-white/8"
                    }`}
                  >
                    <div 
                      onClick={() => setSelectedConversation(conv.email)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <User className="w-4 h-4 text-white/40 flex-shrink-0" />
                          <span className="text-white font-medium text-sm truncate">
                            {conv.otherUser?.first_name && conv.otherUser?.surname 
                              ? `${conv.otherUser.first_name} ${conv.otherUser.surname}`
                              : conv.otherUser?.full_name || conv.email.split('@')[0]}
                          </span>
                          {activeSubs.some(s => s.user_email === conv.email) && (
                            <Crown className="w-3.5 h-3.5 text-yellow-400" title="Premium" />
                          )}
                        </div>
                        {conv.unreadCount > 0 && (
                          <Badge className="bg-[#8ab4ff] text-[#0b1020] text-xs">
                            {conv.unreadCount}
                          </Badge>
                        )}
                      </div>
                      <p className="text-white/50 text-xs truncate">
                        {conv.latestMessage.message}
                      </p>
                    </div>
                    <div className="absolute right-2 top-2 flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                      {showArchived ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleUnarchiveConversation(conv.email); }}
                          className="p-1 rounded bg-white/10 hover:bg-white/20"
                          title="Unarchive"
                        >
                          <ArchiveRestore className="w-3 h-3 text-white" />
                        </button>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleArchiveConversation(conv.email); }}
                          className="p-1 rounded bg-white/10 hover:bg-white/20"
                          title="Archive"
                        >
                          <Archive className="w-3 h-3 text-white" />
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conv.email); }}
                        className="p-1 rounded bg-white/10 hover:bg-white/20"
                        title="Delete conversation"
                      >
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 bg-white/5 border-white/10">
          <CardContent className="p-4 flex flex-col h-[min(700px,calc(100dvh-var(--app-header-height)-120px))] min-h-[480px]">
            {!selectedConversation ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 text-white/20 mx-auto mb-4" />
                  <p className="text-white/40">Select a conversation to start</p>
                </div>
              </div>
            ) : (
              <>
                <div className="pb-4 border-b border-white/10 mb-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedConversation(null)}
                        className="lg:hidden text-white/70 hover:text-white px-2"
                      >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Bisedat
                      </Button>
                      <User className="w-5 h-5 text-white/60" />
                      <span className="text-white font-medium truncate">{selectedConversation.split('@')[0]}</span>
                    </div>
                    <div className="flex gap-2">
                      {archivedConversations.includes(selectedConversation) ? (
                        <Button
                          onClick={() => handleUnarchiveConversation(selectedConversation)}
                          variant="outline"
                          size="sm"
                          className="border-white/10"
                        >
                          <ArchiveRestore className="w-3 h-3 mr-1" />
                          Unarchive
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleArchiveConversation(selectedConversation)}
                          variant="outline"
                          size="sm"
                          className="border-white/10"
                        >
                          <Archive className="w-3 h-3 mr-1" />
                          Archive
                        </Button>
                      )}
                      {(user.role === 'admin' || user.role === 'moderator') && (
                        <Button 
                          onClick={handleDeleteAllMessages} 
                          variant="outline" 
                          size="sm"
                          className="text-red-400 border-red-400/50 hover:bg-red-400/10"
                        >
                          <Shield className="w-3 h-3 mr-1" />
                          Delete all
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40" />
                    <Input
                      value={messageSearchQuery}
                      onChange={(e) => setMessageSearchQuery(e.target.value)}
                      placeholder="Search in messages..."
                      className="pl-8 h-8 bg-white/5 border-white/10 text-white text-sm"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                  <AnimatePresence>
                    {selectedMessages.map((msg, i) => {
                      const isMe = msg.sender_email === user.email;
                      const canUnsend = isMe && ((new Date() - new Date(msg.created_date)) / 1000 / 60) <= 2;
                      const isAdmin = user.role === 'admin' || user.role === 'moderator';
                      
                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.02 }}
                          className={`flex ${isMe ? "justify-end" : "justify-start"} group`}
                        >
                          <div className={`max-w-[70%] rounded-lg p-3 ${
                            isMe 
                              ? "bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020]" 
                              : "bg-white/10 text-white"
                          }`}>
                            {msg.file_url ? (
                              <div className="mb-2">
                                {msg.file_type?.startsWith('image/') ? (
                                  <img src={msg.file_url} alt={msg.file_name} className="max-w-full rounded" />
                                ) : (
                                  <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm underline">
                                    <Paperclip className="w-4 h-4" />
                                    {msg.file_name || 'Download file'}
                                  </a>
                                )}
                              </div>
                            ) : null}
                            <p className="text-sm leading-relaxed">{msg.message}</p>
                            <div className="flex items-center justify-between mt-1">
                              <p className={`text-xs ${isMe ? "text-[#0b1020]/60" : "text-white/40"}`}>
                                {format(new Date(msg.created_date), 'HH:mm • dd/MM/yyyy')}
                              </p>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                                <button
                                  onClick={() => handleCopyMessage(msg.message)}
                                  className="text-xs hover:bg-white/10 p-1 rounded"
                                  title="Copy"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                                {canUnsend && (
                                  <button
                                    onClick={() => handleUnsendMessage(msg.id, msg.created_date)}
                                    className="text-xs hover:bg-white/10 p-1 rounded"
                                    title="Unsend"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                  </button>
                                )}
                                {isAdmin && (
                                  <button
                                    onClick={() => handleDeleteMessage(msg.id)}
                                    className="text-xs hover:bg-white/10 p-1 rounded"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>

                <div className="space-y-2">
                  <div className="flex gap-2">
                    <label className="cursor-pointer">
                      <input 
                        type="file" 
                        className="hidden" 
                        onChange={handleFileUpload}
                        accept="image/*,.pdf,.doc,.docx"
                        disabled={uploadingFile}
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="icon"
                        disabled={uploadingFile}
                        className="bg-white/5 border-white/10 hover:bg-white/10"
                      >
                        {uploadingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                      </Button>
                    </label>
                    <Textarea
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Write a message..."
                      className="bg-white/5 border-white/10 text-white resize-none flex-1"
                      rows={2}
                      lang="sq"
                      spellCheck={autocorrectEnabled}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!messageText.trim() || sendMessageMutation.isPending}
                      className="bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] hover:opacity-90"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={autocorrectEnabled} 
                      onChange={(e) => setAutocorrectEnabled(e.target.checked)}
                      className="w-4 h-4" 
                      id="autocorrect-messages" 
                    />
                    <label htmlFor="autocorrect-messages" className="text-white/40 text-xs cursor-pointer">
                      Autocorrect në shqip
                    </label>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      </TabsContent>

      <TabsContent value="staff" className="mt-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          {!isStaff && (
            <div className="mb-6">
              <h3 className="text-white font-semibold mb-3">Dërgo një mesazh te stafi</h3>
              <Textarea
                value={staffMessage}
                onChange={(e) => setStaffMessage(e.target.value)}
                placeholder="Shkruani mesazhin tuaj këtu..."
                className="bg-white/5 border-white/10 text-white min-h-[120px] mb-2"
                lang="sq"
                spellCheck={autocorrectEnabled}
              />
              <div className="flex items-center gap-2 mb-4">
                <input 
                  type="checkbox" 
                  checked={autocorrectEnabled} 
                  onChange={(e) => setAutocorrectEnabled(e.target.checked)}
                  className="w-4 h-4" 
                  id="autocorrect-staff" 
                />
                <label htmlFor="autocorrect-staff" className="text-white/40 text-xs cursor-pointer">
                  Autocorrect në shqip
                </label>
              </div>
              <Button 
                onClick={() => {
                  if (staffMessage.trim()) {
                    sendStaffMessageMutation.mutate({
                      sender_email: user.email,
                      message: staffMessage,
                      is_resolved: false
                    });
                  }
                }}
                disabled={sendStaffMessageMutation.isPending}
                className="bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020]"
              >
                <Send className="w-4 h-4 mr-2" />
                Dërgo mesazhin
              </Button>
            </div>
          )}

          <div className="space-y-4">
            {staffMessagesError ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-red-400/70 mx-auto mb-3" />
                <p className="text-white/70">Mesazhet e stafit nuk u ngarkuan.</p>
                <Button onClick={() => refetchStaffMessages()} className="mt-3 bg-white/10 text-white">
                  Provo përsëri
                </Button>
              </div>
            ) : staffMessages?.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="w-12 h-12 text-white/40 mx-auto mb-3" />
                <p className="text-white/60">Nuk ka mesazhe ende</p>
              </div>
            ) : (
              staffMessages?.map((msg) => (
                <div key={msg.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-white/40" />
                      <span className="text-white/60 text-sm">{msg.sender_email}</span>
                    </div>
                    <Badge className={msg.is_resolved ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}>
                      {msg.is_resolved ? 'Zgjidhur' : 'Në pritje'}
                    </Badge>
                  </div>
                  <p className="text-white/40 text-xs mb-3">
                    {format(new Date(msg.created_date), "dd/MM/yyyy HH:mm")}
                  </p>
                  <p className="text-white mb-4">{msg.message}</p>
                  
                  {msg.response && (
                    <div className="bg-white/5 p-3 rounded-lg mb-3">
                      <p className="text-white/40 text-xs mb-2">Përgjigja nga {msg.resolved_by}</p>
                      <p className="text-white text-sm">{msg.response}</p>
                    </div>
                  )}

                  {isStaff && !msg.is_resolved && (
                    <div className="mt-3">
                      <Textarea
                        placeholder="Shkruani përgjigjen..."
                        className="bg-white/5 border-white/10 text-white min-h-[80px] mb-2"
                        id={`response-${msg.id}`}
                        lang="sq"
                        spellCheck={autocorrectEnabled}
                      />
                      <Button
                        onClick={() => {
                          const response = document.getElementById(`response-${msg.id}`).value;
                          if (response.trim()) {
                            resolveStaffMessageMutation.mutate({ id: msg.id, response });
                          }
                        }}
                        size="sm"
                        className="bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020]"
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Shëno si të zgjidhur
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </TabsContent>
    </Tabs>
    </div>
  );
}

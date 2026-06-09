import React, { useState, useEffect } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, Send, Loader2, Search, User, RotateCcw, Trash2, Shield, Copy, Paperclip, Archive, ArchiveRestore, CheckCircle, Crown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import AuthAccessBanner from "@/components/AuthAccessBanner";

const ALBANIAN_CORRECTIONS = new Map([
  ["per", "për"],
  ["eshte", "është"],
  ["nje", "një"],
  ["te", "të"],
  ["ne", "në"],
  ["qe", "që"],
  ["dhe", "dhe"],
  ["ju pergezoj", "ju përgëzoj"],
  ["pergezoj", "përgëzoj"],
  ["inisiativen", "iniciativën"],
  ["faleminderit", "faleminderit"],
  ["shqipetare", "shqiptare"],
  ["shqiperia", "Shqipëria"],
  ["mire", "mirë"],
  ["pershendetje", "përshëndetje"],
]);

function autocorrectAlbanianText(text = "") {
  let next = String(text || "");
  for (const [from, to] of ALBANIAN_CORRECTIONS) {
    next = next.replace(new RegExp(`\\b${from}\\b`, "gi"), (match) => {
      if (match === match.toUpperCase()) return to.toUpperCase();
      if (match[0] === match[0].toUpperCase()) return to.charAt(0).toUpperCase() + to.slice(1);
      return to;
    });
  }
  return next.replace(/\s+([,.!?;:])/g, "$1");
}

export default function Messages() {
  const [user, setUser] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [messageSearchQuery, setMessageSearchQuery] = useState("");
  const [archivedConversations, setArchivedConversations] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [activeTab, setActiveTab] = useState("conversations");
  const [staffMessage, setStaffMessage] = useState("");
  const [autocorrectEnabled, setAutocorrectEnabled] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const queryClient = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  const toEmail = urlParams.get("to");

  useEffect(() => {
    const loadUser = async () => {
      try {
        const authenticated = await Promise.race([
          base44.auth.isAuthenticated(),
          new Promise((resolve) => setTimeout(() => resolve(false), 2500))
        ]);
        if (!authenticated) {
          setUser(null);
          return;
        }
        const me = await Promise.race([
          base44.auth.me(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Auth check timed out")), 2500))
        ]);
        setUser(me);
      } catch {
        setUser(null);
      } finally {
        setAuthChecked(true);
      }
    };
    loadUser();
  }, []);

  const { data: messages = [] } = useQuery({
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

  const { data: allUsers = [] } = useQuery({
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

  const { data: staffMessages = [] } = useQuery({
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
      setActiveTab("conversations");
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

  if (!authChecked) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 pb-24">
        <Loader2 className="w-6 h-6 animate-spin text-[#8ab4ff]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 pb-28 pt-8">
        <AuthAccessBanner type="messages" className="w-full max-w-md" />
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
    const cleanMessage = autocorrectEnabled ? autocorrectAlbanianText(messageText).trim() : messageText.trim();
    if (!cleanMessage || !selectedConversation) return;
    
    sendMessageMutation.mutate({
      sender_email: user.email,
      receiver_email: selectedConversation,
      message: cleanMessage
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
              {filteredConversations.length === 0 ? (
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
          <CardContent className="p-4 flex flex-col h-[700px]">
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
                    <div className="flex items-center gap-2">
                      <User className="w-5 h-5 text-white/60" />
                      <span className="text-white font-medium">{selectedConversation.split('@')[0]}</span>
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
                      onBlur={() => autocorrectEnabled && setMessageText((text) => autocorrectAlbanianText(text))}
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
                onBlur={() => autocorrectEnabled && setStaffMessage((text) => autocorrectAlbanianText(text))}
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
                  const cleanMessage = autocorrectEnabled ? autocorrectAlbanianText(staffMessage).trim() : staffMessage.trim();
                  if (cleanMessage) {
                    sendStaffMessageMutation.mutate({
                      sender_email: user.email,
                      message: cleanMessage,
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
            {staffMessages?.length === 0 ? (
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

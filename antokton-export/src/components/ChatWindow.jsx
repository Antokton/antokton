import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Minus, MessageCircle, Send, Circle, Loader2, Edit2, Trash2, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import moment from "moment";

export default function ChatWindow({ user, onClose }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [message, setMessage] = useState("");
  const [isMinimized, setIsMinimized] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState("");
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const me = await base44.auth.me();
      setCurrentUser(me);
    };
    loadUser();
  }, []);

  const { data: allMessages = [] } = useQuery({
    queryKey: ["chatMessages", user?.email],
    queryFn: async () => {
      if (!user || !currentUser) return [];
      const msgs = await base44.entities.ChatMessage.filter({
        $or: [
          { sender_email: currentUser.email, receiver_email: user.email },
          { sender_email: user.email, receiver_email: currentUser.email }
        ]
      }, "created_date", 200);
      return msgs;
    },
    enabled: !!user && !!currentUser,
    refetchInterval: 3000,
  });

  const messages = allMessages.filter(msg => 
    !msg.deleted_for || !msg.deleted_for.includes(currentUser.email)
  );

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.ChatMessage.create({
        sender_email: currentUser.email,
        receiver_email: user.email,
        message: message,
        is_read: false,
      });
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["chatMessages", user?.email] });
      const previousMessages = queryClient.getQueryData(["chatMessages", user?.email]) || [];
      
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        sender_email: currentUser.email,
        receiver_email: user.email,
        message: message,
        is_read: false,
        created_date: new Date().toISOString(),
        is_edited: false,
      };
      
      queryClient.setQueryData(["chatMessages", user?.email], [...previousMessages, optimisticMessage]);
      setMessage("");
      
      return { previousMessages };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatMessages", user?.email] });
    },
    onError: (_err, _newData, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(["chatMessages", user?.email], context.previousMessages);
      }
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
      queryClient.invalidateQueries({ queryKey: ["chatMessages", user?.email] });
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async ({ messageId, deleteForEveryone }) => {
      const msg = allMessages.find(m => m.id === messageId);
      if (deleteForEveryone) {
        await base44.entities.ChatMessage.delete(messageId);
      } else {
        const deletedFor = msg.deleted_for || [];
        await base44.entities.ChatMessage.update(messageId, {
          deleted_for: [...deletedFor, currentUser.email]
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatMessages", user?.email] });
    },
  });

  const editMessageMutation = useMutation({
    mutationFn: async ({ messageId, newText }) => {
      await base44.entities.ChatMessage.update(messageId, {
        message: newText,
        is_edited: true,
        edited_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      setEditingMessage(null);
      setEditText("");
      queryClient.invalidateQueries({ queryKey: ["chatMessages", user?.email] });
    },
  });

  const canEdit = (msg) => {
    if (msg.sender_email !== currentUser.email) return false;
    const minutesSinceSent = moment().diff(moment(msg.created_date), "minutes");
    return minutesSinceSent < 2;
  };

  useEffect(() => {
    if (user && messages.length > 0 && !isMinimized) {
      messages
        .filter(m => m.sender_email === user.email && !m.is_read)
        .forEach(m => markAsReadMutation.mutate(m.id));
    }
  }, [messages, user, isMinimized]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isOnline = (lastSeen) => {
    if (!lastSeen) return false;
    const diff = moment().diff(moment(lastSeen), 'minutes');
    return diff < 5;
  };

  if (!user || !currentUser) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed left-2 right-2 bottom-[calc(72px+env(safe-area-inset-bottom))] z-50 flex flex-col rounded-2xl border border-white/10 shadow-2xl overflow-hidden sm:left-auto sm:right-4 sm:bottom-4 sm:w-96 sm:max-w-[calc(100vw-2rem)]"
        style={{
          background: 'rgba(11, 16, 32, 0.95)',
          backdropFilter: 'blur(20px)',
          maxHeight: 'min(640px, calc(100dvh - 96px - env(safe-area-inset-bottom)))'
        }}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-[#8ab4ff]/10 to-[#9bffd6]/10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#8ab4ff] to-[#9bffd6] flex items-center justify-center">
                <span className="text-[#0b1020] font-bold text-sm">
                  {(user.first_name || user.full_name || user.email)[0].toUpperCase()}
                </span>
              </div>
              {isOnline(user.last_seen) && (
                <Circle className="absolute -bottom-0.5 -right-0.5 w-3 h-3 fill-green-500 text-green-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm truncate">
                {user.first_name && user.surname 
                  ? `${user.first_name} ${user.surname}`
                  : user.first_name || user.full_name || user.email}
              </p>
              <p className="text-white/40 text-xs">
                {isOnline(user.last_seen) ? "Online" : `Aktiv ${moment(user.last_seen).fromNow()}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              aria-label="Minimize chat"
              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              aria-label="Close chat"
              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        {!isMinimized && (
          <>
            <div className="min-h-[220px] flex-1 overflow-y-auto overscroll-contain p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <MessageCircle className="w-12 h-12 text-white/20 mb-3" />
                  <p className="text-white/40 text-sm">Asnjë mesazh ende</p>
                </div>
              ) : (
                <>
                  {messages.map((msg) => {
                    const isMine = msg.sender_email === currentUser.email;
                    const isEditing = editingMessage === msg.id;
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${isMine ? "justify-end" : "justify-start"} group`}
                      >
                        <div className={`max-w-[75%] ${isMine ? "bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6]" : "bg-white/10"} rounded-2xl px-3 py-2 relative`}>
                          {isEditing ? (
                            <div className="space-y-2">
                              <Input
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="bg-white/20 border-white/20 text-[#0b1020] text-sm h-8"
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => editMessageMutation.mutate({ messageId: msg.id, newText: editText })}
                                  className="h-6 text-xs bg-[#0b1020] text-white"
                                >
                                  <Check className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingMessage(null);
                                    setEditText("");
                                  }}
                                  className="h-6 text-xs text-[#0b1020]"
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className={`text-sm ${isMine ? "text-[#0b1020]" : "text-white"}`}>{msg.message}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <p className={`text-xs ${isMine ? "text-[#0b1020]/60" : "text-white/40"}`}>
                                  {moment(msg.created_date).format("HH:mm")}
                                  {msg.is_edited && " (edituar)"}
                                </p>
                                {isMine && msg.is_read && (
                                  <p className="text-xs text-[#0b1020]/60">✓✓</p>
                                )}
                              </div>
                            </>
                          )}
                          
                          {isMine && !isEditing && (
                            <div className="absolute -left-16 top-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                              {canEdit(msg) && (
                                <button
                                  onClick={() => {
                                    setEditingMessage(msg.id);
                                    setEditText(msg.message);
                                  }}
                                  className="p-1 bg-white/10 rounded hover:bg-white/20 text-white"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  const deleteForAll = confirm("Fshij për të gjithë?");
                                  deleteMessageMutation.mutate({ 
                                    messageId: msg.id, 
                                    deleteForEveryone: deleteForAll 
                                  });
                                }}
                                className="p-1 bg-white/10 rounded hover:bg-white/20 text-white"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                          
                          {!isMine && (
                            <button
                              onClick={() => {
                                deleteMessageMutation.mutate({ 
                                  messageId: msg.id, 
                                  deleteForEveryone: false 
                                });
                              }}
                              className="absolute -right-8 top-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white/10 rounded hover:bg-white/20 text-white"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-white/10">
              <div className="flex gap-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && message.trim() && sendMessageMutation.mutate()}
                  placeholder="Shkruaj mesazh..."
                  className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-500 h-9 text-sm"
                />
                <Button
                  onClick={() => sendMessageMutation.mutate()}
                  disabled={!message.trim() || sendMessageMutation.isPending}
                  size="sm"
                  className="bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] hover:opacity-90 h-9 px-3"
                >
                  {sendMessageMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

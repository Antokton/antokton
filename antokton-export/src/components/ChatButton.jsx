import React, { useState, useEffect } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ChatWindow from "./ChatWindow";

export default function ChatButton() {
  const [user, setUser] = useState(null);
  const [chatUsers, setChatUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    const loadUser = async () => {
      const authenticated = await base44.auth.isAuthenticated();
      if (authenticated) {
        const me = await base44.auth.me();
        setUser(me);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    const loadAllUsers = async () => {
      if (!user) return;
      const users = await base44.entities.User.list();
      setAllUsers(users);
    };
    loadAllUsers();
  }, [user]);

  const { data: unreadMessages = [] } = useQuery({
    queryKey: ["unreadMessages"],
    queryFn: async () => {
      if (!user) return [];
      return await base44.entities.ChatMessage.filter({
        receiver_email: user.email,
        is_read: false,
      }, "-created_date");
    },
    enabled: !!user,
    refetchInterval: 3000,
  });

  // Auto-open chat when admin/moderator sends message
  useEffect(() => {
    if (!user || !unreadMessages.length || !allUsers.length) return;
    
    // Only for regular users (not admin/moderator)
    if (user.role === "admin" || user.role === "moderator") return;

    unreadMessages.forEach(msg => {
      const sender = allUsers.find(u => u.email === msg.sender_email);
      if (sender && (sender.role === "admin" || sender.role === "moderator")) {
        // Check if chat is already open
        if (!chatUsers.find(u => u.email === sender.email)) {
          setChatUsers(prev => [...prev, sender]);
        }
      }
    });
  }, [unreadMessages, allUsers, user]);

  const handleOpenChat = (chatUser) => {
    if (!chatUsers.find(u => u.email === chatUser.email)) {
      setChatUsers([...chatUsers, chatUser]);
    }
  };

  const handleCloseChat = (chatUser) => {
    setChatUsers(chatUsers.filter(u => u.email !== chatUser.email));
  };

  if (!user) return null;

  return (
    <>
      <AnimatePresence>
        {chatUsers.map((chatUser) => (
          <ChatWindow
            key={chatUser.email}
            user={chatUser}
            onClose={() => handleCloseChat(chatUser)}
          />
        ))}
      </AnimatePresence>
    </>
  );
}
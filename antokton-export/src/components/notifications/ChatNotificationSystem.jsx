import React, { useEffect, useState } from "react";
import { base44 } from "@/api/antoktonClient";
import { Bell } from "lucide-react";
import { toast } from "react-hot-toast";

export default function ChatNotificationSystem() {
  const [user, setUser] = useState(null);
  const [lastMessageCount, setLastMessageCount] = useState(0);
  const [settings, setSettings] = useState({
    soundEnabled: true,
    notificationSound: 'default',
    browserNotifications: true,
    volume: 0.5
  });

  useEffect(() => {
    const initUser = async () => {
      const authenticated = await base44.auth.isAuthenticated();
      if (authenticated) {
        const me = await base44.auth.me();
        setUser(me);
      }
    };
    initUser();

    // Load notification settings
    const savedSettings = localStorage.getItem('chat_notification_settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    // Subscribe to new messages
    const unsubscribe = base44.entities.ChatMessage.subscribe(async (event) => {
      if (event.type === 'create' && event.data) {
        const message = event.data;
        
        // Only notify if message is for current user and not sent by them
        if (message.receiver_email === user.email && message.sender_email !== user.email) {
          // Play notification sound if enabled
          if (settings.soundEnabled) {
            try {
              const audioContext = new (window.AudioContext || window.webkitAudioContext)();
              const oscillator = audioContext.createOscillator();
              const gainNode = audioContext.createGain();
              
              oscillator.connect(gainNode);
              gainNode.connect(audioContext.destination);
              
              // Different frequencies for different sounds
              const frequencies = {
                'default': 800,
                'beep': 600,
                'ding': 1000,
                'chime': 1200
              };
              
              oscillator.frequency.value = frequencies[settings.notificationSound] || 800;
              oscillator.type = 'sine';
              gainNode.gain.setValueAtTime(settings.volume, audioContext.currentTime);
              gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
              
              oscillator.start(audioContext.currentTime);
              oscillator.stop(audioContext.currentTime + 0.15);
            } catch (e) {
              // Silent fail if audio doesn't work
            }
          }

          // Show toast notification
          toast.custom(
            (t) => (
              <div
                className={`${
                  t.visible ? 'animate-enter' : 'animate-leave'
                } max-w-md w-full bg-[#0b1020] border border-white/10 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
              >
                <div className="flex-1 w-0 p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 pt-0.5">
                      <Bell className="h-5 w-5 text-[#8ab4ff]" />
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-white">
                        Mesazh i ri
                      </p>
                      <p className="mt-1 text-sm text-white/60">
                        {message.sender_email}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex border-l border-white/10">
                  <button
                    onClick={() => toast.dismiss(t.id)}
                    className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-[#8ab4ff] hover:text-[#9bffd6] focus:outline-none"
                  >
                    Mbyll
                  </button>
                </div>
              </div>
            ),
            { duration: 5000 }
          );

          // Show browser notification if enabled and granted
          if (settings.browserNotifications && 'Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification('Mesazh i ri - Antokton', {
              body: `${message.sender_email}: ${message.message.substring(0, 50)}...`,
              icon: '/favicon.ico',
              badge: '/favicon.ico',
              tag: 'chat-message',
              requireInteraction: false
            });

            // Auto close after 5 seconds
            setTimeout(() => notification.close(), 5000);
          }
        }
      }
    });

    // Request notification permission on mount if enabled
    if (settings.browserNotifications && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      unsubscribe();
    };
  }, [user]);

  return null;
}
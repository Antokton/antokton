import React, { useState, useEffect } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, CheckCircle, User } from "lucide-react";
import { format } from "date-fns";

export default function StaffChat() {
  const [user, setUser] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const authenticated = await base44.auth.isAuthenticated();
      if (authenticated) {
        const me = await base44.auth.me();
        setUser(me);
      } else {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, []);

  const isStaff = user?.role === 'admin' || user?.role === 'moderator';

  const { data: messages, isLoading } = useQuery({
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
    mutationFn: (data) => base44.entities.StaffMessage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffMessages'] });
      setNewMessage("");
    }
  });

  const resolveMessageMutation = useMutation({
    mutationFn: ({ id, response }) => base44.entities.StaffMessage.update(id, {
      is_resolved: true,
      resolved_by: user.email,
      response
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffMessages'] });
    }
  });

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    sendMessageMutation.mutate({
      sender_email: user.email,
      message: newMessage,
      is_resolved: false
    });
  };

  const handleResolve = (messageId, response) => {
    resolveMessageMutation.mutate({ id: messageId, response });
  };

  if (!user || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-[#0b1020]" />
            </div>
            <h1 className="text-3xl font-bold text-white">
              {isStaff ? 'Mesazhet e përdoruesve' : 'Bisedo me stafin'}
            </h1>
          </div>
          <p className="text-white/60">
            {isStaff ? 'Menaxho pyetjet nga përdoruesit' : 'Dërgo një mesazh te stafi ynë'}
          </p>
        </div>

        {/* Send Message Form - Regular Users */}
        {!isStaff && (
          <Card className="bg-white/5 border-white/10 mb-6">
            <CardContent className="p-6">
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Shkruani mesazhin tuaj këtu..."
                className="bg-white/5 border-white/10 text-white min-h-[120px] mb-4"
              />
              <Button 
                onClick={handleSendMessage}
                disabled={sendMessageMutation.isLoading}
                className="bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020]"
              >
                <Send className="w-4 h-4 mr-2" />
                Dërgo mesazhin
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Messages List */}
        <div className="space-y-4">
          {messages?.length === 0 ? (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-8 text-center">
                <MessageCircle className="w-12 h-12 text-white/40 mx-auto mb-3" />
                <p className="text-white/60">Nuk ka mesazhe ende</p>
              </CardContent>
            </Card>
          ) : (
            messages?.map((msg) => (
              <Card key={msg.id} className="bg-white/5 border-white/10">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-white/40" />
                      <span className="text-white/60 text-sm">{msg.sender_email}</span>
                    </div>
                    <Badge className={msg.is_resolved ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}>
                      {msg.is_resolved ? (
                        <>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Zgjidhur
                        </>
                      ) : (
                        'Në pritje'
                      )}
                    </Badge>
                  </div>
                  <p className="text-white/40 text-xs mt-1">
                    {format(new Date(msg.created_date), 'dd/MM/yyyy HH:mm')}
                  </p>
                </CardHeader>
                <CardContent>
                  <p className="text-white mb-4">{msg.message}</p>
                  
                  {msg.response && (
                    <div className="bg-white/5 p-4 rounded-lg mb-4">
                      <p className="text-white/40 text-xs mb-2">Përgjigja nga {msg.resolved_by}</p>
                      <p className="text-white">{msg.response}</p>
                    </div>
                  )}

                  {isStaff && !msg.is_resolved && (
                    <div className="mt-4">
                      <Textarea
                        placeholder="Shkruani përgjigjen..."
                        className="bg-white/5 border-white/10 text-white min-h-[80px] mb-2"
                        id={`response-${msg.id}`}
                      />
                      <Button
                        onClick={() => {
                          const response = document.getElementById(`response-${msg.id}`).value;
                          if (response.trim()) handleResolve(msg.id, response);
                        }}
                        size="sm"
                        className="bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020]"
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Shëno si të zgjidhur
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
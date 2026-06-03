import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/antoktonClient";
import UserAvatar from "@/components/ui/UserAvatar";
import { Button } from "@/components/ui/button";
import { Users, ArrowLeft, UserPlus, Trash2 } from "lucide-react";

export default function MemberProfile() {
  const { email = "" } = useParams();
  const decodedEmail = decodeURIComponent(email);
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (auth) => {
      if (auth) setCurrentUser(await base44.auth.me());
    });
  }, []);

  const { data: users = [] } = useQuery({
    queryKey: ["memberProfile", decodedEmail],
    queryFn: () => base44.entities.User.filter({ email: decodedEmail }, "-created_date", 1),
    enabled: !!decodedEmail,
  });
  const member = users[0];

  const { data: connections = [] } = useQuery({
    queryKey: ["userConnection", currentUser?.email, decodedEmail],
    queryFn: () => base44.entities.UserConnection.filter({ owner_email: currentUser.email, contact_email: decodedEmail }, "-updated_date", 1),
    enabled: !!currentUser?.email && !!decodedEmail && currentUser.email !== decodedEmail,
  });
  const connection = connections[0];

  const saveConnection = useMutation({
    mutationFn: async (circle) => {
      const payload = {
        owner_email: currentUser.email,
        contact_email: decodedEmail,
        contact_name: member?.full_name || `${member?.first_name || ""} ${member?.surname || ""}`.trim() || decodedEmail,
        contact_photo_url: member?.profile_photo_url || "",
        circle,
      };
      if (connection?.id) return base44.entities.UserConnection.update(connection.id, payload);
      return base44.entities.UserConnection.create(payload);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["userConnection", currentUser?.email, decodedEmail] }),
  });

  const removeConnection = useMutation({
    mutationFn: () => connection?.id ? base44.entities.UserConnection.delete(connection.id) : Promise.resolve(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["userConnection", currentUser?.email, decodedEmail] }),
  });

  const displayName = useMemo(() => {
    if (!member) return decodedEmail;
    return member.full_name || `${member.first_name || ""} ${member.surname || ""}`.trim() || member.email;
  }, [decodedEmail, member]);

  if (!member) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-white">
        <Link to="/Statuset" className="mb-6 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"><ArrowLeft className="h-4 w-4" /> Kthehu</Link>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">Profili nuk u gjet.</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 text-white">
      <Link to="/Statuset" className="mb-6 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"><ArrowLeft className="h-4 w-4" /> Kthehu te statuset</Link>
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <UserAvatar name={displayName} email={member.email} photoUrl={member.profile_photo_url} size={88} />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold">{displayName}</h1>
            <p className="text-sm text-white/50">{member.location || member.city || "Anëtar i Antokton"}</p>
            {member.bio && <p className="mt-3 text-sm leading-relaxed text-white/70">{member.bio}</p>}
          </div>
        </div>

        {currentUser && currentUser.email !== member.email && (
          <div className="mt-5 rounded-xl border border-white/10 bg-[#101b2d] p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4 text-[#8ab4ff]" /> Shto në rrethin tim të interesit</h2>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => saveConnection.mutate("close")} className={connection?.circle === "close" ? "bg-[#8ab4ff] text-[#0b1020]" : "bg-white/10 text-white hover:bg-white/15"}>
                <UserPlus className="mr-2 h-4 w-4" /> Rrethi i ngushtë
              </Button>
              <Button onClick={() => saveConnection.mutate("wide")} className={connection?.circle === "wide" ? "bg-[#9bffd6] text-[#0b1020]" : "bg-white/10 text-white hover:bg-white/15"}>
                <UserPlus className="mr-2 h-4 w-4" /> Rrethi i gjerë
              </Button>
              {connection && (
                <Button onClick={() => removeConnection.mutate()} className="bg-red-500/15 text-red-200 hover:bg-red-500/25">
                  <Trash2 className="mr-2 h-4 w-4" /> Hiqe nga rrethi
                </Button>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

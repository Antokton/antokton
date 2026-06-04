import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/antoktonClient";
import UserAvatar from "@/components/ui/UserAvatar";
import { Button } from "@/components/ui/button";
import { Ban, RotateCcw } from "lucide-react";

export default function BlockedUsersManager({ user }) {
  const queryClient = useQueryClient();
  const { data: blocks = [], isLoading } = useQuery({
    queryKey: ["userBlocks", user?.email],
    queryFn: () => base44.entities.UserBlock.filter({ blocker_email: user.email }, "-created_date", 500),
    enabled: !!user?.email,
  });

  const unblock = useMutation({
    mutationFn: (id) => base44.entities.UserBlock.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["userBlocks", user?.email] }),
  });

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="mb-5 flex items-center gap-2">
        <Ban className="h-4 w-4 text-red-300" />
        <h3 className="text-sm font-semibold text-white">Përdorues të bllokuar</h3>
      </div>
      {isLoading ? (
        <p className="text-sm text-white/45">Duke ngarkuar...</p>
      ) : blocks.length === 0 ? (
        <p className="text-sm text-white/45">Nuk ke bllokuar asnjë përdorues.</p>
      ) : (
        <div className="space-y-3">
          {blocks.map((block) => (
            <div key={block.id} className="flex flex-col gap-3 rounded-xl border border-white/10 bg-[#101b2d] p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <UserAvatar name={block.blocked_name || block.blocked_email} email={block.blocked_email} photoUrl={block.blocked_photo_url} size={38} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{block.blocked_name || block.blocked_email}</p>
                  <p className="truncate text-xs text-white/45">{block.blocked_email}</p>
                </div>
              </div>
              <Button onClick={() => unblock.mutate(block.id)} className="bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25">
                <RotateCcw className="mr-2 h-4 w-4" /> Zhblloko
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

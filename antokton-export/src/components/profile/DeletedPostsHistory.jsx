import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/antoktonClient";
import { Trash2, Calendar, User, Tag } from "lucide-react";
import moment from "moment";

export default function DeletedPostsHistory({ userEmail, isAdmin = false }) {
  // Për admin/moderator: shfaq të gjitha fshirjet nga AdminAction
  // Për postues: shfaq vetëm fshirjet e tij nga UserActivity
  const { data: adminActions = [], isLoading: loadingAdmin } = useQuery({
    queryKey: ["deletedAdminActions", userEmail, isAdmin],
    queryFn: () => base44.entities.AdminAction.filter({ action_type: "delete", entity_type: "job" }, "-created_date", 50),
    enabled: isAdmin,
  });

  const { data: userActivities = [], isLoading: loadingUser } = useQuery({
    queryKey: ["deletedUserActivities", userEmail],
    queryFn: () => base44.entities.UserActivity.filter({ user_email: userEmail, activity_type: "job_delete" }, "-created_date", 30),
    enabled: !!userEmail && !isAdmin,
  });

  const isLoading = isAdmin ? loadingAdmin : loadingUser;
  const items = isAdmin ? adminActions : userActivities;

  const categoryLabels = {
    pune: "Punë", sherbime: "Shërbime", prona: "Prona",
    edukim: "Edukim", bamiresi: "Bamirësi", media: "Media", pazar: "Pazar"
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-10">
        <Trash2 className="w-10 h-10 text-white/15 mx-auto mb-3" />
        <p className="text-white/40 text-sm">Nuk ka njoftime të fshira</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const isAdminItem = isAdmin;
        const title = isAdminItem ? item.entity_title : item.metadata?.job_title;
        const deletedBy = isAdminItem ? item.performed_by : item.metadata?.deleted_by;
        const deletedByRole = isAdminItem ? (item.reason || "") : item.metadata?.deleted_by_role;
        const category = isAdminItem ? "" : item.metadata?.category;
        const date = item.created_date;
        const isSelfDelete = deletedBy === (isAdminItem ? item.performed_by : userEmail);

        return (
          <div
            key={item.id}
            className="flex items-start gap-3 p-4 rounded-xl border border-red-500/15 bg-red-500/5"
          >
            <div className="w-8 h-8 rounded-full bg-red-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Trash2 className="w-4 h-4 text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {title || <span className="text-white/40 italic">Njoftim i fshirë</span>}
              </p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                {category && (
                  <span className="flex items-center gap-1 text-xs text-white/40">
                    <Tag className="w-3 h-3" />
                    {categoryLabels[category] || category}
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs text-white/40">
                  <User className="w-3 h-3" />
                  {isAdminItem
                    ? (item.reason || `nga ${deletedBy}`)
                    : (deletedByRole === "user" || deletedByRole === undefined
                        ? "Fshirë nga autori"
                        : `Fshirë nga ${deletedByRole === "admin" ? "admin" : "moderatori"} (${deletedBy})`
                      )
                  }
                </span>
                <span className="flex items-center gap-1 text-xs text-white/30">
                  <Calendar className="w-3 h-3" />
                  {moment(date).format("D MMM YYYY, HH:mm")}
                </span>
              </div>
            </div>
            <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">
              Fshirë
            </span>
          </div>
        );
      })}
    </div>
  );
}
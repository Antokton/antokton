import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../../utils";
import { MapPin, Clock, ThumbsUp, MessageCircle, Briefcase, Home as HomeIcon, Scale, GraduationCap, Heart, Radio, Wrench, ChevronRight, Banknote, Eye, ShoppingBag } from "lucide-react";
import moment from "moment";
import { formatExpiryLabel, isExpiringSoon, isPostExpired } from "@/lib/expiry";

const categoryConfig = {
  pune:     { label: "Punë",      icon: Briefcase,     accent: "#8ab4ff", bg: "rgba(138,180,255,0.12)", border: "rgba(138,180,255,0.25)" },
  prona:    { label: "Prona",     icon: HomeIcon,      accent: "#9bffd6", bg: "rgba(155,255,214,0.10)", border: "rgba(155,255,214,0.22)" },
  juridike: { label: "Juridike",  icon: Scale,         accent: "#c084fc", bg: "rgba(192,132,252,0.10)", border: "rgba(192,132,252,0.22)" },
  edukim:   { label: "Edukim",    icon: GraduationCap, accent: "#fbbf24", bg: "rgba(251,191,36,0.10)",  border: "rgba(251,191,36,0.22)"  },
  bamiresi: { label: "Bamirësi",  icon: Heart,         accent: "#f87171", bg: "rgba(248,113,113,0.10)", border: "rgba(248,113,113,0.22)" },
  media:    { label: "Media",     icon: Radio,         accent: "#22d3ee", bg: "rgba(34,211,238,0.10)",  border: "rgba(34,211,238,0.22)"  },
  sherbime: { label: "Shërbime",  icon: Wrench,        accent: "#fb923c", bg: "rgba(251,146,60,0.10)",  border: "rgba(251,146,60,0.22)"  },
  pazar:    { label: "Pazar",     icon: ShoppingBag,   accent: "#8ab4ff", bg: "rgba(138,180,255,0.12)", border: "rgba(138,180,255,0.25)" },
};

const jobTypeLabel = { ofroj: "Ofroj", kerkoj: "Kërkoj" };
const jobTypeStyle = {
  ofroj:  { bg: "rgba(155,255,214,0.15)", color: "#9bffd6", border: "rgba(155,255,214,0.3)" },
  kerkoj: { bg: "rgba(251,191,36,0.15)",  color: "#fbbf24", border: "rgba(251,191,36,0.3)"  },
};
const viewLabel = (count) => `${count} ${Number(count) === 1 ? "shikim" : "shikime"}`;

const formatLocationParts = (...parts) => {
  const seen = new Set();
  return parts
    .flatMap((part) => String(part || "").split(","))
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => {
      const key = part.toLocaleLowerCase("sq");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(", ");
};

const getPostThumbnail = (job) => {
  const images = Array.isArray(job?.image_urls) ? job.image_urls.filter(Boolean).slice(0, 6) : [];
  const mainIndex = Math.min(
    Math.max(Number.parseInt(job?.main_image_index, 10) || 0, 0),
    Math.max(images.length - 1, 0)
  );
  return job?.image_url || images[mainIndex] || images[0] || "";
};

export default function JobCard({ job }) {
  const cat = categoryConfig[job.category] || categoryConfig.pune;
  const CatIcon = cat.icon;
  const jtStyle = jobTypeStyle[job.job_type] || jobTypeStyle.ofroj;
  const thumbnail = getPostThumbnail(job);
  const totalReactions = typeof job.total_reactions === "number"
    ? job.total_reactions
    : (job.likes_count || 0) + (job.dislikes_count || 0);
  const expiryLabel = formatExpiryLabel(job);
  const expired = isPostExpired(job);
  const soon = isExpiringSoon(job);

  return (
    <Link
      to={createPageUrl("PostDetail") + `?id=${job.id}`}
      className="group flex items-center gap-3 rounded-xl px-3 py-3 sm:py-2.5 transition-all duration-200 relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${cat.bg}, rgba(255,255,255,0.03))`,
        border: `1px solid ${cat.border}`,
      }}
    >
      {/* Accent left bar */}
      <div
        className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full opacity-70 group-hover:opacity-100 transition-opacity"
        style={{ background: cat.accent }}
      />

      {/* Icon / thumbnail bubble */}
      <div
        className="shrink-0 w-9 h-9 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center overflow-hidden"
        style={{ background: cat.bg, border: `1px solid ${cat.border}` }}
      >
        {thumbnail ? (
          <img
            src={thumbnail}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            onError={(event) => { event.currentTarget.style.display = "none"; }}
          />
        ) : (
          <CatIcon className="w-4.5 h-4.5 sm:w-4 sm:h-4" style={{ color: cat.accent }} />
        )}
      </div>

      {/* Center: title + meta */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-white text-sm sm:text-xs group-hover:text-[#8ab4ff] transition-colors line-clamp-1 leading-snug">
          {job.title}
        </h3>
        <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-0.5 text-[11px] sm:text-[10px] text-white/55">
          {(job.country || job.city) && (
            <span className="flex items-center gap-0.5">
              <MapPin className="w-3 h-3 sm:w-2.5 sm:h-2.5" />
              {formatLocationParts(job.city || job.zone, job.country)}
              {job.location_precision === "perafersisht" && job.city && (
                <span className="text-white/35">(zonë)</span>
              )}
            </span>
          )}
          {job.salary_info && (
            <span className="flex items-center gap-0.5 text-[#9bffd6]/80">
              <Banknote className="w-3 h-3 sm:w-2.5 sm:h-2.5" />
              {job.salary_info.length > 14 ? job.salary_info.slice(0, 14) + "…" : job.salary_info}
            </span>
          )}
          <span className="flex items-center gap-0.5">
            <Clock className="w-3 h-3 sm:w-2.5 sm:h-2.5" />
            {moment(job.created_date).fromNow()}
          </span>
          {job.expires_at && (
            <span className={`font-medium ${expired ? "text-red-300" : soon ? "text-amber-300" : "text-white/45"}`}>
              {expiryLabel}
            </span>
          )}
        </div>
      </div>

      {/* Right: type badge + stats + arrow */}
      <div className="shrink-0 flex flex-col items-end gap-1">
        {job.job_type && (
          <span
            className="text-[10px] sm:text-[9px] font-bold px-2 py-0.5 rounded-full leading-none"
            style={{ background: jtStyle.bg, color: jtStyle.color, border: `1px solid ${jtStyle.border}` }}
          >
            {jobTypeLabel[job.job_type] || job.job_type}
          </span>
        )}
        <div className="flex items-center gap-1.5 text-[10px] text-white/45">
          <span className="flex items-center gap-0.5">
            <ThumbsUp className="w-2.5 h-2.5" />
            {totalReactions}
          </span>
          <span className="flex items-center gap-0.5">
            <MessageCircle className="w-2.5 h-2.5" />
            {job.comments_count || 0}
          </span>
          {typeof job.view_count === "number" && (
            <span className="flex items-center gap-0.5" title={viewLabel(job.view_count)}>
              <Eye className="w-2.5 h-2.5" />
              {job.view_count}
            </span>
          )}
        </div>
      </div>

      <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 group-hover:translate-x-0.5 transition-all shrink-0" />
    </Link>
  );
}

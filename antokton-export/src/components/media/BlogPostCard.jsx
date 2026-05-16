import React, { useState } from "react";
import { Clock, User, Tag, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { motion } from "framer-motion";

export default function BlogPostCard({ post }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = (post.description || "").length > 300;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/10 overflow-hidden hover:border-white/20 transition-all"
      style={{ background: "rgba(255,255,255,0.04)" }}>
      {post.image_url && (
        <div className="relative h-48 overflow-hidden">
          <img src={post.image_url} alt={post.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 50%, rgba(11,16,32,0.9))" }} />
        </div>
      )}
      <div className="p-5 flex flex-col gap-3">
        {/* Author row */}
        <div className="flex items-center gap-2">
          {post.author_photo_url ? (
            <img src={post.author_photo_url} alt={post.author_name} className="w-8 h-8 rounded-full object-cover border border-white/10" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-white/40" />
            </div>
          )}
          <div>
            <p className="text-white text-xs font-medium">{post.author_name || "Anonim"}</p>
            {post.author_bio && <p className="text-white/35 text-[10px] leading-tight truncate max-w-[180px]">{post.author_bio}</p>}
          </div>
          {post.reading_time_min && (
            <span className="ml-auto text-white/30 text-[10px] flex items-center gap-1">
              <Clock className="w-3 h-3" />{post.reading_time_min} min
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-white font-semibold text-base leading-tight">{post.title}</h3>

        {/* Content */}
        {post.description && (
          <div>
            <p className={`text-white/55 text-sm leading-relaxed ${!expanded && isLong ? "line-clamp-4" : ""}`}>
              {post.description}
            </p>
            {isLong && (
              <button onClick={() => setExpanded(e => !e)}
                className="mt-2 flex items-center gap-1 text-[#8ab4ff] text-xs hover:text-[#9bffd6] transition-colors">
                {expanded ? <><ChevronUp className="w-3.5 h-3.5" />Mbyll</> : <><ChevronDown className="w-3.5 h-3.5" />Lexo më shumë</>}
              </button>
            )}
          </div>
        )}

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {post.tags.slice(0, 4).map(tag => (
              <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/40 flex items-center gap-1">
                <Tag className="w-2.5 h-2.5" />{tag}
              </span>
            ))}
          </div>
        )}

        {/* External link */}
        {post.link_url && (
          <a href={post.link_url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[#8ab4ff] text-xs font-medium hover:text-[#9bffd6] transition-colors">
            <ExternalLink className="w-3.5 h-3.5" /> Lexo origjinalin
          </a>
        )}
      </div>
    </motion.div>
  );
}
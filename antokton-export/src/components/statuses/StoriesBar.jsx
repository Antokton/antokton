import React from "react";
import { Link } from "react-router-dom";

const STORIES = [
  { id: 1, name: "Shkupi", avatar: "SK", color: "#8ab4ff" },
  { id: 2, name: "Prishtina", avatar: "PR", color: "#9bffd6" },
  { id: 3, name: "Tiranë", avatar: "TI", color: "#fca5a5" },
  { id: 4, name: "Zurich", avatar: "ZH", color: "#fdba74" },
  { id: 5, name: "Berlin", avatar: "BE", color: "#86efac" },
];

export default function StoriesBar() {
  return (
    <div className="overflow-x-auto no-scrollbar py-2 px-3 sm:px-4 border-b border-white/8" style={{ background: "#1a2640", WebkitOverflowScrolling: "touch" }}>
      <div className="flex gap-1.5 sm:gap-2 min-w-min">
        {STORIES.map(s => (
          <button key={s.id}
            className="flex flex-col items-center gap-1 sm:gap-1.5 py-2 px-2 sm:px-3 rounded-xl hover:bg-white/5 transition-all shrink-0 active:scale-95">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm border-2 border-white/20 hover:border-white/40 transition-all cursor-pointer"
              style={{ background: s.color }}>
              {s.avatar}
            </div>
            <span className="text-white/70 text-[10px] sm:text-xs text-center whitespace-nowrap">{s.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
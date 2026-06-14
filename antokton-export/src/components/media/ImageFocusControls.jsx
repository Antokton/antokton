import React from "react";
import { RotateCcw } from "lucide-react";
import { DEFAULT_IMAGE_FOCUS, normalizeImageFocus } from "@/lib/imageFocus";

export default function ImageFocusControls({ value, onChange }) {
  const focus = normalizeImageFocus(value);

  const update = (patch) => {
    onChange?.(normalizeImageFocus({ ...focus, ...patch }));
  };

  return (
    <div className="rounded-xl border border-white/10 bg-black/15 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-white/75">Zona e shikueshmërisë</p>
          <p className="text-[11px] text-white/40">Poziciono foton brenda kuadratit të thumbnail-it.</p>
        </div>
        <button
          type="button"
          onClick={() => onChange?.(DEFAULT_IMAGE_FOCUS)}
          className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[11px] text-white/60 hover:bg-white/10 hover:text-white"
        >
          <RotateCcw className="h-3 w-3" />
          Qendër
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="space-y-1 text-[11px] text-white/55">
          Horizontalisht
          <input
            type="range"
            min="0"
            max="100"
            value={focus.x}
            onChange={(event) => update({ x: event.target.value })}
            className="w-full accent-[#9bffd6]"
          />
        </label>
        <label className="space-y-1 text-[11px] text-white/55">
          Vertikalisht
          <input
            type="range"
            min="0"
            max="100"
            value={focus.y}
            onChange={(event) => update({ y: event.target.value })}
            className="w-full accent-[#9bffd6]"
          />
        </label>
        <label className="space-y-1 text-[11px] text-white/55">
          Zmadhimi
          <input
            type="range"
            min="1"
            max="3"
            step="0.05"
            value={focus.zoom}
            onChange={(event) => update({ zoom: event.target.value })}
            className="w-full accent-[#9bffd6]"
          />
        </label>
      </div>
    </div>
  );
}

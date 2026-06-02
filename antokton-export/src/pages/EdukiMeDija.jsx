import React from "react";
import { EdukimSection } from "./Edukim";
import { MediaSection } from "./Media";

export default function EdukiMeDija() {
  return (
    <div className="min-h-screen">
      <EdukimSection />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="h-px bg-white/10" />
      </div>
      <MediaSection />
    </div>
  );
}

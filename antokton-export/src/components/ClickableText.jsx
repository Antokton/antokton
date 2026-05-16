import React from "react";

export default function ClickableText({ text, className = "" }) {
  if (!text) return null;
  
  // Regex për të gjetur URL-të në tekst
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  
  const parts = text.split(urlRegex);
  
  return (
    <p className={className}>
      {parts.map((part, i) => {
        if (part.match(urlRegex)) {
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#8ab4ff] hover:text-[#9bffd6] underline"
            >
              {part}
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}
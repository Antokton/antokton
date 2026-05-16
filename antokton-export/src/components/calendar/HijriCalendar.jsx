import React from "react";
import { Badge } from "@/components/ui/badge";

// Konvertimi i datës gregoriane në Hixhri - Algoritmi i saktë
const gregorianToHijri = (gregorianDate) => {
  const gDate = new Date(gregorianDate);
  const year = gDate.getFullYear();
  const month = gDate.getMonth() + 1;
  const day = gDate.getDate();
  
  let jd = Math.floor((1461 * (year + 4800 + Math.floor((month - 14) / 12))) / 4) + Math.floor((367 * (month - 2 - 12 * Math.floor((month - 14) / 12))) / 12) - Math.floor((3 * (Math.floor((year + 4900 + Math.floor((month - 14) / 12)) / 100))) / 4) + day - 32075;
  
  let l = jd - 1948440 + 10632;
  let n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  let j = Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) + Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l = l - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  
  const hijriMonth = Math.floor((24 * l) / 709);
  const hijriDay = l - Math.floor((709 * hijriMonth) / 24);
  const hijriYear = 30 * n + j - 30;
  
  return {
    year: hijriYear,
    month: hijriMonth,
    day: hijriDay
  };
};

const hijriMonths = [
  "Muharram", "Safar", "Rebiu el-Ewel", "Rebiu al-Akhar",
  "Xhumada el-Ula", "Xhumad al-Akhira", "Rexheb", "Sha'ban",
  "Ramadan", "Shewal", "Dhul-Kada", "Dhul-Hixha"
];

export default function HijriCalendar({ gregorianDate, className = "" }) {
  if (!gregorianDate) return null;
  
  const hijri = gregorianToHijri(gregorianDate);
  
  const monthName = hijriMonths[hijri.month - 1] || hijriMonths[0];
  
  return (
    <Badge variant="outline" className={`border-emerald-500/30 text-emerald-400 gap-1 ${className}`}>
      <span>🌙</span>
      <span>
        {String(hijri.day).padStart(2, '0')} {monthName} {hijri.year} H.
      </span>
    </Badge>
  );
}

export { gregorianToHijri, hijriMonths };
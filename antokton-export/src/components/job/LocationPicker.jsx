import React, { useState, useRef, useEffect } from "react";
import { MapPin, Loader2, X } from "lucide-react";
import { base44 } from "@/api/antoktonClient";
import { ANTOKTON_ZONES } from "@/lib/antoktonRegions";

// Fshatra, lagje dhe vendbanime Antokton me emrin shqip + aliaset serbisht/greqisht/maqedonisht
// Kjo listë mundëson: (1) gjetjen me emrin shqip, (2) zëvendësimin e emrave të huaj me ata shqip
const ANTOKTON_PLACES = [
  // Mal i Zi — Zona shqiptare
  { name: "Budva", aliases: ["budva","budua"], zone: "Antokton Perëndim — Malësia e Jugut, Qendrore & Veriut", city: "Budva", near: "Tivar" },
  { name: "Katërkollë", aliases: ["vladimir","katerkole","katër kollë"], zone: "Antokton Perëndim — Malësia e Jugut, Qendrore & Veriut", city: "Katërkollë", near: "Ulqin" },
  { name: "Kosmaç", aliases: ["kosmac","kosmaç","cosmos"], zone: "Antokton Perëndim — Malësia e Jugut, Qendrore & Veriut", city: "Kosmaç", near: "Shkodër" },
  { name: "Selcë", aliases: ["selce","seltse"], zone: "Antokton Perëndim — Malësia e Jugut, Qendrore & Veriut", city: "Selcë", near: "Plavë" },
  { name: "Muriqan", aliases: ["muriqan","murican"], zone: "Antokton Perëndim — Malësia e Jugut, Qendrore & Veriut", city: "Muriqan", near: "Shkodër" },
  { name: "Gruemirë", aliases: ["gruemire","grubisic"], zone: "Antokton Perëndim — Malësia e Jugut, Qendrore & Veriut", city: "Gruemirë", near: "Guci" },
  { name: "Zatriç", aliases: ["zatric","zatriç"], zone: "Antokton Perëndim — Malësia e Jugut, Qendrore & Veriut", city: "Zatriç", near: "Plavë" },
  { name: "Vrith", aliases: ["vrith","vrit"], zone: "Antokton Perëndim — Malësia e Jugut, Qendrore & Veriut", city: "Vrith", near: "Ulqin" },
  { name: "Arbnesh", aliases: ["arbnesh","arbanese"], zone: "Antokton Perëndim — Malësia e Jugut, Qendrore & Veriut", city: "Arbnesh", near: "Tivar" },
  { name: "Briska e Madhe", aliases: ["briska e madhe","velika briska"], zone: "Antokton Perëndim — Malësia e Jugut, Qendrore & Veriut", city: "Briska e Madhe", near: "Ulqin" },
  { name: "Hot", aliases: ["hot","hoti"], zone: "Antokton Perëndim — Malësia e Jugut, Qendrore & Veriut", city: "Hot", near: "Guci" },
  { name: "Triesh", aliases: ["triesh","triesch"], zone: "Antokton Perëndim — Malësia e Jugut, Qendrore & Veriut", city: "Triesh", near: "Plavë" },
  // Kosovë — fshatra
  { name: "Ibar", aliases: ["ibar","ibare"], zone: "Antokton Qendër — Iliria Perëndimore & Dardania e Jugut", city: "Ibar", near: "Mitrovicë" },
  { name: "Banjë", aliases: ["banje","banja"], zone: "Antokton Qendër — Iliria Perëndimore & Dardania e Jugut", city: "Banjë", near: "Pejë" },
  { name: "Bresalc", aliases: ["bresalc","brezovica"], zone: "Antokton Qendër — Iliria Perëndimore & Dardania e Jugut", city: "Bresalc", near: "Ferizaj" },
  { name: "Kamenicë", aliases: ["kamenice","kamenica"], zone: "Antokton Qendër — Iliria Perëndimore & Dardania e Jugut", city: "Kamenicë", near: "Gjilan" },
  { name: "Lipjan", aliases: ["lipjan","lipljan"], zone: "Antokton Qendër — Iliria Perëndimore & Dardania e Jugut", city: "Lipjan", near: "Prishtinë" },
  { name: "Drenas", aliases: ["drenas","glogovac"], zone: "Antokton Qendër — Iliria Perëndimore & Dardania e Jugut", city: "Drenas", near: "Prishtinë" },
  { name: "Rahovec", aliases: ["rahovec","orahovac"], zone: "Antokton Qendër — Iliria Perëndimore & Dardania e Jugut", city: "Rahovec", near: "Gjakovë" },
  { name: "Skenderaj", aliases: ["skenderaj","srbica"], zone: "Antokton Qendër — Iliria Perëndimore & Dardania e Jugut", city: "Skenderaj", near: "Mitrovicë" },
  { name: "Malishevë", aliases: ["malisevo","malisheve"], zone: "Antokton Qendër — Iliria Perëndimore & Dardania e Jugut", city: "Malishevë", near: "Prizren" },
  { name: "Suharekë", aliases: ["suhareka","suhareke","suva reka"], zone: "Antokton Qendër — Iliria Perëndimore & Dardania e Jugut", city: "Suharekë", near: "Prizren" },
  { name: "Obiliq", aliases: ["obilic","obiliq"], zone: "Antokton Qendër — Iliria Perëndimore & Dardania e Jugut", city: "Obiliq", near: "Prishtinë" },
  { name: "Deçan", aliases: ["decan","decane"], zone: "Antokton Qendër — Iliria Perëndimore & Dardania e Jugut", city: "Deçan", near: "Pejë" },
  { name: "Klinë", aliases: ["kline","klina"], zone: "Antokton Qendër — Iliria Perëndimore & Dardania e Jugut", city: "Klinë", near: "Pejë" },
  { name: "Dragash", aliases: ["dragash","dragas"], zone: "Antokton Qendër — Iliria Perëndimore & Dardania e Jugut", city: "Dragash", near: "Prizren" },
  { name: "Leposaviq", aliases: ["leposavic","leposaviq"], zone: "Antokton Qendër — Iliria Perëndimore & Dardania e Jugut", city: "Leposaviq", near: "Mitrovicë" },
  // Maqedoni e Veriut — vendbanime shqiptare
  { name: "Çegran", aliases: ["cegran","chegran"], zone: "Antokton Lindje — Iliria Lindore", city: "Çegran", near: "Gostivar" },
  { name: "Jegunovcë", aliases: ["jegunovce","jegunovtse"], zone: "Antokton Lindje — Iliria Lindore", city: "Jegunovcë", near: "Shkup" },
  { name: "Saraj", aliases: ["saraj"], zone: "Antokton Lindje — Iliria Lindore", city: "Saraj", near: "Shkup" },
  { name: "Kondovë", aliases: ["kondove","kondovo"], zone: "Antokton Lindje — Iliria Lindore", city: "Kondovë", near: "Shkup" },
  { name: "Zhelinë", aliases: ["zheline","zelino"], zone: "Antokton Lindje — Iliria Lindore", city: "Zhelinë", near: "Tetovë" },
  { name: "Bogovinë", aliases: ["bogovinje","bogovine"], zone: "Antokton Lindje — Iliria Lindore", city: "Bogovinë", near: "Tetovë" },
  { name: "Vrapçisht", aliases: ["vrapcist","vrapchisht"], zone: "Antokton Lindje — Iliria Lindore", city: "Vrapçisht", near: "Gostivar" },
  { name: "Debar", aliases: ["debar","diber"], zone: "Antokton Lindje — Iliria Lindore", city: "Debar", near: "Dibër" },
  // Greqi veriore (Epiri — vendbanime shqiptare)
  { name: "Filat", aliases: ["filiates","filati"], zone: "Antokton Jug — Epiri, Thesalia & Morea", city: "Filat", near: "Janinë" },
  { name: "Çamëri", aliases: ["chameria","cameria","çamëri"], zone: "Antokton Jug — Epiri, Thesalia & Morea", city: "Çamëri", near: "Prevezë" },
  { name: "Himara", aliases: ["himara","himari","chimarra"], zone: "Antokton Jug — Epiri, Thesalia & Morea", city: "Himarë", near: "Sarandë" },
  { name: "Delvina", aliases: ["delvina","delvinë"], zone: "Antokton Jug — Epiri, Thesalia & Morea", city: "Delvinë", near: "Sarandë" },
];

// Harta e alias→emri shqip (për zëvendësim nga Nominatim)
const ALIAS_TO_ALBANIAN = {};
ANTOKTON_PLACES.forEach(p => {
  p.aliases.forEach(a => { ALIAS_TO_ALBANIAN[a.toLowerCase()] = p; });
  ALIAS_TO_ALBANIAN[p.name.toLowerCase()] = p;
});

// Flat list: { label, city, zone, country, is_antokton }
const ANTOKTON_SUGGESTIONS = [
  // Qytetet kryesore nga zonat
  ...Object.entries(ANTOKTON_ZONES).flatMap(([zone, cities]) =>
    cities.map(city => ({ label: `${city} — ${zone.split("—")[0].trim()}`, city, zone, country: "Antokton", is_antokton: true }))
  ),
  // Fshatra dhe vendbanime me emrin shqip
  ...ANTOKTON_PLACES.map(p => ({
    label: `${p.name}${p.near ? ` (afër ${p.near})` : ""} — ${p.zone.split("—")[0].trim()}`,
    displayLabel: `${p.name}${p.near ? `, ${p.near}` : ""}, Antokton`,
    city: p.city,
    zone: p.zone,
    country: "Antokton",
    is_antokton: true
  }))
];

const EUROPE_SUGGESTIONS = [
  // Gjermani
  { label: "Berlin, Gjermani", city: "Berlin", country: "Gjermani" },
  { label: "München, Gjermani", city: "München", country: "Gjermani", aliases: ["Munich", "Muenchen"] },
  { label: "Hamburg, Gjermani", city: "Hamburg", country: "Gjermani" },
  { label: "Frankfurt, Gjermani", city: "Frankfurt", country: "Gjermani" },
  { label: "Köln, Gjermani", city: "Köln", country: "Gjermani", aliases: ["Cologne", "Koeln"] },
  { label: "Stuttgart, Gjermani", city: "Stuttgart", country: "Gjermani" },
  { label: "Düsseldorf, Gjermani", city: "Düsseldorf", country: "Gjermani" },
  { label: "Dortmund, Gjermani", city: "Dortmund", country: "Gjermani" },
  { label: "Leipzig, Gjermani", city: "Leipzig", country: "Gjermani" },
  { label: "Hannover, Gjermani", city: "Hannover", country: "Gjermani" },
  { label: "Nürnberg, Gjermani", city: "Nürnberg", country: "Gjermani" },
  { label: "Dresden, Gjermani", city: "Dresden", country: "Gjermani" },
  { label: "Bremen, Gjermani", city: "Bremen", country: "Gjermani" },
  // Angli
  { label: "London, Angli", city: "London", country: "Angli" },
  { label: "Birmingham, Angli", city: "Birmingham", country: "Angli" },
  { label: "Manchester, Angli", city: "Manchester", country: "Angli" },
  { label: "Leeds, Angli", city: "Leeds", country: "Angli" },
  { label: "Glasgow, Angli", city: "Glasgow", country: "Angli" },
  { label: "Sheffield, Angli", city: "Sheffield", country: "Angli" },
  { label: "Bradford, Angli", city: "Bradford", country: "Angli" },
  { label: "Edinburgh, Angli", city: "Edinburgh", country: "Angli" },
  { label: "Bristol, Angli", city: "Bristol", country: "Angli" },
  // Zvicër
  { label: "Zürich, Zvicër", city: "Zürich", country: "Zvicër", aliases: ["Zurich", "Zuerich"] },
  { label: "Genf, Zvicër", city: "Genf", country: "Zvicër", aliases: ["Geneva", "Genève"] },
  { label: "Basel, Zvicër", city: "Basel", country: "Zvicër" },
  { label: "Bern, Zvicër", city: "Bern", country: "Zvicër" },
  { label: "Lausanne, Zvicër", city: "Lausanne", country: "Zvicër" },
  // Austri
  { label: "Wien, Austri", city: "Wien", country: "Austri", aliases: ["Vienna", "Vjenë"] },
  { label: "Graz, Austri", city: "Graz", country: "Austri" },
  { label: "Salzburg, Austri", city: "Salzburg", country: "Austri" },
  { label: "Innsbruck, Austri", city: "Innsbruck", country: "Austri" },
  // Itali
  { label: "Milano, Itali", city: "Milano", country: "Itali" },
  { label: "Roma, Itali", city: "Roma", country: "Itali" },
  { label: "Torino, Itali", city: "Torino", country: "Itali" },
  { label: "Napoli, Itali", city: "Napoli", country: "Itali" },
  { label: "Bologna, Itali", city: "Bologna", country: "Itali" },
  { label: "Firenze, Itali", city: "Firenze", country: "Itali" },
  { label: "Genova, Itali", city: "Genova", country: "Itali" },
  // Francë
  { label: "Paris, Francë", city: "Paris", country: "Francë" },
  { label: "Lyon, Francë", city: "Lyon", country: "Francë" },
  { label: "Marseille, Francë", city: "Marseille", country: "Francë" },
  { label: "Toulouse, Francë", city: "Toulouse", country: "Francë" },
  { label: "Nice, Francë", city: "Nice", country: "Francë" },
  { label: "Strasbourg, Francë", city: "Strasbourg", country: "Francë" },
  // Belgjikë
  { label: "Bruksel, Belgjikë", city: "Bruksel", country: "Belgjikë", aliases: ["Bruxelles", "Brussel", "Brussels", "Brusel"] },
  { label: "Antwerp, Belgjikë", city: "Antwerp", country: "Belgjikë", aliases: ["Antwerpen", "Anvers"] },
  { label: "Gent, Belgjikë", city: "Gent", country: "Belgjikë", aliases: ["Ghent", "Gand"] },
  // Hollandë
  { label: "Amsterdam, Hollandë", city: "Amsterdam", country: "Hollandë" },
  { label: "Rotterdam, Hollandë", city: "Rotterdam", country: "Hollandë" },
  { label: "Den Haag, Hollandë", city: "Den Haag", country: "Hollandë" },
  { label: "Utrecht, Hollandë", city: "Utrecht", country: "Hollandë" },
  // Suedi
  { label: "Stockholm, Suedi", city: "Stockholm", country: "Suedi" },
  { label: "Göteborg, Suedi", city: "Göteborg", country: "Suedi" },
  { label: "Malmö, Suedi", city: "Malmö", country: "Suedi" },
  // Norvegji
  { label: "Oslo, Norvegji", city: "Oslo", country: "Norvegji" },
  { label: "Bergen, Norvegji", city: "Bergen", country: "Norvegji" },
  { label: "Trondheim, Norvegji", city: "Trondheim", country: "Norvegji" },
  // Danimarkë
  { label: "Kopenhagë, Danimarkë", city: "Kopenhagë", country: "Danimarkë", aliases: ["Copenhagen", "København"] },
  { label: "Aarhus, Danimarkë", city: "Aarhus", country: "Danimarkë" },
  // Spanjë
  { label: "Madrid, Spanjë", city: "Madrid", country: "Spanjë" },
  { label: "Barcelona, Spanjë", city: "Barcelona", country: "Spanjë" },
  { label: "Valencia, Spanjë", city: "Valencia", country: "Spanjë" },
  { label: "Sevilla, Spanjë", city: "Sevilla", country: "Spanjë" },
  // Turqi
  { label: "Istanbul, Turqi", city: "Istanbul", country: "Turqi" },
  { label: "Ankara, Turqi", city: "Ankara", country: "Turqi" },
  // Emiratet
  { label: "Dubai, Emiratet", city: "Dubai", country: "Emiratet" },
  { label: "Abu Dhabi, Emiratet", city: "Abu Dhabi", country: "Emiratet" },
  // USA/Canada
  { label: "New York, SHBA", city: "New York", country: "SHBA" },
  { label: "Chicago, SHBA", city: "Chicago", country: "SHBA" },
  { label: "Los Angeles, SHBA", city: "Los Angeles", country: "SHBA" },
  { label: "Toronto, Kanada", city: "Toronto", country: "Kanada" },
];

// Rrugë/lagje të njohura në qytetet Antokton (për autocomplete të detajuar)
const STREET_SUGGESTIONS = [
  // Prishtinë
  { label: "Rr. Nënë Tereza, Prishtinë", city: "Prishtinë", zone: "Antokton Qendër — Iliria Perëndimore & Dardania e Jugut", country: "Antokton", is_antokton: true },
  { label: "Rr. UÇK, Prishtinë", city: "Prishtinë", zone: "Antokton Qendër — Iliria Perëndimore & Dardania e Jugut", country: "Antokton", is_antokton: true },
  { label: "Rr. Ali Ajeti, Prishtinë", city: "Prishtinë", zone: "Antokton Qendër — Iliria Perëndimore & Dardania e Jugut", country: "Antokton", is_antokton: true },
  { label: "Rr. Bill Clinton, Prishtinë", city: "Prishtinë", zone: "Antokton Qendër — Iliria Perëndimore & Dardania e Jugut", country: "Antokton", is_antokton: true },
  { label: "Lagja Dardania, Prishtinë", city: "Prishtinë", zone: "Antokton Qendër — Iliria Perëndimore & Dardania e Jugut", country: "Antokton", is_antokton: true },
  { label: "Lagja Kalabria, Prishtinë", city: "Prishtinë", zone: "Antokton Qendër — Iliria Perëndimore & Dardania e Jugut", country: "Antokton", is_antokton: true },
  { label: "Lagja Matiqan, Prishtinë", city: "Prishtinë", zone: "Antokton Qendër — Iliria Perëndimore & Dardania e Jugut", country: "Antokton", is_antokton: true },
  { label: "Lagja Bregu i Diellit, Prishtinë", city: "Prishtinë", zone: "Antokton Qendër — Iliria Perëndimore & Dardania e Jugut", country: "Antokton", is_antokton: true },
  { label: "Qendra, Prishtinë", city: "Prishtinë", zone: "Antokton Qendër — Iliria Perëndimore & Dardania e Jugut", country: "Antokton", is_antokton: true },
  // Tiranë
  { label: "Rr. Myslym Shyri, Tiranë", city: "Tiranë", zone: "Antokton Qendër — Iliria Perëndimore & Dardania e Jugut", country: "Antokton", is_antokton: true },
  { label: "Rr. Kavajës, Tiranë", city: "Tiranë", zone: "Antokton Qendër — Iliria Perëndimore & Dardania e Jugut", country: "Antokton", is_antokton: true },
  { label: "Blloku, Tiranë", city: "Tiranë", zone: "Antokton Qendër — Iliria Perëndimore & Dardania e Jugut", country: "Antokton", is_antokton: true },
  { label: "Yzberisht, Tiranë", city: "Tiranë", zone: "Antokton Qendër — Iliria Perëndimore & Dardania e Jugut", country: "Antokton", is_antokton: true },
  { label: "Kombinat, Tiranë", city: "Tiranë", zone: "Antokton Qendër — Iliria Perëndimore & Dardania e Jugut", country: "Antokton", is_antokton: true },
  { label: "Qyteti Studenti, Tiranë", city: "Tiranë", zone: "Antokton Qendër — Iliria Perëndimore & Dardania e Jugut", country: "Antokton", is_antokton: true },
  { label: "Astir, Tiranë", city: "Tiranë", zone: "Antokton Qendër — Iliria Perëndimore & Dardania e Jugut", country: "Antokton", is_antokton: true },
  { label: "Selitë, Tiranë", city: "Tiranë", zone: "Antokton Qendër — Iliria Perëndimore & Dardania e Jugut", country: "Antokton", is_antokton: true },
  // Shkup
  { label: "Çair, Shkup", city: "Shkup", zone: "Antokton Lindje — Iliria Lindore", country: "Antokton", is_antokton: true },
  { label: "Butel, Shkup", city: "Shkup", zone: "Antokton Lindje — Iliria Lindore", country: "Antokton", is_antokton: true },
  { label: "Qendra, Shkup", city: "Shkup", zone: "Antokton Lindje — Iliria Lindore", country: "Antokton", is_antokton: true },
  { label: "Gjorçe Petrov, Shkup", city: "Shkup", zone: "Antokton Lindje — Iliria Lindore", country: "Antokton", is_antokton: true },
  // Tetovë
  { label: "Qendra, Tetovë", city: "Tetovë", zone: "Antokton Lindje — Iliria Lindore", country: "Antokton", is_antokton: true },
  { label: "Rr. Ilinden, Tetovë", city: "Tetovë", zone: "Antokton Lindje — Iliria Lindore", country: "Antokton", is_antokton: true },
  // Gjakovë
  { label: "Çarshia e Vjetër, Gjakovë", city: "Gjakovë", zone: "Antokton Qendër — Iliria Perëndimore & Dardania e Jugut", country: "Antokton", is_antokton: true },
  { label: "Qendra, Gjakovë", city: "Gjakovë", zone: "Antokton Qendër — Iliria Perëndimore & Dardania e Jugut", country: "Antokton", is_antokton: true },
  // Prizren
  { label: "Qendra Historike, Prizren", city: "Prizren", zone: "Antokton Qendër — Iliria Perëndimore & Dardania e Jugut", country: "Antokton", is_antokton: true },
  { label: "Rr. Shën Flori, Prizren", city: "Prizren", zone: "Antokton Qendër — Iliria Perëndimore & Dardania e Jugut", country: "Antokton", is_antokton: true },
  // Shkodër
  { label: "Qendra, Shkodër", city: "Shkodër", zone: "Antokton Qendër — Iliria Perëndimore & Dardania e Jugut", country: "Antokton", is_antokton: true },
  { label: "Rus, Shkodër", city: "Shkodër", zone: "Antokton Qendër — Iliria Perëndimore & Dardania e Jugut", country: "Antokton", is_antokton: true },
  // Durrës
  { label: "Qendra, Durrës", city: "Durrës", zone: "Antokton Qendër — Iliria Perëndimore & Dardania e Jugut", country: "Antokton", is_antokton: true },
  { label: "Shkozet, Durrës", city: "Durrës", zone: "Antokton Qendër — Iliria Perëndimore & Dardania e Jugut", country: "Antokton", is_antokton: true },
  // Janinë / Epir
  { label: "Qendra, Janinë", city: "Janinë", zone: "Antokton Jug — Epiri, Thesalia & Morea", country: "Antokton", is_antokton: true },
];

const ALL_SUGGESTIONS = [...STREET_SUGGESTIONS, ...ANTOKTON_SUGGESTIONS, ...EUROPE_SUGGESTIONS];

function normalizeSearch(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ë/g, "e")
    .replace(/ç/g, "c")
    .trim();
}

function normalizeCountryName(country = "") {
  const value = String(country || "").trim();
  if (/^(gjermani|gjermania|germany|deutschland)$/i.test(value)) return "Gjermani";
  if (/^(belgjikë|belgjike|belgjika|belgium|belgique|belgië)$/i.test(value)) return "Belgjikë";
  if (/^(itali|italia|italy|italie)$/i.test(value)) return "Itali";
  if (/^(zvicër|zvicer|zvicra|switzerland|suisse|schweiz)$/i.test(value)) return "Zvicër";
  if (/^(austri|austria|österreich|osterreich)$/i.test(value)) return "Austri";
  if (/^(francë|france|franca)$/i.test(value)) return "Francë";
  if (/^(hollandë|hollande|hollanda|netherlands|nederland)$/i.test(value)) return "Hollandë";
  if (/^(suedi|suedia|sweden|sverige)$/i.test(value)) return "Suedi";
  if (/^(norvegji|norvegjia|norway|norge)$/i.test(value)) return "Norvegji";
  if (/^(danimarkë|danimarke|danimarka|denmark|danmark)$/i.test(value)) return "Danimarkë";
  if (/^(spanjë|spanje|spanja|spain|españa)$/i.test(value)) return "Spanjë";
  if (/^(angli|anglia|england|united kingdom|mbretëri e bashkuar|mbreteria e bashkuar)$/i.test(value)) return "Angli";
  if (/^(mal i zi|mali i zi|mal të zi|mali të zi|montenegro|crna gora|serbi|serbia|srbija|greqi|greqia|greece|ellada|maqedoni|maqedonia|maqedoni e veriut|maqedonia e veriut|north macedonia|macedonia)$/i.test(value)) return "Antokton";
  return value;
}

function getFallbackAntoktonZone(cityName = "", countryRaw = "") {
  const raw = normalizeSearch(countryRaw);
  const detected = detectAntoktonZone(cityName);
  if (detected) return detected;
  if (["shqiperi", "shqiperia", "albania", "kosove", "kosova"].includes(raw)) {
    return "Antokton Qendër — Iliria Perëndimore & Dardania e Jugut";
  }
  if (["mal i zi", "mali i zi", "montenegro", "crna gora"].includes(raw)) {
    return "Antokton Perëndim — Malësia e Jugut, Qendrore & Veriut";
  }
  if (["serbi", "serbia", "srbija"].includes(raw)) {
    return "Antokton Veri — Dardania Qendrore, Veriore & Vojvodina";
  }
  if (["maqedoni", "maqedonia", "maqedoni e veriut", "maqedonia e veriut", "north macedonia", "macedonia"].includes(raw)) {
    return "Antokton Lindje — Iliria Lindore";
  }
  if (["greqi", "greqia", "greece", "ellada"].includes(raw)) {
    return "Antokton Jug — Epiri, Thesalia & Morea";
  }
  return null;
}

function normalizeCityName(city = "") {
  const value = String(city || "").trim();
  const key = normalizeSearch(value);
  const replacements = new Map([
    ["bremeni", "Bremen"],
    ["bremen", "Bremen"],
    ["brukseli", "Bruksel"],
    ["bruksell", "Bruksel"],
    ["brussels", "Bruksel"],
    ["bruxelles", "Bruksel"],
    ["berlini", "Berlin"],
    ["hamburgu", "Hamburg"],
    ["frankfurti", "Frankfurt"],
    ["dortmundi", "Dortmund"],
    ["dyseldorfi", "Düsseldorf"],
    ["dusseldorfi", "Düsseldorf"],
    ["düsseldorfi", "Düsseldorf"],
    ["kolni", "Köln"],
    ["kölni", "Köln"],
    ["mynihu", "München"],
    ["munihu", "München"],
    ["munich", "München"],
    ["vjena", "Wien"],
    ["vjeni", "Wien"],
    ["wien", "Wien"],
  ]);
  return replacements.get(key) || value;
}

function detectAntoktonZone(cityName) {
  if (!cityName) return null;
  const lower = cityName.toLowerCase().trim();
  // Kontrollo në fshatra/vendbanime (me aliase)
  if (ALIAS_TO_ALBANIAN[lower]) return ALIAS_TO_ALBANIAN[lower].zone;
  // Kontrollo me alias partial match
  for (const [alias, place] of Object.entries(ALIAS_TO_ALBANIAN)) {
    if (lower.includes(alias) || alias.includes(lower)) return place.zone;
  }
  // Kontrollo në qytetet kryesore
  for (const [zone, cities] of Object.entries(ANTOKTON_ZONES)) {
    if (cities.some(c => c.toLowerCase() === lower || lower.includes(c.toLowerCase()) || c.toLowerCase().includes(lower))) {
      return zone;
    }
  }
  return null;
}

// Kthe emrin shqip nëse ekziston alias për emrin e huaj
function getAlbanianName(nameRaw) {
  if (!nameRaw) return null;
  const lower = nameRaw.toLowerCase().trim();
  if (ALIAS_TO_ALBANIAN[lower]) return ALIAS_TO_ALBANIAN[lower];
  for (const [alias, place] of Object.entries(ALIAS_TO_ALBANIAN)) {
    if (lower === alias || lower.includes(alias)) return place;
  }
  return null;
}

function getLocalSuggestions(query) {
  if (!query || query.trim().length < 2) return [];
  const q = normalizeSearch(query);
  return ALL_SUGGESTIONS.filter(s => {
    const searchable = [
      s.label,
      s.displayLabel,
      s.fullAddress,
      s.city,
      s.country,
      s.zone,
      ...(s.aliases || []),
    ].map(normalizeSearch).join(" ");
    return searchable.includes(q);
  }).slice(0, 6);
}

// Nominatim (OpenStreetMap) search — kthen vendndodhje reale nga e mbarë bota
async function searchNominatim(query) {
  if (!query || query.trim().length < 3) return [];
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=8&addressdetails=1&accept-language=sq,en`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'sq,en' } });
    const data = await res.json();
    const results = data.map(item => {
      const addr = item.address || {};
      const rawCity = addr.city || addr.town || addr.village || addr.hamlet || addr.suburb || addr.municipality || addr.county || item.display_name.split(",")[0];
      const countryRaw = normalizeCountryName(addr.country || "");

      // Zëvendëso me emrin shqip nëse ekziston alias
      const albanianPlace = getAlbanianName(rawCity) || getAlbanianName(item.display_name.split(",")[0]);
      const city = normalizeCityName(albanianPlace ? albanianPlace.city : rawCity);

      // Kontrollojmë nëse është territor Antokton
      const detectedZone = albanianPlace ? albanianPlace.zone : getFallbackAntoktonZone(city, addr.country || "");
      const isAntokton = !!detectedZone;
      const country = isAntokton ? "Antokton" : normalizeCountryName(countryRaw);

      const nearCity = albanianPlace?.near || "";
      const postcode = addr.postcode || "";
      const houseNumber = addr.house_number || "";

      // Pastro emrin bilingual të rrugës: "Rue Piers - Piersstraat" → "Rue Piers"
      // Nominatim shpesh kthen "Emri FR - Emri NL" ose "Emri NL / Emri FR"
      const rawRoad = addr.road || addr.pedestrian || addr.footway || "";
      const road = rawRoad.includes(" - ") ? rawRoad.split(" - ")[0].trim()
                 : rawRoad.includes(" / ")  ? rawRoad.split(" / ")[0].trim()
                 : rawRoad;

      // Pastro emrin bilingual të qytetit/komunës (p.sh. "Molenbeek-Saint-Jean - Sint-Jans-Molenbeek")
      const rawCityClean = rawCity.includes(" - ") ? rawCity.split(" - ")[0].trim()
                         : rawCity.includes(" / ")  ? rawCity.split(" / ")[0].trim()
                         : rawCity;
      const cleanCity = isAntokton ? city : normalizeCityName(rawCityClean);

      // streetPart: "Rue Piers 7" (rruga + numri ndërtesës)
      const streetPart = road && houseNumber ? `${road} ${houseNumber}` : road || "";

      // fullAddress = "Rue Piers 7, 1080 Molenbeek-Saint-Jean, Belgjikë"
      const fullAddress = isAntokton
        ? [streetPart || null, city, nearCity || null, "Antokton"].filter(Boolean).join(", ")
        : [streetPart || null, postcode && cleanCity ? `${postcode} ${cleanCity}` : cleanCity || null, countryRaw || null].filter(Boolean).join(", ") || item.display_name.split(",").slice(0, 3).join(",").trim();

      const displayLabel = isAntokton
        ? [streetPart || null, city, nearCity || null, "Antokton"].filter(Boolean).join(", ")
        : fullAddress;

      return {
        label: item.display_name,
        displayLabel,
        fullAddress,
        city,
        zone: detectedZone || "",
        country,
        is_antokton: isAntokton,
        from_nominatim: true,
        _priority: isAntokton ? 0 : 1
      };
    });

    // Rendit: Antokton para, pastaj tjerat
    return results.sort((a, b) => a._priority - b._priority);
  } catch {
    return [];
  }
}

export default function LocationPicker({ value = {}, onChange, className = "" }) {
  const initAddress = value.address || [value.city, value.country && value.country !== "Antokton" ? value.country : (value.zone ? null : "Antokton")].filter(Boolean).join(", ") || "";
  const [inputVal, setInputVal] = useState(initAddress);
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState(value.country ? value : null);
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const nextAddress = value.address || [value.city, value.country && value.country !== "Antokton" ? value.country : (value.zone ? null : "Antokton")].filter(Boolean).join(", ") || "";
    setInputVal(nextAddress);
    setParsed(value.country || value.address ? value : null);
  }, [value.address, value.city, value.country, value.zone]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const parseAddressWithAI = async (addr) => {
    if (!addr.trim() || addr.trim().length < 3) return;
    setLoading(true);
    setParsed(null);
    const prompt = `Nga kjo adresë/vendndodhje: "${addr}"
Nxirr dhe kthe JSON me:
- city: emri i qytetit/fshatit/lagjes
- country_raw: emri i vendit/shtetit
- is_antokton: true nëse është pjesë e trojeve historike shqiptare (Shqipëri, Kosovë, Maqedonia e Veriut zonat shqiptare, Greqia veriore Epiri, Serbia Jugore Lugina), false nëse jo
- antokton_country: nëse is_antokton true kthe "Antokton", ndryshe kthe emrin e shtetit: Gjermani, Angli, Austri, Zvicër, Itali, Francë, Belgjikë, Hollandë, Suedi, Norvegji, Danimarkë, Spanjë, ose vendin e saktë
- precision_suggestion: "sakte" nëse ka rrugë/numër konkret, "perafersisht" nëse lagje/fshat/zonë
Kthe VETËM JSON.`;
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            city: { type: "string" },
            country_raw: { type: "string" },
            is_antokton: { type: "boolean" },
            antokton_country: { type: "string" },
            precision_suggestion: { type: "string" }
          }
        }
      });
      const country = normalizeCountryName(res.antokton_country || res.country_raw || "");
      const city = normalizeCityName(res.city || "");
      const zone = res.is_antokton ? getFallbackAntoktonZone(city, res.country_raw || res.antokton_country || "") : null;
      // Ruaj adresën e plotë të tipuar nga përdoruesi (rruga + qyteti), jo vetëm qytetin
      const result = {
        address: addr,        // adresa e plotë siç e tipoi përdoruesi
        country,
        zone: zone || "",
        city,
        location_precision: res.precision_suggestion || "sakte",
        is_antokton: res.is_antokton
      };
      setParsed(result);
      onChange(result);
    } catch (e) {
      console.error("Location parse error:", e);
    } finally {
      setLoading(false);
    }
  };

  const selectSuggestion = (s) => {
    // fullAddress ka formatin e saktë Google Maps (rrugë, numër, qytet, shtet)
    // displayLabel është versioni i shkurtuar për UI
    const addressForDB = s.fullAddress || s.displayLabel || s.label;
    setInputVal(addressForDB); // trego adresën e plotë në input pas zgjedhjes
    setSuggestions([]);
    setShowDropdown(false);
    setActiveIdx(-1);
    const result = {
      address: addressForDB,
      country: normalizeCountryName(s.country || ""),
      zone: s.zone || "",
      city: normalizeCityName(s.city || ""),
      location_precision: "sakte",
      is_antokton: s.is_antokton || false
    };
    setParsed(result);
    onChange(result);
  };

  const handleInput = (val) => {
    setInputVal(val);
    setParsed(null);
    setActiveIdx(-1);
    onChange({
      ...(parsed || value),
      address: val,
      country: parsed?.country || value.country || "",
      zone: parsed?.zone || value.zone || "",
      city: parsed?.city || value.city || "",
      location_precision: parsed?.location_precision || value.location_precision || "sakte",
    });
    // Shfaq menjëherë sugjerime lokale
    const local = getLocalSuggestions(val);
    setSuggestions(local);
    setShowDropdown(local.length > 0);

    clearTimeout(debounceRef.current);
    if (val.trim().length >= 2) {
      debounceRef.current = setTimeout(async () => {
        // Kërko në Nominatim (OpenStreetMap) për sugjerime botërore
        const remote = await searchNominatim(val);
        const localFresh = getLocalSuggestions(val);
        // Merge: lokalet Antokton para, pastaj Nominatim Antokton, pastaj tjerat
        const remoteNew = remote.filter(r => !localFresh.some(l => normalizeSearch(l.city) === normalizeSearch(r.city) && l.country === r.country));
        const antoktonRemote = remoteNew.filter(r => r.is_antokton);
        const otherRemote = remoteNew.filter(r => !r.is_antokton);
        const merged = [...localFresh, ...antoktonRemote, ...otherRemote].slice(0, 9);
        setSuggestions(merged);
        setShowDropdown(merged.length > 0);
      }, 350);
    }
  };

  const handleKeyDown = (e) => {
    if (!showDropdown || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[activeIdx]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      setShowDropdown(false);
      // AI thirret vetëm nëse ende nuk ka rezultat dhe nuk ka gjetur asgjë Nominatim
      if (!parsed && inputVal.trim().length >= 4 && suggestions.length === 0) {
        clearTimeout(debounceRef.current);
        parseAddressWithAI(inputVal);
      }
    }, 200);
  };

  const handleClear = () => {
    setInputVal("");
    setParsed(null);
    setSuggestions([]);
    setShowDropdown(false);
    onChange({ address: "", country: "", zone: "", city: "", location_precision: "sakte" });
    inputRef.current?.focus();
  };

  const handlePrecisionChange = (p) => {
    const updated = { ...parsed, location_precision: p };
    setParsed(updated);
    onChange(updated);
  };

  return (
    <div className={`space-y-2 ${className}`} ref={wrapperRef}>
      {/* Input */}
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none z-10" />
        <input
          ref={inputRef}
          value={inputVal}
          onChange={e => handleInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setShowDropdown(true);
          }}
          onBlur={handleBlur}
          placeholder="Shkruaj qytetin, lagjen, adresën…"
          autoComplete="off"
          className="w-full h-11 pl-9 pr-9 rounded-lg text-sm text-white placeholder:text-white/35 outline-none transition-colors"
          style={{ background: 'var(--bg, rgba(255,255,255,0.05))', border: '1px solid var(--line, rgba(255,255,255,0.15))', color: '#fff' }}
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8ab4ff] animate-spin" />}
        {!loading && inputVal && (
          <button onMouseDown={e => { e.preventDefault(); handleClear(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Dropdown */}
        {showDropdown && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden z-50 shadow-2xl"
            style={{ background: '#0f1a2e', border: '1px solid rgba(138,180,255,0.2)' }}>
            {suggestions.map((s, i) => (
              <button
                key={i}
                onMouseDown={e => { e.preventDefault(); selectSuggestion(s); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors"
                style={{ background: i === activeIdx ? 'rgba(138,180,255,0.12)' : 'transparent' }}
                onMouseEnter={() => setActiveIdx(i)}
              >
                <span className="text-sm">
                  {s.is_antokton ? "🏔" : "📍"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white/90 font-medium truncate">
                    {s.fullAddress || s.displayLabel || s.label.split(",").slice(0,3).join(",").trim()}
                  </div>
                  {s.zone && (
                    <div className="text-xs text-[#9bffd6]/70">{s.zone.split("—")[0].trim()}</div>
                  )}
                  {!s.zone && s.country && (
                    <div className="text-xs text-white/35">{s.country}</div>
                  )}
                </div>
                {s.is_antokton && (
                  <span className="text-[10px] text-[#9bffd6] bg-[#9bffd6]/10 px-1.5 py-0.5 rounded-full shrink-0">Antokton</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Parsed chips */}
      {parsed && (parsed.city || parsed.country) && (
        <div className="flex flex-wrap items-center gap-2 px-1">
          {parsed.country && (
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[#8ab4ff]/15 text-[#8ab4ff] border border-[#8ab4ff]/25">
              🌍 {parsed.country}
            </span>
          )}
          {parsed.zone && (
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[#9bffd6]/10 text-[#9bffd6] border border-[#9bffd6]/25">
              📍 {parsed.zone.split("—")[0].trim()}
            </span>
          )}
          {parsed.city && (
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-white/8 text-white/70 border border-white/15">
              🏙 {parsed.city}
            </span>
          )}
          {parsed.is_antokton && (
            <span className="text-xs text-[#9bffd6]/70 italic">✓ Antokton</span>
          )}
        </div>
      )}

      {/* Precision */}
      {parsed && (
        <div className="flex flex-wrap items-center gap-3 px-1">
          <span className="text-xs text-white/40 shrink-0">Saktësia:</span>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="radio" value="sakte" checked={(parsed.location_precision || "sakte") === "sakte"}
              onChange={() => handlePrecisionChange("sakte")} className="accent-[#8ab4ff] w-3.5 h-3.5" />
            <span className="text-xs text-white/70">📍 Adresë</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="radio" value="perafersisht" checked={parsed.location_precision === "perafersisht"}
              onChange={() => handlePrecisionChange("perafersisht")} className="accent-[#8ab4ff] w-3.5 h-3.5" />
            <span className="text-xs text-white/70">🔵 Zonë</span>
          </label>
        </div>
      )}

      {loading && !parsed && (
        <p className="text-xs text-white/40 px-1">Duke analizuar vendndodhjen…</p>
      )}
    </div>
  );
}

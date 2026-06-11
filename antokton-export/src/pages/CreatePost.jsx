import React, { useState, useEffect } from "react";
import { base44 } from "@/api/antoktonClient";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, CheckCircle, Loader2, Eye, MapPin, Briefcase } from "lucide-react";
import LocationPicker from "../components/job/LocationPicker";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import AIJobDescriptionGenerator from "../components/job/AIJobDescriptionGenerator";
import { PHONE_PLACEHOLDER, getInternationalPhoneError, isValidInternationalPhone, normalizePhoneForCountry } from "@/lib/phone";
import { getContactInfoInTextMessage } from "@/lib/contentContactGuard";
import { hasEarlyMemberPremiumAccess } from "@/utils/premiumAccess";

const ALL_PROFESSIONS = [
  "3D Artist","Administrator","Agjent Shitjesh","Agjent Sigurimesh","Agjent Udhëtimesh",
  "Agronom","Aktor","Amballazhues","Arkitekt","Arkivist","Artist","Asansorist",
  "Asistent Ekzekutiv","Asistent Social","Auditor","Autor","Avokat",
  "Babysitter","Bankier","Bartender","Berber","Biçiklist","Blegtori","Bojaxhi","Botuesi","Broker","Bujqësi",
  "Concierge","Cyber Security",
  "DJ","Dado","Data Analyst","Data Scientist","Dekorator","Dentist","Dërgestar","Developer","DevOps","Dizajner Grafik",
  "Edukator","Editor Video","Ekonomist","Elektricist","Elektroauto Teknik","Event Planner",
  "Farmacist","Fizioterapist","Florist","Fotograf","Fshesarakeq","Furrtari",
  "Gazetar","Guide Turistik",
  "Hekurpunues","Hidraulik","Hotel Manager","Housekeeper",
  "IT Support","Ilustrator","Infermier","Instruktor","Instruktor Notimi","Instalues","Instalues Kamera","Instalues Satelitor","Interpret","Inxhinier",
  "Kamarier","Kameraman","Konsulent Financiar","Konsulent HR","Kontabilist","Kontrollor Cilësie","Koordinator Projektesh","Kopshtar","Kosmetist","Kozmetolog","Kujdestar Moshe","Kuzhinier",
  "Laborant","Librarist","Logjistikan","Lulishte",
  "Magazinier","Marangoz","Marketing","Masazhist","Mekanik","Menaxher","Mirëmbajtje","Mjek","Mizanxhi","Moderator","Motion Designer","Muzeal","Muzikant","Mësues",
  "Ndërtim","Ndihmes Kuzhine","Noter",
  "Operator Makine",
  "Pastiçer","Pastrim","Pastrues Dritaresh","Përkthyes","Peshkatar","Pilot","Pjatalarës","Postier","Prezantues","Producent Muzikor","Programues","Psikolog","Punëtor Fabrike","Punëtor i Pakualifikuar",
  "QA Tester",
  "Radiolog","Recepsionist","Redaktor","Regjisor","Rekrutues","Restaurator","Roje/Siguri","Rrobaqepës","Rrjetist",
  "Saldator","Scenograf","Sekretar","Shofer","Shitës","Shtypshkronjës","Sistem Administrator","Skenarist","Sound Engineer","Spa Therapist",
  "Teknik Alarmi","Teknik HVAC","Teknik Kompjuterik","Teknik Solar","Teknik Telefonie","Teknik Veterinar","Teknik Zëri","Teknik Ftohje","Teknik Drite","Terapeut","Trajner Personal",
  "UI/UX Designer","Ushqim dhe Pije",
  "Veteriner","Videograf",
  "Web Designer","Wedding Planner",
  "Xhamaxhi","Xhelatier",
].sort();

const categories = [
  { value: "pune", label: "Punë" },
  { value: "sherbime", label: "Shërbime" },
  { value: "pazar", label: "Pazar" },
  { value: "edukim", label: "Edukim" },
];

// Profesionet që kanë lidhje me ushqimin/pijen dhe kërkojnë Halal standard
const HALAL_REQUIRED_PROFESSIONS = [
  "Kamarier", "Kuzhinier", "Barista", "Bartender", "Furrtari", "Pastiçer",
  "Ndihmes Kuzhine", "Pjatalarës", "Ushqim dhe Pije", "Koki"
];

const isHalalRequired = (profession) => {
  if (!profession || profession === "__other__") return false;
  const p = profession.toLowerCase();
  return HALAL_REQUIRED_PROFESSIONS.some(h => h.toLowerCase() === p) ||
    p.includes("kuzhin") || p.includes("kamarier") || p.includes("ushqim") ||
    p.includes("pije") || p.includes("restorant") || p.includes("bar") ||
    p.includes("kafe") || p.includes("pastiç") || p.includes("furr") ||
    p.includes("pjata");
};

const PAZAR_CATEGORIES = [
  {
    value: "prona", label: "🏠 Prona",
    subcategories: [
      { value: "shtepi", label: "Shtëpi" },
      { value: "banesa", label: "Banesa / Apartamente" },
      { value: "dyqane", label: "Dyqane" },
      { value: "restorante", label: "Restorante & Lokale" },
      { value: "hotele", label: "Hotele" },
      { value: "magazina", label: "Magazina & Depo" },
      { value: "toka", label: "Toka" },
      { value: "troje", label: "Troje" },
      { value: "ara", label: "Ara" },
      { value: "pemishte", label: "Pemishte" },
      { value: "pyje", label: "Pyje" },
    ]
  },
  {
    value: "makina", label: "🚗 Makina & Automjete",
    subcategories: [
      { value: "vetura", label: "Vetura" },
      { value: "kamion", label: "Kamion & Furgon" },
      { value: "motorr", label: "Motorra & Skuter" },
      { value: "autobus", label: "Autobus & Minibus" },
      { value: "traktor", label: "Traktor & Pajisje Bujqësore" },
      { value: "pjese_kembimi", label: "Pjesë Këmbimi" },
    ]
  },
  {
    value: "makineri", label: "⚙️ Makineri & Pajisje Industriale",
    subcategories: [
      { value: "makineri_ndertimi", label: "Makineri Ndërtimi" },
      { value: "makineri_prodhimi", label: "Makineri Prodhimi" },
      { value: "gjenerator", label: "Gjenerator & Energji" },
      { value: "pompa", label: "Pompa & Kompresore" },
      { value: "makineri_tjeter", label: "Makineri të tjera" },
    ]
  },
  {
    value: "vegla_pune", label: "🔧 Vegla & Pajisje Pune",
    subcategories: [
      { value: "vegla_dore", label: "Vegla Dore" },
      { value: "vegla_elektrike", label: "Vegla Elektrike" },
      { value: "pajisje_ndertimi", label: "Pajisje Ndërtimi" },
      { value: "pajisje_bujqesore", label: "Pajisje Bujqësore" },
      { value: "vegla_tjeter", label: "Vegla të tjera" },
    ]
  },
  {
    value: "elektronike", label: "📱 Elektronikë & Teknologji",
    subcategories: [
      { value: "telefon", label: "Telefona & Tableta" },
      { value: "kompjuter", label: "Kompjuterë & Laptop" },
      { value: "tv_audio", label: "TV, Audio & Video" },
      { value: "foto_video", label: "Foto & Video" },
      { value: "gaming", label: "Gaming & Konzola" },
      { value: "aksesor_elektronike", label: "Aksesore Elektronike" },
    ]
  },
  {
    value: "mobilje_shtepi", label: "🛋️ Mobilje & Shtëpi",
    subcategories: [
      { value: "mobilje", label: "Mobilje" },
      { value: "pajisje_shtepie", label: "Pajisje Shtëpie" },
      { value: "dekor", label: "Dekor & Aksesorë" },
      { value: "kopshti", label: "Kopsht & Ballkon" },
    ]
  },
  {
    value: "veshje", label: "👗 Veshje & Aksesore",
    subcategories: [
      { value: "veshje_femra", label: "Veshje Femra" },
      { value: "veshje_meshkuj", label: "Veshje Meshkuj" },
      { value: "veshje_femije", label: "Veshje Fëmijë" },
      { value: "kepuce", label: "Këpucë" },
      { value: "canta", label: "Çanta & Aksesore" },
    ]
  },
  {
    value: "femije", label: "👶 Fëmijë & Lodra",
    subcategories: [
      { value: "lodra", label: "Lodra" },
      { value: "karrocë", label: "Karrocë & Siguri Fëmijësh" },
      { value: "veshje_femije_pazar", label: "Veshje Fëmijësh" },
      { value: "libra_femije", label: "Libra & Shkollë" },
    ]
  },
  {
    value: "sport_hobi", label: "⚽ Sport & Hobi",
    subcategories: [
      { value: "pajisje_sportive", label: "Pajisje Sportive" },
      { value: "bicikleta", label: "Bicikleta & Skuterë" },
      { value: "kampim", label: "Kampim & Natyrë" },
      { value: "muzike_art", label: "Art" },
      { value: "koleksion", label: "Koleksione" },
    ]
  },
  {
    value: "libra_media", label: "📚 Libra & Media",
    subcategories: [
      { value: "libra", label: "Libra" },
      { value: "revista", label: "Revista & Gazeta" },
      { value: "cd_dvd", label: "CD, DVD & Muzikë" },
    ]
  },
  {
    value: "ushqim_bujqesi", label: "🌾 Ushqim & Bujqësi",
    subcategories: [
      { value: "prodhime_bujqesore", label: "Prodhime Bujqësore" },
      { value: "kafsh", label: "Kafshë & Shpezë" },
      { value: "fare_fidane", label: "Farëra & Fidane" },
    ]
  },
  {
    value: "dhurime", label: "🎁 Dhurime Falas",
    subcategories: [
      { value: "dhurim_tjeter", label: "Gjëra falas" },
    ]
  },
  {
    value: "tjeter_pazar", label: "📦 Të tjera",
    subcategories: [
      { value: "tjeter", label: "Artikuj të tjerë" },
    ]
  },
];

const serviceFields = [
  { value: "ndertim", label: "Ndërtim" },
  { value: "transport", label: "Transport" },
  { value: "perkthime", label: "Përkthime" },
  { value: "it_teknologji", label: "IT & Teknologji" },
  { value: "avokat", label: "Avokat" },
  { value: "financiare", label: "Financiare" },
  { value: "menaxheriale", label: "Menaxheriale" },
  { value: "tjeter", label: "Shërbime të tjera" },
];

const educationFields = [
  { value: "shkolla", label: "Shkolla dhe qendra edukimi" },
  { value: "trajnim_profesional", label: "Trajnime profesionale" },
  { value: "kurse_online", label: "Kurse online" },
  { value: "materiale_edukative", label: "Materiale edukative" },
  { value: "mentorim", label: "Mentorim / këshillim" },
  { value: "tjeter", label: "Tjetër edukim" },
];

const BASE_COUNTRIES = [
  "Antokton","Angli","Arabi","Austri","Belgjikë","Bosnje","Bullgari","Çeki","Danimarkë",
  "Egjipt","Emiratet","Estoni","Finlandë","Francë","Gjermani","Hungari",
  "Islandë","Irlandë","Irak","Itali","Katar","Kroaci","Kuvajt","Letoni",
  "Lituani","Luksemburg","Maltë","Hollandë","Norvegji","Poloni","Portugali",
  "Rumani","Siri","Sllovaki","Slloveni","Skoci","Spanjë","Suedi","Turki","Zvicër"
];

const zonesByCountry = {
  "Antokton": [
    "Rajoni Verior — Dardhania",
    "Rajoni Perëndimor — Iliria",
    "Rajoni Jugor — Epiri",
    "Rajoni Lindor — Thesalia & Maqedonia"
  ],
  "Gjermani": ["Lindja", "Perëndimi", "Veriu", "Jugu", "Qendra"],
  "Angli": ["Londër", "Midlands", "Veriu", "Jugu", "Perëndimi", "Lindja"],
  "Austri": ["Vienna", "Tirol", "Salzburg", "Styria", "Vorarlberg"],
  "Zvicër": ["Zürich", "Bern", "Geneva", "Basel", "Ticino"],
  "Francë": ["Île-de-France", "Provence", "Rhône-Alpes", "Normandie", "Bretagne"],
  "Itali": ["Veriu", "Qendra", "Jugu", "Ishujt"],
  "Belgjikë": ["Flanders", "Wallonia", "Brussels"],
  "Hollandë": ["Amsterdam", "Rotterdam", "Utrecht", "Den Haag"],
  "Suedi": ["Stockholm", "Göteborg", "Malmö", "Uppsala"],
  "Norvegji": ["Oslo", "Bergen", "Trondheim", "Stavanger"],
  "Danimarkë": ["Kopenhagë", "Aarhus", "Odense", "Aalborg"],
  "Spanjë": ["Madrid", "Barcelona", "Andalucia", "Valencia", "Basque"],
};

const citiesByZone = {
  "Rajoni Verior — Dardhania": [
    "Bujanovc", "Ferizaj", "Gjakovë", "Gjilan", "Kaçanik", "Kratovë",
    "Kriva Pallankë", "Kumanovë", "Leskovac", "Medvegjë", "Mitrovicë",
    "Nish", "Pejë", "Podujevë", "Preshevë", "Prijepolje", "Prishtinë",
    "Prokuplje", "Prizren", "Rozhajë", "Shkup", "Sjenicë", "Tutin",
    "Vushtrri", "Vranjë", "Zveçan"
  ].sort(),
  "Rajoni Perëndimor — Iliria": [
    "Apolloni", "Berat", "Burrel", "Durrës", "Elbasan", "Fier",
    "Gramsh", "Guci", "Kavajë", "Krujë", "Kukës", "Lezhë", "Librazhd",
    "Lushnjë", "Plavë", "Pukë", "Rodon", "Shkodër", "Tiranë", "Tivar",
    "Tuzi", "Ulqin", "Vlorë"
  ].sort(),
  "Rajoni Jugor — Epiri": [
    "Ambraki", "Arta", "Astakos", "Butrinti", "Delvinë", "Dodona",
    "Dropull", "Filiates", "Gjirokastër", "Igumenicë", "Janinë",
    "Konispol", "Margëlliç", "Mesologji", "Nafpaktos", "Paramithi",
    "Prevezë", "Sarandë", "Tesproti", "Tefëri"
  ].sort(),
  "Rajoni Lindor — Thesalia & Maqedonia": [
    "Dibër", "Edesa", "Farsala", "Florinë", "Gostivar", "Kavala",
    "Kërçovë", "Kozani", "Kostur", "Larisa", "Lerin", "Liknid",
    "Manastir", "Ohër", "Pella", "Pogradec", "Selanik", "Strumicë",
    "Strugë", "Tetovë", "Trikala", "Veria", "Volos", "Voskopojë"
  ].sort(),
  "Lindja": ["Berlin", "Leipzig", "Dresden", "Potsdam", "Erfurt"],
  "Perëndimi": ["Köln", "Düsseldorf", "Dortmund", "Essen", "Bonn"],
  "Veriu": ["Hamburg", "Bremen", "Hannover", "Kiel", "Lübeck"],
  "Jugu": ["München", "Stuttgart", "Nürnberg", "Augsburg", "Freiburg"],
  "Qendra": ["Frankfurt", "Wiesbaden", "Mainz", "Kassel", "Marburg"],
  "Londër": ["Central London", "East London", "West London", "North London", "South London"],
  "Midlands": ["Birmingham", "Nottingham", "Leicester", "Coventry"],
  "Vienna": ["Wien", "Graz", "Linz", "Salzburg"],
  "Zürich": ["Zürich", "Winterthur", "Zug"],
  "Île-de-France": ["Paris", "Versailles", "Saint-Denis"],
};

// Fjalë që mund të tregojnë mospërputhje me standardin etik
const FLAGGED_WORDS = ["bar", "nightclub", "kazino", "alkool", "alkol", "disko", "casino", "pub", "night club", "strip"];

const containsFlaggedWords = (text) => {
  if (!text) return false;
  const lower = text.toLowerCase();
  return FLAGGED_WORDS.some(w => lower.includes(w));
};

const emptyForm = {
  title: "", description: "", category: "pune", job_type: "",
  country: "", zone: "", city: "", zones: [], profession: "", salary_info: "", contact_info: "",
  phone_number: "", phone_app: "telefon",
  source_url: "", show_source_url: false,
  author_profile_url: "", import_author_profile_url: "", show_author_profile_url: false,
  is_open_call: false, donation_platform: "", donation_type: "",
  property_subcategory: "", property_deal_type: "", service_field: "",
  education_field: "", education_level_target: "",
  pazar_category: "", pazar_subcategory: "",
  certifications: [],
  halal_standard: "",
  is_halal_compliant: false,
  moderation_status: "pending"
};

const PHONE_APPS = [
  { value: "telefon", label: "Telefon" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "viber", label: "Viber" },
  { value: "telegram", label: "Telegram" },
  { value: "bip", label: "BiP" },
  { value: "signal", label: "Signal" },
  { value: "tjeter", label: "Tjetër" },
];

const PHONE_APP_ICONS = {
  telefon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-white/70"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.73 9.5a19.79 19.79 0 01-3.07-8.67A2 2 0 012.64 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.59a16 16 0 006.29 6.29l.96-.96a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>,
  whatsapp: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-[#25D366]"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>,
  viber: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-[#7360F2]"><path d="M11.4 0C5.5.3.3 5.2.3 11.1c0 2.2.6 4.3 1.8 6.1L.3 24l6.9-1.8c1.7 1 3.6 1.5 5.6 1.5h.1c5.8 0 10.8-4.7 11.1-10.5C24.2 7 20.3 2.5 15.2.6 14 .2 12.7 0 11.4 0zm4.1 16.9c-.3.8-1.5 1.5-2.1 1.6-.5.1-1.2.1-1.9-.1-.4-.1-1-.3-1.7-.6-3-1.3-5-4.3-5.1-4.5-.1-.2-1.2-1.6-1.2-3s.7-2.1 1-2.4c.2-.3.5-.4.7-.4h.5c.2 0 .4 0 .5.4.2.4.7 1.7.8 1.8.1.1.1.3 0 .5-.1.1-.2.3-.3.4-.1.1-.3.3-.4.4-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.5 1.5.3.1.5.1.7-.1.2-.2.7-.8.9-1.1.2-.3.4-.2.7-.1.3.1 1.8.9 2.1 1 .3.2.5.3.6.4.1.2 0 .9-.4 1.5z"/></svg>,
  telegram: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-[#2AABEE]"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.96 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>,
  bip: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-[#1DA1F2]"><rect width="24" height="24" rx="5" fill="#1DA1F2"/><text x="3" y="17" fontSize="11" fill="white" fontWeight="bold">BiP</text></svg>,
  signal: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-[#3A76F0]"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 4.5a7.5 7.5 0 110 15 7.5 7.5 0 010-15zm0 2a5.5 5.5 0 100 11 5.5 5.5 0 000-11zm0 2a3.5 3.5 0 110 7 3.5 3.5 0 010-7z"/></svg>,
  tjeter: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-white/50"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18.01"/></svg>,
};

export default function CreatePost() {
  const [user, setUser] = useState(null);
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [customCountry, setCustomCountry] = useState("");
  const [customZone, setCustomZone] = useState("");
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = await base44.auth.isAuthenticated();
      setIsAuth(authenticated);
      if (authenticated) {
        const me = await base44.auth.me();
        setUser(me);
      }
    };
    checkAuth();
  }, []);

  const isAdminOrMod = user?.role === "admin" || user?.role === "moderator";
  const [customPosterName, setCustomPosterName] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuth) { base44.auth.redirectToLogin(); return; }

    if (!hasEarlyMemberPremiumAccess(user) && (user.posts_remaining || 0) <= 0 && user.subscription_type === "none") {
      alert("Nuk ke njoftime të mbetura. Ju lutem bëj një abonim për të postuar.");
      window.location.href = "/Subscriptions";
      return;
    }

    // Validim: job_type detyrimisht për punë dhe shërbime
    if ((form.category === "pune" || form.category === "sherbime") && !form.job_type) {
      alert(`Ju lutem zgjidhni nëse ${form.category === "pune" ? "Ofroni apo Kërkoni punë" : "Ofroni apo Kërkoni shërbim"}.`);
      return;
    }

    // Validim: checkbox i detyrueshëm për punë dhe shërbime
    if ((form.category === "pune" || form.category === "sherbime") && !form.is_halal_compliant) {
      alert("Duhet të konfirmoni përputhshmërinë me standardin e platformës për të vazhduar.");
      return;
    }

    // Validim Halal: i detyrueshëm për profesionet ushqim/pije
    if ((form.category === "pune" || form.category === "sherbime") && isHalalRequired(form.profession)) {
      if (!form.halal_standard) {
        alert("⚠️ Ju lutem specifikoni nëse aplikoni standardin Halal. Kjo fushë është e detyrueshme për profesionet e ushqimit dhe pijeve.");
        return;
      }
      if (form.halal_standard === "jo") {
        const confirmed = window.confirm(
          "⚠️ Kujdes: Duke qenë se ky profesion kërkon standarte të larta që kanë lidhje me sigurinë dhe vlerat ushqimore, mosnjohja dhe mos-aplikimi i standartit Halal mund të jetë një nga shkaqet që njoftimit tuaj t'i refuzohet publikimi.\n\nDëshironi të vazhdoni gjithsesi?"
        );
        if (!confirmed) return;
      }
    }

    // Paralajmërim për fjalë problematike
    const combinedText = `${form.title} ${form.description}`;
    const contactInfoWarning = getContactInfoInTextMessage(combinedText);
    if (contactInfoWarning) {
      alert(contactInfoWarning);
      return;
    }
    if ((form.category === "pune" || form.category === "sherbime") && containsFlaggedWords(combinedText)) {
      const proceed = window.confirm(
        "⚠️ Paralajmërim: Përmbajtja juaj mund të mos përputhet me standardin e platformës. Ju lutemi rishikoni përpara publikimit.\n\nDëshironi të vazhdoni?"
      );
      if (!proceed) return;
    }

    const finalCountry = form.country === "__other__" ? (customCountry.trim() || "Tjetër") : form.country;
    const phoneNumber = normalizePhoneForCountry(
      form.phone_number,
      finalCountry,
      `${form.city || ""} ${form.address || ""} ${form.description || ""}`
    );
    if (phoneNumber && !isValidInternationalPhone(phoneNumber)) {
      alert(getInternationalPhoneError("Numri i telefonit"));
      return;
    }

    setLoading(true);
    const defaultName = user?.first_name && user?.surname
      ? `${user.first_name} ${user.surname}`
      : user?.first_name || user?.full_name || user?.email?.split('@')[0] || "Anonim";
    const displayName = (isAdminOrMod && customPosterName.trim()) ? customPosterName.trim() : defaultName;

    const typedProfession = (form.profession || "").trim();
    const isKnownProfession = ALL_PROFESSIONS.some((item) => item.toLowerCase() === typedProfession.toLowerCase());
    if (typedProfession && !isKnownProfession) {
      await base44.entities.ProfessionSuggestion.create({ suggested_name: typedProfession, user_email: user.email });
    }
    if (form.country === "__other__" && customCountry.trim()) {
      await base44.entities.CountrySuggestion.create({ suggested_name: customCountry.trim(), user_email: user.email });
    }

    const finalProfession = typedProfession || "Tjetër";
    const publishStatus = isAdminOrMod ? "approved" : "pending";

    await base44.entities.Job.create({
      ...form,
      profession: finalProfession,
      country: finalCountry,
      zone: (form.zones || []).join(", "), // ruaj si string për retrokompatibilitet
      phone_number: phoneNumber || "",
      phone_app: phoneNumber ? (form.phone_app || "telefon") : "",
      status: publishStatus,
      moderation_status: publishStatus,
      is_halal_compliant: form.is_halal_compliant || false,
      poster_name: displayName,
      author_photo_url: user?.profile_photo_url || "",
      likes_count: 0, dislikes_count: 0, comments_count: 0,
      halal_standard: form.halal_standard || null,
    });

    // Ruaj nëse është halal="po" për të treguar mesazh të veçantë
    if (isAdminOrMod) {
      setSuccess("approved");
    } else if (form.halal_standard === "po") {
      setSuccess("halal_yes");
    } else {
      setSuccess(true);
    }

    if (user.posts_remaining > 0) {
      await base44.auth.updateMe({ posts_remaining: user.posts_remaining - 1 });
    }

    setLoading(false);
  };

  if (!isAuth) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#8ab4ff]/20 to-[#9bffd6]/20 flex items-center justify-center mx-auto mb-6">
          <Send className="w-7 h-7 text-[#8ab4ff]" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Posto një njoftim</h2>
        <p className="text-white/60 mb-6">Duhet të jesh i kyçur për të postuar një njoftim.</p>
        <Button onClick={() => base44.auth.redirectToLogin()} className="bg-[#0b1020] hover:bg-[#1a2340] text-white">
          Hyr në llogari
        </Button>
      </div>
    );
  }

  if (success) {
    const isHalalYes = success === "halal_yes";
    const isApproved = success === "approved";
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Njoftimi u dërgua!</h2>
        {isApproved ? (
          <p className="text-white/60 mb-6">Njoftimi u publikua direkt.</p>
        ) : isHalalYes ? (
          <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm">
            ✅ Faleminderit që aplikoni standardin Halal! Njoftimi juaj është <strong>në pritje për miratim</strong> nga moderatorët.
          </div>
        ) : (
          <p className="text-white/60 mb-6">Njoftimi juaj është në pritje për aprovim nga moderatorët.</p>
        )}
        <Button onClick={() => { setSuccess(false); setCustomCountry(""); setForm(emptyForm); }}
          className="bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] hover:opacity-90 border-0">
          Posto një tjetër
        </Button>
      </motion.div>
    );
  }

  const showJobType = form.category === "pune" || form.category === "sherbime";
  const showProfession = form.category === "pune" || form.category === "sherbime";
  const showServiceField = form.category === "sherbime";
  const showEducationFields = form.category === "edukim";
  const showPropertyFields = false; // Prona është nënkategori e Pazarit tani
  const showSalary = form.category === "pune" || form.category === "sherbime" || form.category === "pazar" || form.category === "edukim";
  const showPazarFields = form.category === "pazar";
  const selectedPazarCat = PAZAR_CATEGORIES.find(c => c.value === form.pazar_category);
  const pazarSubcategories = selectedPazarCat?.subcategories || [];
  const needsHalal = (form.category === "pune" || form.category === "sherbime") &&
    isHalalRequired(form.profession);
  const valueInfoLabel = form.category === "pazar"
    ? "Çmimi / vlera"
    : form.category === "edukim"
      ? "Tarifa / kostoja"
      : form.category === "sherbime"
        ? "Pagesa / buxheti"
        : "Informacion rreth pagës";
  const valueInfoPlaceholder = form.category === "pazar"
    ? "P.sh. 350€, i diskutueshëm, falas"
    : form.category === "edukim"
      ? "P.sh. falas, 50€/muaj, me bursë"
      : form.category === "sherbime"
        ? "P.sh. sipas marrëveshjes, 25€/orë"
        : "P.sh. 2000-3000€/muaj";

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>Posto Njoftim</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>Plotëso formularën për të postuar njoftimin tënd</p>
      </div>

      <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSubmit}
        className="rounded-2xl p-6 sm:p-8 space-y-5"
        style={{ backgroundColor: 'var(--bg2)', borderColor: 'var(--line)', borderWidth: '1px' }}>

        {/* Titulli */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium" style={{ color: 'var(--text)' }}>Titulli *</Label>
          <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="P.sh. Kërkohet punëtor ndërtimi në Gjermani" className="h-11"
            style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--text)' }} />
        </div>

        {/* Kategoria + Lloji */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium" style={{ color: 'var(--text)' }}>Kategoria *</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v, job_type: v === "pune" || v === "sherbime" ? "ofroj" : "", service_field: "", education_field: "", education_level_target: "", pazar_category: "", pazar_subcategory: "" })}>
              <SelectTrigger className="h-11" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--text)' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {showJobType && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                {form.category === "pune" ? "Lloji i punës" : "Lloji i shërbimit"} <span className="text-red-400">*</span>
              </Label>
              <Select value={form.job_type} onValueChange={(v) => setForm({ ...form, job_type: v })}>
                <SelectTrigger className="h-11" style={{ backgroundColor: 'var(--bg)', borderColor: !form.job_type ? 'rgba(239,68,68,0.5)' : 'var(--line)', color: 'var(--text)' }}>
                  <SelectValue placeholder={form.category === "pune" ? "Ofroj apo Kërkoj punë?" : "Ofroj apo Kërkoj shërbim?"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ofroj">{form.category === "pune" ? "Ofroj punë" : "Ofroj shërbim"}</SelectItem>
                  <SelectItem value="kerkoj">{form.category === "pune" ? "Kërkoj punë" : "Kërkoj shërbim"}</SelectItem>
                </SelectContent>
              </Select>
              {!form.job_type && <p className="text-xs text-red-400">Ky fushe është e detyrueshme</p>}
            </div>
          )}
        </div>

        {/* Fusha e shërbimit */}
        {showServiceField && (
          <div className="space-y-1.5">
            <Label className="text-sm font-medium" style={{ color: 'var(--text)' }}>Fusha e shërbimit</Label>
            <Select value={form.service_field} onValueChange={(v) => setForm({ ...form, service_field: v })}>
              <SelectTrigger className="h-11" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--text)' }}>
                <SelectValue placeholder="Zgjidh fushën..." />
              </SelectTrigger>
              <SelectContent>
                {serviceFields.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Pazar - Kategoria & Nënkategoria */}
        {showPazarFields && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium" style={{ color: 'var(--text)' }}>Kategoria e Pazarit *</Label>
              <Select value={form.pazar_category} onValueChange={(v) => setForm({ ...form, pazar_category: v, pazar_subcategory: "" })}>
                <SelectTrigger className="h-11" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--text)' }}>
                  <SelectValue placeholder="Zgjidh kategorinë..." />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {PAZAR_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {pazarSubcategories.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium" style={{ color: 'var(--text)' }}>Nënkategoria</Label>
                <Select value={form.pazar_subcategory} onValueChange={(v) => setForm({ ...form, pazar_subcategory: v })}>
                  <SelectTrigger className="h-11" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--text)' }}>
                    <SelectValue placeholder="Zgjidh nënkategorinë..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {pazarSubcategories.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {/* Edukim - Kategoria & niveli */}
        {showEducationFields && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium" style={{ color: 'var(--text)' }}>Lloji i edukimit</Label>
              <Select value={form.education_field} onValueChange={(v) => setForm({ ...form, education_field: v })}>
                <SelectTrigger className="h-11" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--text)' }}>
                  <SelectValue placeholder="Zgjidh llojin..." />
                </SelectTrigger>
                <SelectContent>
                  {educationFields.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium" style={{ color: 'var(--text)' }}>Niveli / audienca</Label>
              <Input
                value={form.education_level_target}
                onChange={(e) => setForm({ ...form, education_level_target: e.target.value })}
                placeholder="P.sh. fillestar, profesional, fëmijë, të rritur"
                className="h-11"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--text)' }}
              />
            </div>
          </div>
        )}

        {/* Profesioni */}
        {showProfession && (
          <div className="space-y-1.5">
            <Label className="text-sm font-medium" style={{ color: 'var(--text)' }}>Profesioni</Label>
            <Input
              list="profession-suggestions"
              value={form.profession}
              onChange={(e) => setForm({ ...form, profession: e.target.value })}
              placeholder="Shkruaj profesionin, p.sh. Programues"
              className="h-11"
              style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--text)' }}
            />
            <datalist id="profession-suggestions">
              {ALL_PROFESSIONS.map(p => <option key={p} value={p} />)}
            </datalist>
            <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
              Shkruaj nga shkronja e parë për sugjerime; nëse profesioni mungon, ruhet si sugjerim i ri.
            </p>
          </div>
        )}

        {/* Certifikime profesionale */}
        {showProfession && (
          <div className="space-y-2">
            <Label className="text-sm font-medium" style={{ color: 'var(--text)' }}>Certifikime Profesionale</Label>
            {(form.certifications || []).map((cert, idx) => (
              <div key={idx} className="flex gap-2">
                <Input
                  value={cert}
                  onChange={(e) => {
                    const updated = [...form.certifications];
                    updated[idx] = e.target.value;
                    setForm({ ...form, certifications: updated });
                  }}
                  placeholder={`Certifikim ${idx + 1} (p.sh. ISO 9001, HACCP, First Aid...)`}
                  className="h-10 flex-1"
                  style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--text)' }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const updated = form.certifications.filter((_, i) => i !== idx);
                    setForm({ ...form, certifications: updated });
                  }}
                  className="px-2 text-red-400 hover:text-red-300 transition-colors text-lg"
                  title="Hiq"
                >×</button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setForm({ ...form, certifications: [...(form.certifications || []), ""] })}
              className="text-xs flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed transition-all"
              style={{ color: 'var(--accent)', borderColor: 'rgba(138,180,255,0.35)', background: 'rgba(138,180,255,0.06)' }}
            >
              + Shto certifikim tjetër profesional
            </button>
          </div>
        )}

        {/* Standardi Halal - i detyrueshëm për profesionet ushqim/pije */}
        {needsHalal && (
          <div className="space-y-2 p-4 rounded-xl border" style={{ backgroundColor: 'rgba(251,191,36,0.07)', borderColor: 'rgba(251,191,36,0.35)' }}>
            <Label className="text-sm font-semibold flex items-center gap-2" style={{ color: '#fbbf24' }}>
              🕌 Standardi Halal <span className="text-red-400 text-xs font-normal">(i detyrueshëm)</span>
            </Label>
            <p className="text-xs text-white/60">
              Meqenëse profesioni juaj ka lidhje me ushqimin ose pijet, specifikoni nëse aplikoni standardin Halal.
            </p>
            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, halal_standard: "po" })}
                className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  form.halal_standard === "po"
                    ? "bg-green-500/20 border-green-500/60 text-green-300"
                    : "bg-white/5 border-white/20 text-white/70 hover:bg-white/10"
                }`}
              >
                ✅ Po, aplikoj standardin Halal
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, halal_standard: "jo" })}
                className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  form.halal_standard === "jo"
                    ? "bg-red-500/20 border-red-500/60 text-red-300"
                    : "bg-white/5 border-white/20 text-white/70 hover:bg-white/10"
                }`}
              >
                ❌ Jo, nuk aplikoj
              </button>
            </div>
            {!form.halal_standard && (
              <p className="text-xs text-red-400 flex items-center gap-1">⚠️ Ju lutem zgjidhni një opsion para publikimit</p>
            )}
            {form.halal_standard === "jo" && (
              <p className="text-xs text-amber-400 flex items-center gap-1 p-2 rounded bg-amber-500/10 border border-amber-500/20">
                ⚠️ Duke qenë se ky profesion kërkon standarte të larta që kanë lidhje me sigurinë dhe vlerat ushqimore, mosnjohja dhe mos-aplikimi i standartit Halal mund të jetë një nga shkaqet që njoftimit tuaj t'i refuzohet publikimi.
              </p>
            )}
          </div>
        )}

        {/* Vendndodhja */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium" style={{ color: 'var(--text)' }}>Vendndodhja</Label>
            <LocationPicker
              value={{ address: form.address || "", country: form.country, zone: form.zone, city: form.city, location_precision: form.location_precision }}
              onChange={loc => setForm(f => ({ ...f, address: loc.address, country: loc.country, zone: loc.zone, city: loc.city, location_precision: loc.location_precision }))}
            />
          </div>

          {/* Zonat e punës - vetëm për kategorinë "pune" */}
          {form.category === "pune" && (
            <div className="space-y-2 p-4 rounded-xl border" style={{ backgroundColor: 'rgba(138,180,255,0.05)', borderColor: 'rgba(138,180,255,0.25)' }}>
              <Label className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--text)' }}>
                📍 Zonat ku ofrohet / kërkohet puna <span className="text-white/40 text-xs">(opsionale — mund të zgjedhësh disa)</span>
              </Label>
              <p className="text-xs text-white/50">
                Nëse adresa ose qyteti është vendosur sipër, kjo pjesë mund të lihet bosh. Zgjidh zona vetëm kur njoftimi vlen për disa vende.
              </p>

              {/* Zonat e Antoktonit */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">🏔️ Antokton</p>
                <div className="flex flex-wrap gap-2">
                  {zonesByCountry["Antokton"].map(zone => {
                    const selected = (form.zones || []).includes(zone);
                    return (
                      <button
                        key={zone}
                        type="button"
                        onClick={() => {
                          const zones = form.zones || [];
                          setForm(f => ({ ...f, zones: selected ? zones.filter(z => z !== zone) : [...zones, zone] }));
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          selected
                            ? "bg-[#8ab4ff]/20 border-[#8ab4ff]/60 text-[#8ab4ff]"
                            : "bg-white/5 border-white/15 text-white/60 hover:border-white/30 hover:text-white/80"
                        }`}
                      >
                        {selected ? "✓ " : ""}{zone}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Shtetet e Europës */}
              <div className="space-y-1.5 mt-2">
                <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">🌍 Shtete të tjera</p>
                <div className="max-h-32 overflow-y-auto rounded-xl border border-white/10 bg-[#0f172a]/70 p-2">
                  <div className="flex flex-wrap gap-2">
                  {Object.keys(zonesByCountry).filter(c => c !== "Antokton").map(country => {
                    const countryZones = zonesByCountry[country];
                    const selectedInCountry = countryZones.filter(z => (form.zones || []).includes(z));
                    const allSelected = selectedInCountry.length === countryZones.length;
                    const someSelected = selectedInCountry.length > 0 && !allSelected;
                    return (
                      <button
                        key={country}
                        type="button"
                        onClick={() => {
                          const zones = form.zones || [];
                          if (allSelected) {
                            setForm(f => ({ ...f, zones: zones.filter(z => !countryZones.includes(z)) }));
                          } else {
                            const toAdd = countryZones.filter(z => !zones.includes(z));
                            setForm(f => ({ ...f, zones: [...zones, ...toAdd] }));
                          }
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          allSelected
                            ? "bg-[#9bffd6]/20 border-[#9bffd6]/60 text-[#9bffd6]"
                            : someSelected
                              ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                              : "bg-white/5 border-white/15 text-white/60 hover:border-white/30 hover:text-white/80"
                        }`}
                        title={someSelected ? `${selectedInCountry.length}/${countryZones.length} zona të zgjedhura` : ""}
                      >
                        {allSelected ? "✓ " : someSelected ? "~ " : ""}{country}
                      </button>
                    );
                  })}
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={customZone}
                    onChange={(e) => setCustomZone(e.target.value)}
                    placeholder="Tjetër, specifiko..."
                    className="h-9 text-sm"
                    style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--text)' }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const value = customZone.trim();
                      if (!value) return;
                      setForm(f => ({ ...f, zones: [...new Set([...(f.zones || []), value])] }));
                      setCustomZone("");
                    }}
                    className="h-9 rounded-lg border border-white/15 px-3 text-sm font-medium text-white/70 hover:border-white/30 hover:text-white"
                  >
                    Shto
                  </button>
                </div>
              </div>

              {/* Zonat e zgjedhura - summary */}
              {(form.zones || []).length > 0 && (
                <div className="mt-2 p-2 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-xs text-white/50 mb-1.5">Zonat e zgjedhura ({form.zones.length}):</p>
                  <div className="flex flex-wrap gap-1.5">
                    {form.zones.map(z => (
                      <span key={z} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[#8ab4ff]/15 text-[#8ab4ff] border border-[#8ab4ff]/30">
                        {z}
                        <button type="button" onClick={() => setForm(f => ({ ...f, zones: f.zones.filter(x => x !== z) }))} className="hover:text-red-400 transition-colors leading-none">×</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {(!form.zones || form.zones.length === 0) && (
                <p className="text-xs text-white/35">Nuk është zgjedhur zonë shtesë. Njoftimi do përdorë vendndodhjen e vendosur sipër.</p>
              )}
            </div>
          )}
        </div>

        {/* Përshkrimi */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium" style={{ color: 'var(--text)' }}>Përshkrimi *</Label>
            <AIJobDescriptionGenerator currentDescription={form.description} title={form.title}
              category={form.category} profession={form.profession}
              onApply={(desc) => setForm({ ...form, description: desc })} />
          </div>
          <Textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Përshkruaj njoftimin në detaje..." className="min-h-[140px] resize-none"
            style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--text)' }}
            lang="sq" spellCheck={true} />
          <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
            Mos vendos numër telefoni ose email në tekstin e njoftimit. Telefoni, emaili dhe linket vendosen te fushat e kontaktit më poshtë.
          </p>
        </div>

        {/* Paga */}
        {showSalary && (
          <div className="space-y-1.5">
            <Label className="text-sm font-medium" style={{ color: 'var(--text)' }}>{valueInfoLabel}</Label>
            <Input value={form.salary_info} onChange={(e) => setForm({ ...form, salary_info: e.target.value })}
              placeholder={valueInfoPlaceholder} className="h-11"
              style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--text)' }} />
          </div>
        )}

        {/* Kontakt */}
        <div className="space-y-3">
          <Label className="text-sm font-medium" style={{ color: 'var(--text)' }}>Kontakt</Label>
          
          {/* Numri i telefonit + Platforma */}
          <div className="space-y-1.5">
            <Label className="text-xs" style={{ color: 'var(--muted)' }}>Numri i telefonit (opsional)</Label>
            <div className="flex gap-2">
              <Input
                value={form.phone_number}
                onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                placeholder={PHONE_PLACEHOLDER}
                className="h-11 min-w-0"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--text)', flex: '1 1 0' }}
              />
              <Select value={form.phone_app} onValueChange={(v) => setForm({ ...form, phone_app: v })}>
                <SelectTrigger className="h-11 flex-shrink-0 w-[140px]" style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', color: '#ffffff' }}>
                  <div className="flex items-center gap-2">
                    {PHONE_APP_ICONS[form.phone_app]}
                    <span className="text-sm">{PHONE_APPS.find(a => a.value === form.phone_app)?.label}</span>
                  </div>
                </SelectTrigger>
                <SelectContent style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)' }}>
                  {PHONE_APPS.map(a => (
                    <SelectItem key={a.value} value={a.value}>
                      <div className="flex items-center gap-2">
                        {PHONE_APP_ICONS[a.value]}
                        <span>{a.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Email / info tjetër */}
          <div className="space-y-1.5">
            <Label className="text-xs" style={{ color: 'var(--muted)' }}>Email ose info tjetër kontakti (opsional)</Label>
            <Input value={form.contact_info} onChange={(e) => setForm({ ...form, contact_info: e.target.value })}
              placeholder="Email, adresë, faqe interneti..." className="h-11 break-all"
              style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--text)' }} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs" style={{ color: 'var(--muted)' }}>Linku i kontaktit nga burimi (opsional)</Label>
            <Input
              value={form.author_profile_url}
              onChange={(e) => setForm({ ...form, author_profile_url: e.target.value, import_author_profile_url: e.target.value })}
              placeholder="https://facebook.com/profile... ose link kontakti"
              className="h-11 break-all"
              style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--text)' }}
            />
            <label className="flex cursor-pointer items-start gap-2 text-xs" style={{ color: 'var(--muted)' }}>
              <input
                type="checkbox"
                checked={Boolean(form.show_author_profile_url)}
                onChange={(e) => setForm({ ...form, show_author_profile_url: e.target.checked })}
                className="mt-0.5 h-4 w-4 accent-[#8ab4ff]"
              />
              <span>Shfaq linkun e kontaktit publikisht. Lëre pa zgjedhur nëse duhet të ruhet vetëm privatisht për admin/moderator.</span>
            </label>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs" style={{ color: 'var(--muted)' }}>Linku i burimit / postimit origjinal (opsional)</Label>
            <Input
              value={form.source_url}
              onChange={(e) => setForm({ ...form, source_url: e.target.value })}
              placeholder="https://..."
              className="h-11 break-all"
              style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--text)' }}
            />
            <label className="flex cursor-pointer items-start gap-2 text-xs" style={{ color: 'var(--muted)' }}>
              <input
                type="checkbox"
                checked={Boolean(form.show_source_url)}
                onChange={(e) => setForm({ ...form, show_source_url: e.target.checked })}
                className="mt-0.5 h-4 w-4 accent-[#8ab4ff]"
              />
              <span>Shfaq linkun publikisht. Lëre pa zgjedhur nëse linku duhet të ruhet vetëm për gjurmim të postimit origjinal.</span>
            </label>
          </div>
        </div>



        {/* Checkbox i detyrueshëm - Standard Etik & Hallall (vetëm për punë dhe shërbime) */}
        {(form.category === "pune" || form.category === "sherbime") && (
          <div className="p-4 rounded-xl border" style={{ backgroundColor: 'rgba(138,180,255,0.06)', borderColor: 'rgba(138,180,255,0.3)' }}>
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="halal-compliant"
                checked={form.is_halal_compliant}
                onChange={(e) => setForm({ ...form, is_halal_compliant: e.target.checked })}
                className="mt-0.5 w-4 h-4 rounded accent-[#8ab4ff] cursor-pointer flex-shrink-0"
              />
              <div className="flex-1">
                <label htmlFor="halal-compliant" className="text-sm font-medium text-white cursor-pointer select-none">
                  Konfirmoj që ky njoftim është në përputhje me standardin etik dhe hallall të platformës <span className="text-red-400">*</span>
                </label>
                <p className="text-xs mt-1.5 text-white/50 leading-relaxed">
                  ℹ️ Platforma publikon vetëm njoftime që përputhen me standardin etik dhe hallall, për të ruajtur një ambient të përshtatshëm për komunitetin.
                </p>
              </div>
            </div>
            {!form.is_halal_compliant && (
              <p className="text-xs text-red-400 mt-2 ml-7">⚠️ Ky konfirmim është i detyrueshëm para publikimit.</p>
            )}
          </div>
        )}

        {/* Emri i postuesit - vetëm për admin/moderator */}
        {isAdminOrMod && (
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2">
            <Label className="text-sm font-semibold text-amber-300 flex items-center gap-2">
              🛡️ Posto si (Admin/Moderator)
            </Label>
            <p className="text-xs text-white/50">
              Lër bosh për të postuar me emrin tënd. Shkruaj emër tjetër nëse dëshiron që postimi të shfaqet nga një emër specifik.
            </p>
            <Input
              value={customPosterName}
              onChange={e => setCustomPosterName(e.target.value)}
              placeholder={`Lihet bosh → postohet si "${user?.first_name || user?.full_name || user?.email?.split('@')[0]}"`}
              className="h-10"
              style={{ backgroundColor: 'var(--bg)', borderColor: 'rgba(251,191,36,0.3)', color: 'var(--text)' }}
            />
          </div>
        )}

        {/* Preview + Submit */}
        <div className="pt-4 space-y-3">
          <Button type="button" onClick={() => setShowPreview(!showPreview)} variant="outline"
            className="w-full h-11 text-sm font-medium border-white/20 bg-white/5 text-white hover:bg-white/10">
            <Eye className="w-4 h-4 mr-2" />
            {showPreview ? "Fshih Paraparjen" : "Shiko Paraparjen"}
          </Button>

          {showPreview && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              className="rounded-xl border border-white/10 p-5" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <p className="text-white/40 text-xs mb-3">Paraparja e njoftimit:</p>
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">
                    {categories.find(c => c.value === form.category)?.label}
                  </Badge>
                  {form.job_type && (form.category === "pune" || form.category === "sherbime") && (
                    <Badge variant="outline" className="text-xs border-white/20 text-white/60">
                      {form.job_type === "ofroj" ? (form.category === "pune" ? "Ofroj punë" : "Ofroj shërbim") : (form.category === "pune" ? "Kërkoj punë" : "Kërkoj shërbim")}
                    </Badge>
                  )}
                  {form.profession && (
                    <Badge variant="outline" className="text-xs border-white/20 text-white/60">
                      <Briefcase className="w-3 h-3 mr-1" />{form.profession}
                    </Badge>
                  )}
                </div>
                <h3 className="break-words text-lg font-bold text-white">{form.title || "Titulli i njoftimit"}</h3>
                {(form.city || form.country) && (
                  <div className="flex items-center gap-1.5 text-sm text-white/40">
                    <MapPin className="w-4 h-4" />
                    {[form.city, form.zone, form.country === "__other__" ? customCountry : form.country].filter(Boolean).join(", ")}
                  </div>
                )}
                {form.salary_info && (
                  <div className="px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-300 text-sm">
                    💰 {form.salary_info}
                  </div>
                )}
                <p className="break-words text-white/70 text-sm line-clamp-3">{form.description || "Përshkrimi do të shfaqet këtu..."}</p>
              </div>
            </motion.div>
          )}

          <Button type="submit" disabled={loading} className="w-full h-12 text-sm font-semibold"
            style={{ backgroundImage: 'linear-gradient(135deg, #8ab4ff 0%, #9bffd6 100%)', color: '#0b1020', opacity: loading ? 0.8 : 1 }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            Dërgo Njoftimin
          </Button>
          {!isAdminOrMod && (
            <p className="text-sm font-medium text-center mt-3 flex items-center justify-center gap-2" style={{ color: 'var(--accent)' }}>
              <span>⚠️</span> Njoftimi do të shqyrtohet nga moderatorët para publikimit.
            </p>
          )}
        </div>
      </motion.form>
    </div>
  );
}

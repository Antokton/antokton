export const PAZAR_CATEGORIES = [
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
    ],
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
    ],
  },
  {
    value: "makineri", label: "⚙️ Makineri & Pajisje Industriale",
    subcategories: [
      { value: "makineri_ndertimi", label: "Makineri Ndërtimi" },
      { value: "makineri_prodhimi", label: "Makineri Prodhimi" },
      { value: "gjenerator", label: "Gjenerator & Energji" },
      { value: "pompa", label: "Pompa & Kompresore" },
      { value: "makineri_tjeter", label: "Makineri të tjera" },
    ],
  },
  {
    value: "vegla_pune", label: "🔧 Vegla & Pajisje Pune",
    subcategories: [
      { value: "vegla_dore", label: "Vegla Dore" },
      { value: "vegla_elektrike", label: "Vegla Elektrike" },
      { value: "pajisje_ndertimi", label: "Pajisje Ndërtimi" },
      { value: "pajisje_bujqesore", label: "Pajisje Bujqësore" },
      { value: "vegla_tjeter", label: "Vegla të tjera" },
    ],
  },
  {
    value: "elektronike", label: "📱 Elektronikë & Teknologji",
    subcategories: [
      { value: "telefon", label: "Telefona & Tableta" },
      { value: "kompjuter", label: "Kompjuterë & Laptop" },
      { value: "tv_audio", label: "TV, Audio & Video" },
      { value: "foto_video", label: "Foto & Video" },
      { value: "gaming", label: "Gaming & Konzola" },
      { value: "aksesor_elektronike", label: "Aksesorë Elektronike" },
    ],
  },
  {
    value: "mobilje_shtepi", label: "🛋️ Mobilje & Shtëpi",
    aliases: ["mobilje", "shtepi"],
    subcategories: [
      { value: "mobilje", label: "Mobilje" },
      { value: "kuzhine", label: "Kuzhinë" },
      { value: "pajisje_shtepie", label: "Pajisje Shtëpie" },
      { value: "dekor", label: "Dekor & Aksesorë" },
      { value: "kopshti", label: "Kopsht & Ballkon" },
    ],
  },
  {
    value: "veshje", label: "👗 Veshje & Aksesorë",
    subcategories: [
      { value: "veshje_femra", label: "Veshje Femra" },
      { value: "veshje_meshkuj", label: "Veshje Meshkuj" },
      { value: "veshje_femije", label: "Veshje Fëmijë" },
      { value: "kepuce", label: "Këpucë" },
      { value: "canta", label: "Çanta & Aksesorë" },
    ],
  },
  {
    value: "femije", label: "👶 Fëmijë & Lodra",
    subcategories: [
      { value: "lodra", label: "Lodra" },
      { value: "karroce", label: "Karrocë & Siguri Fëmijësh" },
      { value: "veshje_femije_pazar", label: "Veshje Fëmijësh" },
      { value: "libra_femije", label: "Libra & Shkollë" },
    ],
  },
  {
    value: "sport_hobi", label: "⚽ Sport & Hobi",
    aliases: ["bicikleta", "art"],
    subcategories: [
      { value: "pajisje_sportive", label: "Pajisje Sportive" },
      { value: "bicikleta", label: "Bicikleta & Skuterë" },
      { value: "kampim", label: "Kampim & Natyrë" },
      { value: "muzike_art", label: "Art" },
      { value: "koleksion", label: "Koleksione" },
    ],
  },
  {
    value: "libra_media", label: "📚 Libra & Media",
    aliases: ["libra"],
    subcategories: [
      { value: "libra", label: "Libra" },
      { value: "revista", label: "Revista & Gazeta" },
      { value: "cd_dvd", label: "CD, DVD & Muzikë" },
    ],
  },
  {
    value: "ushqim_bujqesi", label: "🌾 Ushqim & Bujqësi",
    aliases: ["bujqesia"],
    subcategories: [
      { value: "prodhime_bujqesore", label: "Prodhime Bujqësore" },
      { value: "kafsh", label: "Kafshë & Shpezë" },
      { value: "fare_fidane", label: "Farëra & Fidane" },
    ],
  },
  {
    value: "dhurime", label: "🎁 Dhurime Falas",
    subcategories: [
      { value: "dhurim_tjeter", label: "Gjëra falas" },
    ],
  },
  {
    value: "tjeter_pazar", label: "📦 Të tjera",
    aliases: ["aksesore", "mjete"],
    subcategories: [
      { value: "tjeter", label: "Artikuj të tjerë" },
    ],
  },
];

export const cleanPazarLabel = (label = "") => String(label).replace(/^[^\p{L}\p{N}]+/u, "").trim();

export const PAZAR_NAV_CATEGORIES = [
  { value: "all", label: "Të gjitha" },
  ...PAZAR_CATEGORIES.map((category) => ({ ...category, label: cleanPazarLabel(category.label) })),
];

export function findPazarCategory(value) {
  return PAZAR_CATEGORIES.find((category) => category.value === value || category.aliases?.includes(value));
}

export function pazarCategoryMatches(category, value) {
  if (!category || value === "all") return true;
  const categoryGroup = findPazarCategory(category);
  const valueGroup = findPazarCategory(value);
  const normalizedCategory = categoryGroup?.value || category;
  const normalizedValue = valueGroup?.value || value;
  return normalizedCategory === normalizedValue;
}

export const CATEGORIES = [
  { value: "pune", label: "Punë" },
  { value: "prona", label: "Prona" },
  { value: "edukim", label: "Edukim" },
  { value: "bamiresi", label: "Bamirësi" },
  { value: "media", label: "Media" },
  { value: "sherbime", label: "Shërbime" },
];

export const LISTING_TYPES = [
  { value: "pune", label: "Punë" },
  { value: "shtepi", label: "Shtëpi" },
  { value: "sherbim", label: "Shërbim" },
  { value: "reklame", label: "Reklamë" },
  { value: "tjeter", label: "Tjetër" },
];

export const SOURCES = [
  { value: "facebook_group", label: "Facebook Group" },
  { value: "facebook_page", label: "Facebook Page" },
  { value: "manual", label: "Manual" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "telegram", label: "Telegram" },
  { value: "tjeter", label: "Tjetër" },
];

export const STATUS_LABELS = {
  draft: "Draft",
  ne_pritje: "Në pritje",
  miratuar: "Miratuar",
  publikuar: "Publikuar",
  refuzuar: "Refuzuar",
  arkivuar: "Arkivuar",
};

export const STATUS_COLORS = {
  draft: "bg-white/10 text-white/60",
  ne_pritje: "bg-yellow-500/20 text-yellow-300",
  miratuar: "bg-blue-500/20 text-blue-300",
  publikuar: "bg-green-500/20 text-green-300",
  refuzuar: "bg-red-500/20 text-red-300",
  arkivuar: "bg-white/5 text-white/30",
};

export const COUNTRIES_DATA = [
  {
    name: "Shqipëri",
    regions: [
      { name: "Tiranë", cities: ["Tiranë", "Kamëz", "Vorë"] },
      { name: "Durrës", cities: ["Durrës", "Shijak", "Rrashbull"] },
      { name: "Vlorë", cities: ["Vlorë", "Sarandë", "Himarë", "Fier"] },
      { name: "Shkodër", cities: ["Shkodër", "Lezhë", "Laç"] },
      { name: "Korçë", cities: ["Korçë", "Pogradec", "Librazhd"] },
      { name: "Elbasan", cities: ["Elbasan", "Cërrik", "Peqin"] },
      { name: "Gjirokastër", cities: ["Gjirokastër", "Tepelenë", "Permët"] },
      { name: "Berat", cities: ["Berat", "Kuçovë", "Çorovodë"] },
    ]
  },
  {
    name: "Kosovë",
    regions: [
      { name: "Prishtinë", cities: ["Prishtinë", "Fushë Kosovë", "Lipjan", "Gllogoc"] },
      { name: "Prizren", cities: ["Prizren", "Dragash", "Suharekë"] },
      { name: "Pejë", cities: ["Pejë", "Istog", "Klinë", "Deçan"] },
      { name: "Mitrovicë", cities: ["Mitrovicë", "Vushtrri", "Skenderaj"] },
      { name: "Gjakovë", cities: ["Gjakovë", "Rahovec", "Malishevë"] },
      { name: "Gjilan", cities: ["Gjilan", "Viti", "Kamenicë"] },
      { name: "Ferizaj", cities: ["Ferizaj", "Kaçanik", "Shtimë"] },
    ]
  },
  {
    name: "Maqedoni e Veriut",
    regions: [
      { name: "Shkup", cities: ["Shkup", "Tetovë", "Gostivar"] },
      { name: "Tetovë", cities: ["Tetovë", "Jegunovcë", "Bogovinjë"] },
      { name: "Gostivar", cities: ["Gostivar", "Vrapciste", "Zhelino"] },
    ]
  },
  {
    name: "Mal i Zi",
    regions: [
      { name: "Ulqin", cities: ["Ulqin", "Pllavë", "Krajë"] },
      { name: "Podgoricë", cities: ["Podgoricë", "Tuzi"] },
    ]
  },
  {
    name: "Serbi",
    regions: [
      { name: "Preshevë", cities: ["Preshevë", "Bujanoc", "Medvegjë"] },
    ]
  },
  {
    name: "Gjermani",
    regions: [
      { name: "Bayern", cities: ["München", "Nürnberg", "Augsburg"] },
      { name: "Baden-Württemberg", cities: ["Stuttgart", "Mannheim", "Karlsruhe"] },
      { name: "Berlin", cities: ["Berlin"] },
      { name: "Hamburg", cities: ["Hamburg"] },
      { name: "Nordrhein-Westfalen", cities: ["Köln", "Düsseldorf", "Dortmund", "Essen"] },
      { name: "Hessen", cities: ["Frankfurt", "Wiesbaden", "Kassel"] },
    ]
  },
  {
    name: "Itali",
    regions: [
      { name: "Lombardia", cities: ["Milano", "Brescia", "Bergamo"] },
      { name: "Veneto", cities: ["Venezia", "Verona", "Padova"] },
      { name: "Toscana", cities: ["Firenze", "Pisa", "Siena"] },
      { name: "Lazio", cities: ["Roma"] },
      { name: "Emilia-Romagna", cities: ["Bologna", "Parma", "Modena"] },
    ]
  },
  {
    name: "Greqi",
    regions: [
      { name: "Atikë", cities: ["Athinë", "Pireas", "Kallithea"] },
      { name: "Maqedoni Qendrore", cities: ["Selanik", "Kavala"] },
    ]
  },
  {
    name: "Zvicër",
    regions: [
      { name: "Zürich", cities: ["Zürich", "Winterthur"] },
      { name: "Bern", cities: ["Bern"] },
      { name: "Basel", cities: ["Basel"] },
      { name: "Geneva", cities: ["Geneva", "Lausanne"] },
    ]
  },
  {
    name: "Austri",
    regions: [
      { name: "Wien", cities: ["Wien"] },
      { name: "Graz", cities: ["Graz"] },
      { name: "Salzburg", cities: ["Salzburg"] },
    ]
  },
  {
    name: "Belgjikë",
    regions: [
      { name: "Bruksell", cities: ["Bruksell", "Anvers", "Gent"] },
    ]
  },
  {
    name: "Holandë",
    regions: [
      { name: "Noord-Holland", cities: ["Amsterdam", "Haarlem"] },
      { name: "Zuid-Holland", cities: ["Rotterdam", "Den Haag"] },
    ]
  },
  {
    name: "Francë",
    regions: [
      { name: "Île-de-France", cities: ["Paris"] },
      { name: "Provence", cities: ["Marseille", "Nice"] },
      { name: "Auvergne-Rhône-Alpes", cities: ["Lyon", "Grenoble"] },
    ]
  },
  {
    name: "Mbretëri e Bashkuar",
    regions: [
      { name: "England", cities: ["Londër", "Manchester", "Birmingham", "Leeds"] },
      { name: "Scotland", cities: ["Edinburgh", "Glasgow"] },
    ]
  },
  {
    name: "SHBA",
    regions: [
      { name: "New York", cities: ["New York City", "Buffalo"] },
      { name: "Michigan", cities: ["Detroit", "Dearborn"] },
      { name: "Illinois", cities: ["Chicago"] },
      { name: "Florida", cities: ["Miami", "Orlando"] },
      { name: "California", cities: ["Los Angeles", "San Francisco"] },
    ]
  },
  {
    name: "Kanada",
    regions: [
      { name: "Ontario", cities: ["Toronto", "Hamilton"] },
      { name: "British Columbia", cities: ["Vancouver"] },
      { name: "Quebec", cities: ["Montreal"] },
    ]
  },
  {
    name: "Australi",
    regions: [
      { name: "New South Wales", cities: ["Sydney"] },
      { name: "Victoria", cities: ["Melbourne"] },
    ]
  },
  { name: "Tjetër", regions: [] },
];
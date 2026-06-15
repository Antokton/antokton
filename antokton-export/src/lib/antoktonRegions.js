export const ANTOKTON_REGION_DATA = [
  {
    value: "qender",
    label: "Antokton Qendër",
    zone: "Antokton Qendër — Iliria Perëndimore & Dardania e Jugut",
    subregions: [
      "Qarku Shkodër", "Qarku Lezhë", "Qarku Kukës", "Qarku Dibër", "Qarku Durrës",
      "Qarku Tiranë", "Qarku Elbasan", "Qarku Fier", "Qarku Berat", "Qarku Korçë",
      "Qarku Vlorë", "Qarku Gjirokastër", "Prishtinë District", "Prizren District",
      "Pejë District", "Gjakovë District", "Mitrovicë District", "Gjilan District",
      "Ferizaj District"
    ],
    cities: [
      "Shkodër", "Lezhë", "Kukës", "Dibër", "Durrës", "Tiranë", "Elbasan", "Fier",
      "Berat", "Korçë", "Vlorë", "Gjirokastër", "Prishtinë", "Prizren", "Pejë",
      "Gjakovë", "Mitrovicë", "Gjilan", "Ferizaj"
    ]
  },
  {
    value: "perendim",
    label: "Antokton Perëndim",
    zone: "Antokton Perëndim — Malësia e Jugut, Qendrore & Veriut",
    subregions: [
      "Malësia e Jugut", "Malësia Qendrore", "Malësia e Veriut"
    ],
    cities: [
      "Plav", "Gusinje", "Petnjica", "Berane", "Andrijevica", "Ulcinj", "Bar",
      "Tuzi", "Podgorica", "Cetinje", "Budva", "Kotor", "Tivat", "Herceg Novi",
      "Bijelo Polje", "Mojkovac", "Kolasin", "Niksic", "Danilovgrad", "Pluzine",
      "Zabljak", "Savnik", "Pljevlja"
    ]
  },
  {
    value: "veri",
    label: "Antokton Veri",
    zone: "Antokton Veri — Dardania Qendrore, Veriore & Vojvodina",
    subregions: [
      "Dardania Qendrore", "Dardania e Veriut", "Vojvodina"
    ],
    cities: [
      "Pčinja", "Jabllanica", "Toplica", "Pirot", "Nišava", "Rasina", "Raška",
      "Moravica", "Zlatibor", "Zajecar", "Pomoravlje", "Šumadija", "Kolubara",
      "Mačva", "Belgrad", "Podunavlje", "Braničevo", "Bor", "South Bačka",
      "North Bačka", "West Bačka", "Central Banat", "North Banat", "South Banat",
      "Srem"
    ]
  },
  {
    value: "lindje",
    label: "Antokton Lindje",
    zone: "Antokton Lindje — Iliria Lindore",
    subregions: [
      "Rajonet me shqiptarë", "Rajonet e tjera"
    ],
    cities: [
      "Shkup", "Aerodrom", "Butel", "Gazi Babë", "Karposh", "Kisella Vodë",
      "Çair", "Saraj", "Studeniçan", "Sopishtë", "Ilinden", "Petrovec",
      "Shuto Orizare", "Gjorçe Petrov", "Çuçer-Sandevë", "Zelenikovë",
      "Araçinovë", "Tetovë", "Gostivar", "Bogovinë", "Vrapçisht", "Zhelinë",
      "Tearcë", "Jegunoc", "Brvenicë", "Mavrovë-Rostushë", "Ohër", "Strugë",
      "Kërçovë", "Dibër", "Qendër Zhupë", "Vevçan", "Debarcë", "Makedonski Brod",
      "Plasnicë", "Manastir", "Prilep", "Resnjë", "Krushevë", "Demir Hisar",
      "Mogillë", "Novaci", "Krivogashtan", "Dollnen", "Veles", "Kavadar",
      "Negotinë", "Demir Kapi", "Rosoman", "Gradsko", "Çashkë", "Lozovë",
      "Sveti Nikollë", "Shtip", "Koçan", "Probishtip", "Makedonska Kamenicë",
      "Zërnovc", "Kumanovë", "Likovë", "Kriva Pallankë", "Kratovë", "Rankovcë",
      "Staro Nagoriçanë", "Delcevo", "Vinitsa", "Radovis", "Pehcevo", "Berovo",
      "Vasilevo", "Bosilovo", "Novo Selo", "Strumitsa", "Valandovo", "Star Dojran",
      "Bogdanci"
    ]
  },
  {
    value: "juglindje",
    label: "Antokton Juglindje",
    zone: "Antokton Juglindje — Maqedonia e Jugut, Thrakia & Ishujt",
    subregions: [
      "Maqedonia e Jugut", "Thrakia Anadollake", "Ishuj"
    ],
    cities: [
      "Central Macedonia", "Western Macedonia", "Eastern Macedonia and Thrace",
      "North Aegean", "South Aegean"
    ]
  },
  {
    value: "jug",
    label: "Antokton Jug",
    zone: "Antokton Jug — Epiri, Thesalia & Morea",
    subregions: [
      "Epiri i Veriut dhe i Jugut", "Thesalia", "Morea"
    ],
    cities: [
      "Epirus Region", "Greqia Perëndimore", "Thessaly Region",
      "Central Greece Region", "Attica Region", "Peloponnese Region", "West Greece Region"
    ]
  }
];

export const ANTOKTON_REGION_NAMES = ANTOKTON_REGION_DATA.map((region) => region.zone);

export const ANTOKTON_ZONES = Object.fromEntries(
  ANTOKTON_REGION_DATA.map((region) => [region.zone, [...region.cities].sort()])
);

export const ANTOKTON_COUNTRY_REGIONS = ANTOKTON_REGION_DATA.map((region) => ({
  name: region.zone,
  cities: [...region.cities].sort(),
}));

export const ANTOKTON_FILTER_REGIONS = [
  { value: "all", label: "Vendi Antokton - Të gjithë" },
  ...ANTOKTON_REGION_DATA.map((region) => ({
    value: region.value,
    label: region.zone,
    cities: [...region.cities].sort(),
  })),
];

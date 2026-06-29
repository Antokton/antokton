import React, { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react";
import { ANTOKTON_FILTER_REGIONS } from "@/lib/antoktonRegions";

const categories = [
  { value: "all", label: "Të gjitha kategoritë" },
  { value: "pune", label: "Punë" },
  { value: "sherbime", label: "Shërbime" },
  { value: "edukim", label: "Edukim" },
  { value: "bamiresi", label: "Bamirësi" },
];

// Nën-rajone sipas shtetit (Länder, prefektura, kantone etj.)
const countrySubregions = {
  "Gjermani": {
    label: "Landi",
    regions: [
      "Baden-Württemberg","Bavaria (Bayern)","Berlin","Brandenburg","Bremen",
      "Hamburg","Hessen","Mecklenburg-Vorpommern","Niedersachsen",
      "Nordrhein-Westfalen","Rheinland-Pfalz","Saarland","Sachsen",
      "Sachsen-Anhalt","Schleswig-Holstein","Thüringen"
    ]
  },
  "Austri": {
    label: "Landi",
    regions: [
      "Burgenland","Karintia (Kärnten)","Niederösterreich","Oberösterreich",
      "Salzburg","Stiria (Steiermark)","Tirol","Vorarlberg","Vjenë (Wien)"
    ]
  },
  "Zvicër": {
    label: "Kantoni",
    regions: [
      "Aargau","Appenzell Ausserrhoden","Appenzell Innerrhoden","Basel-Landschaft",
      "Basel-Stadt","Bern","Fribourg","Geneva","Glarus","Graubünden","Jura",
      "Lucerne","Neuchâtel","Nidwalden","Obwalden","Schaffhausen","Schwyz",
      "Solothurn","St. Gallen","Thurgau","Ticino","Uri","Valais","Vaud",
      "Zug","Zürich"
    ]
  },
  "Francë": {
    label: "Rajoni",
    regions: [
      "Auvergne-Rhône-Alpes","Bourgogne-Franche-Comté","Bretagne","Centre-Val de Loire",
      "Corse","Grand Est","Hauts-de-France","Île-de-France (Paris)","Normandie",
      "Nouvelle-Aquitaine","Occitanie","Pays de la Loire","Provence-Alpes-Côte d'Azur"
    ]
  },
  "Itali": {
    label: "Rajoni",
    regions: [
      "Abruzzo","Basilicata","Calabria","Campania","Emilia-Romagna","Friuli-Venezia Giulia",
      "Lazio (Romë)","Liguria","Lombardia (Milano)","Marche","Molise","Piemonte (Torino)",
      "Puglia","Sardegna","Sicilia","Toscana (Firence)","Trentino-Alto Adige","Umbria",
      "Valle d'Aosta","Veneto (Venecia)"
    ]
  },
  "Belgjikë": {
    label: "Rajoni",
    regions: ["Bruksel","Flandrija","Valonia"]
  },
  "Hollandë": {
    label: "Provinca",
    regions: [
      "Drenthe","Flevoland","Friesland","Gelderland","Groningen","Limburg",
      "Noord-Brabant","Noord-Holland (Amsterdam)","Overijssel","Utrecht",
      "Zeeland","Zuid-Holland (Hague)"
    ]
  },
  "Spanjë": {
    label: "Komuniteti Autonom",
    regions: [
      "Andalucia","Aragón","Asturias","Baleares","Canarias","Cantabria",
      "Castilla-La Mancha","Castilla y León","Cataluña (Barcelona)","Ceuta",
      "Comunidad Valenciana","Extremadura","Galicia","La Rioja",
      "Madrid","Melilla","Murcia","Navarra","País Vasco (Baskia)"
    ]
  },
  "Portugali": {
    label: "Rrethi",
    regions: [
      "Aveiro","Azores","Beja","Braga","Bragança","Castelo Branco","Coimbra",
      "Évora","Faro","Guarda","Leiria","Lisbonë","Madeira","Portalegre",
      "Porto","Santarém","Setúbal","Viana do Castelo","Vila Real","Viseu"
    ]
  },
  "Angli": {
    label: "Rajoni",
    regions: [
      "East Midlands","East of England","London","North East","North West",
      "Northern Ireland","Scotland","South East","South West","Wales",
      "West Midlands","Yorkshire and Humber"
    ]
  },
  "Suedi": {
    label: "Krahina",
    regions: [
      "Blekinge","Dalarna","Gävleborg","Gotland","Halland","Jämtland",
      "Jönköping","Kalmar","Kronoberg","Norrbotten","Örebro","Östergötland",
      "Skåne (Malmö)","Södermanland","Stockholm","Uppsala","Värmland",
      "Västerbotten","Västernorrland","Västmanland","Västra Götaland (Göteborg)"
    ]
  },
  "Norvegji": {
    label: "Krahina",
    regions: [
      "Agder","Innlandet","Møre og Romsdal","Nordland","Oslo",
      "Rogaland","Troms og Finnmark","Trøndelag","Vestfold og Telemark",
      "Vestland","Viken"
    ]
  },
  "Danimarkë": {
    label: "Rajoni",
    regions: ["Copenhagen (Kryeqyteti)","Fyn","Jutlanda Veriore","Jutlanda Qendrore","Zelanda"]
  },
  "Finlandë": {
    label: "Rajoni",
    regions: [
      "Åland","Finland Jugore","Finland Perëndimore","Finlanda Veriore dhe Lindore",
      "Helsinki-Uusimaa","Jutlanda Juglindore","Ostrobothnia","Tavastia Jugore"
    ]
  },
  "Poloni": {
    label: "Voivodesha",
    regions: [
      "Dolnośląskie","Kujawsko-Pomorskie","Łódzkie","Lubelskie","Lubuskie",
      "Małopolskie (Krakow)","Mazowieckie (Warszawa)","Opolskie","Podkarpackie",
      "Podlaskie","Pomorskie","Śląskie","Świętokrzyskie","Warmińsko-Mazurskie",
      "Wielkopolskie (Poznań)","Zachodniopomorskie"
    ]
  },
  "Çeki": {
    label: "Rajoni",
    regions: [
      "Bohemia Jugore","Bohemia Jugperëndimore","Bohemia Qendrore","Karlovy Vary",
      "Kraj Vysočina","Liberec","Moravian-Silesian","Moravia Jugore (Brno)",
      "Moravia-Olmouc","Pardubice","Plzeň","Praha (Pragë)","Hradec Králové"
    ]
  },
  "Hungari": {
    label: "Komitati",
    regions: [
      "Baranya","Bács-Kiskun","Békés","Borsod-Abaúj-Zemplén","Budapest",
      "Csongrád-Csanád","Fejér","Győr-Moson-Sopron","Hajdú-Bihar","Heves",
      "Jász-Nagykun-Szolnok","Komárom-Esztergom","Nógrád","Pest",
      "Somogy","Szabolcs-Szatmár-Bereg","Tolna","Vas","Veszprém","Zala"
    ]
  },
  "Rumani": {
    label: "Rrethi",
    regions: [
      "Alba","Arad","Argeș","Bacău","Bihor","Bistrița-Năsăud","Botoșani",
      "Brăila","Brașov","Bucharest","Buzău","Călărași","Caraș-Severin",
      "Cluj","Constanța","Covasna","Dâmbovița","Dolj","Galați","Giurgiu",
      "Gorj","Harghita","Hunedoara","Ialomița","Iași","Ilfov","Maramureș",
      "Mehedinți","Mureș","Neamț","Olt","Prahova","Sălaj","Satu Mare",
      "Sibiu","Suceava","Teleorman","Timișoara","Tulcea","Vâlcea","Vaslui","Vrancea"
    ]
  },
  "Bosnje": {
    label: "Kantoni/Entiteti",
    regions: [
      "Bosnja dhe Hercegovina Federale","Republika Sërpska","Distrikti Brčko",
      "Kantoni Una-Sana","Kantoni Posavina","Kantoni Tuzla","Kantoni Zenica-Doboj",
      "Kantoni Bosnës Qendrore","Kantoni Herzegovina-Neretva","Kantoni Perëndimor"
    ]
  },
  "Kroaci": {
    label: "Komitati",
    regions: [
      "Bjelovar-Bilogora","Brod-Posavina","Dubrovnik-Neretva","Istria","Karlovac",
      "Koprivnica-Križevci","Krapina-Zagorje","Lika-Senj","Međimurje","Osijek-Baranja",
      "Požega-Slavonia","Primorje-Gorski Kotar (Rijeka)","Šibenik-Knin",
      "Sisak-Moslavina","Split-Dalmacia","Varaždin","Virovitica-Podravina",
      "Vukovar-Syrmia","Zadar","Zagreb"
    ]
  },
  "Slloveni": {
    label: "Rajoni",
    regions: [
      "Carinthia (Koroška)","Central Slovenia (Ljubljana)","Eastern Slovenia",
      "Gorizia","Littoral-Inner Carniola","Lower Sava","Northern Primorska",
      "Savinja","Southeastern Slovenia","Upper Carniola"
    ]
  },
  "Turki": {
    label: "Provinca",
    regions: [
      "Adana","Ankara","Antalya","Bursa","Diyarbakır","Eskişehir","Gaziantep",
      "Istanbul","İzmir","Kayseri","Kocaeli","Konya","Mersin","Samsun",
      "Şanlıurfa","Trabzon"
    ]
  },
  "Emiratet": {
    label: "Emiratët",
    regions: ["Abu Dhabi","Ajman","Dubai","Fujairah","Ras al-Khaimah","Sharjah","Umm al-Quwain"]
  },
  "Katar": {
    label: "Bashkia",
    regions: ["Ad Dawhah (Doha)","Al Daayen","Al Khor","Al Shahaniya","Al Wakrah","Ar Rayyan","Ash Shamal","Az Za'ayin"]
  },
  "Kuvajt": {
    label: "Governorati",
    regions: ["Al Ahmadi","Al Asimah (Kuvajt)","Al Farwaniyah","Al Jahra","Hawalli","Mubarak Al-Kabeer"]
  },
};

const antoktonRegions = ANTOKTON_FILTER_REGIONS;

const experienceLevels = [
  { value: "all", label: "Çdo nivel" },
  { value: "entry", label: "Fillestar" },
  { value: "mid", label: "I mesëm" },
  { value: "senior", label: "I lartë" },
  { value: "executive", label: "Ekspert" }
];

const contractTypes = [
  { value: "all", label: "Çdo lloj" },
  { value: "full-time", label: "Kohë e plotë" },
  { value: "part-time", label: "Kohë e pjesshme" },
  { value: "contract", label: "Kontratë" },
  { value: "freelance", label: "Freelance" },
  { value: "internship", label: "Praktikë" }
];

const workLocations = [
  { value: "all", label: "Të gjitha" },
  { value: "on-site", label: "Prezencial" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hibrid" }
];

const propertySubcategories = [
  { value: "all", label: "Të gjitha llojet" },
  { value: "shtepi", label: "Shtëpi" },
  { value: "banesa", label: "Banesa" },
  { value: "dyqane", label: "Dyqane" },
  { value: "restorante", label: "Restorante" },
  { value: "hotele", label: "Hotele" },
  { value: "magazina", label: "Magazina" },
  { value: "toka", label: "Toka" },
  { value: "troje", label: "Troje" },
  { value: "ara", label: "Ara" },
  { value: "pemishte", label: "Pemishte" },
  { value: "pyje", label: "Pyje" },
];

const propertyTransactions = [
  { value: "all", label: "Shitje & Qera" },
  { value: "shitje", label: "Shitje" },
  { value: "qera", label: "Qera" },
];

const professionOptions = [
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
  "Laborant","Librarist","Logjistikan",
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
].sort((a, b) => a.localeCompare(b, "sq"));

const normalizeProfessionText = (value = "") =>
  String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ë/g, "e")
    .replace(/ç/g, "c")
    .trim();

function ProfessionAutocomplete({ value, onChange }) {
  const [focused, setFocused] = useState(false);
  const currentValue = value === "all" ? "" : value || "";

  const suggestions = useMemo(() => {
    const query = normalizeProfessionText(currentValue);
    const matches = query
      ? professionOptions.filter((profession) =>
          normalizeProfessionText(profession).includes(query)
        )
      : professionOptions;

    return matches.slice(0, 12);
  }, [currentValue]);

  const chooseProfession = (profession) => {
    onChange(profession || "all");
    setFocused(false);
  };

  return (
    <div className={`relative ${focused ? "z-[300]" : "z-10"}`}>
      <Input
        type="search"
        value={currentValue}
        onChange={(event) => onChange(event.target.value || "all")}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 120)}
        placeholder="Shkruaj profesionin..."
        autoComplete="off"
        className="h-8 border-white/10 bg-white/10 pr-8 text-xs font-normal text-white placeholder:text-white/70"
        style={{ background: "rgba(255, 255, 255, 0.08)" }}
      />
      {currentValue && (
        <button
          type="button"
          aria-label="Pastro profesionin"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => chooseProfession("all")}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
        >
          ×
        </button>
      )}
      {focused && suggestions.length > 0 && (
        <div
          className="absolute left-0 right-0 top-full z-[200] mt-1 max-h-60 overflow-y-auto rounded-md border border-white/15 bg-[#070b16] p-1 text-sm leading-5 text-white shadow-2xl"
          style={{
            background: "#070b16",
            backgroundColor: "#070b16",
            backgroundImage: "none",
            backdropFilter: "none",
            WebkitBackdropFilter: "none",
            opacity: 1,
            color: "#ffffff",
            boxShadow: "0 18px 45px rgba(0, 0, 0, 0.78)"
          }}
        >
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => chooseProfession("all")}
            className="block w-full rounded-sm bg-[#101827] px-3 py-2 text-left text-sm font-medium leading-5 text-white hover:!bg-[#1f2937] focus:!bg-[#1f2937]"
          >
            Të gjithë profesionet
          </button>
          {suggestions.map((profession) => (
            <button
              key={profession}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => chooseProfession(profession)}
              className="mt-0.5 block w-full rounded-sm bg-[#101827] px-3 py-2 text-left text-sm font-normal leading-5 text-white hover:!bg-[#1f2937] focus:!bg-[#1f2937]"
            >
              {profession}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FeedFilters({ filters, setFilters }) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="rounded-xl border border-white/10 p-2 mb-3" style={{
      background: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(12px)'
    }}>
      {/* Row 1: Search + Toggle */}
      <div className="flex gap-1.5 mb-1">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/70" />
          <Input
            placeholder="Kërko..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="pl-8 border-white/20 h-8 text-xs bg-white/10 text-white placeholder:text-white/70"
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-white hover:text-white text-xs h-8 px-2 border border-white/10 shrink-0"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          <SlidersHorizontal className="w-3 h-3 mr-1" />
          {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </Button>
      </div>

      {/* Row 2: Category + job_type / service_field */}
      <div className="grid grid-cols-2 gap-1 mb-1">
        <Select value={filters.category} onValueChange={(v) => setFilters({ ...filters, category: v, job_type: "all", service_field: "all", sub: "all" })}>
          <SelectTrigger className="border-white/10 h-8 text-xs text-white" style={{ background: 'rgba(255, 255, 255, 0.08)' }}>
            <SelectValue placeholder="Kategoria" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 2nd box: job_type for pune/sherbime, transaction for prona, empty otherwise */}
        {(filters.category === "pune" || filters.category === "sherbime") && (
          <Select value={filters.job_type || "all"} onValueChange={(v) => setFilters({ ...filters, job_type: v })}>
            <SelectTrigger className="border-white/10 h-8 text-xs text-white" style={{ background: 'rgba(255, 255, 255, 0.08)' }}>
              <SelectValue placeholder={filters.category === "pune" ? "Ofroj / Kërkoj" : "Ofroj / Kërkoj"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Ofroj & Kërkoj</SelectItem>
              <SelectItem value="ofroj">{filters.category === "pune" ? "Ofroj punë" : "Ofroj shërbim"}</SelectItem>
              <SelectItem value="kerkoj">{filters.category === "pune" ? "Kërkoj punë" : "Kërkoj shërbim"}</SelectItem>
            </SelectContent>
          </Select>
        )}
        {filters.category === "prona" && (
          <Select value={filters.property_transaction || "all"} onValueChange={(v) => setFilters({ ...filters, property_transaction: v })}>
            <SelectTrigger className="border-white/10 h-8 text-xs text-white" style={{ background: 'rgba(255, 255, 255, 0.08)' }}>
              <SelectValue placeholder="Shitje / Qera" />
            </SelectTrigger>
            <SelectContent>
              {propertyTransactions.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Row 3: Profession/ServiceField + Country */}
      <div className={`grid gap-1 ${(filters.category === "pune" || filters.category === "sherbime") ? "grid-cols-2" : "grid-cols-1"}`}>

        {filters.category === "sherbime" && (
          <Select value={filters.service_field || "all"} onValueChange={(v) => setFilters({ ...filters, service_field: v })}>
            <SelectTrigger className="border-white/10 h-8 text-xs text-white" style={{ background: 'rgba(255, 255, 255, 0.08)' }}>
              <SelectValue placeholder="Fusha" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Të gjitha fushat</SelectItem>
              {[
                {key:"ndertim",label:"Ndërtim"},{key:"transport",label:"Transport"},{key:"perkthime",label:"Përkthime"},
                {key:"it_teknologji",label:"IT & Teknologji"},{key:"avokat",label:"Avokat"},{key:"financiare",label:"Financiare"},
                {key:"menaxheriale",label:"Menaxheriale"},{key:"tjeter",label:"Shërbime të tjera"}
              ].map(f => (
                <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {filters.category === "pune" && (
          <ProfessionAutocomplete
            value={filters.profession || "all"}
            onChange={(profession) => setFilters({ ...filters, profession })}
          />
        )}

        <Select value={filters.country || "all"} onValueChange={(v) => setFilters({ ...filters, country: v, region: "", city: "", subregion: "" })}>
          <SelectTrigger className="border-white/10 h-8 text-xs text-white col-span-1" style={{ background: 'rgba(255, 255, 255, 0.08)' }}>
            <SelectValue placeholder="Vendi" />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            <SelectItem value="all">Të gjithë vendet</SelectItem>
            {[
              "Antokton","Angli","Arabi","Austri","Belgjikë","Bosnje","Bullgari","Çeki","Danimarkë",
              "Egjipt","Emiratet","Estoni","Finlandë","Francë","Gjermani","Hungari",
              "Islandë","Irlandë","Irak","Itali","Katar","Kroaci","Kuvajt","Letoni",
              "Lituani","Luksemburg","Maltë","Hollandë","Norvegji","Poloni","Portugali",
              "Rumani","Siri","Sllovaki","Slloveni","Skoci","Spanjë","Suedi","Turki","Zvicër"
            ].map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

      </div>

      {/* Nën-rajone sipas shtetit (Länder, Kantone, Prefektura etj.) */}
      {filters.country && filters.country !== "all" && filters.country !== "Antokton" && countrySubregions[filters.country] && (
        <div className="grid grid-cols-2 gap-1 mt-1">
          <Select value={filters.subregion || "all"} onValueChange={(v) => setFilters({ ...filters, subregion: v })}>
            <SelectTrigger className="border-white/10 h-8 text-xs text-white" style={{ background: 'rgba(255, 255, 255, 0.08)' }}>
              <SelectValue placeholder={countrySubregions[filters.country].label} />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              <SelectItem value="all">Të gjitha ({countrySubregions[filters.country].label})</SelectItem>
              {countrySubregions[filters.country].regions.map(r => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center px-2">
            <span className="text-white/30 text-[10px]">{countrySubregions[filters.country].label}</span>
          </div>
        </div>
      )}

      {/* Prona: lloji i pronës */}
      {filters.category === "prona" && (
        <div className="mt-1">
          <Select value={filters.property_subcategory || "all"} onValueChange={(v) => setFilters({ ...filters, property_subcategory: v })}>
            <SelectTrigger className="border-white/10 h-8 text-xs text-white w-full" style={{ background: 'rgba(255, 255, 255, 0.08)' }}>
              <SelectValue placeholder="Lloji i pronës" />
            </SelectTrigger>
            <SelectContent>
              {propertySubcategories.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Antokton sub-filters */}
      {(filters.country === "Antokton" || (filters.region && filters.region !== "all")) && (
        <div className="grid grid-cols-2 gap-1 mt-1">
          {filters.country === "Antokton" && (
            <Select value={filters.region || "all"} onValueChange={(v) => setFilters({ ...filters, region: v, city: "" })}>
              <SelectTrigger className="border-white/10 h-8 text-xs text-white" style={{ background: 'rgba(255, 255, 255, 0.08)' }}>
                <SelectValue placeholder="Rajoni" />
              </SelectTrigger>
              <SelectContent>
                {antoktonRegions.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {filters.region && filters.region !== "all" && (
            <Select value={filters.city || "all"} onValueChange={(v) => setFilters({ ...filters, city: v })}>
              <SelectTrigger className="border-white/10 h-8 text-xs text-white" style={{ background: 'rgba(255, 255, 255, 0.08)' }}>
                <SelectValue placeholder="Qyteti" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Të gjithë qytetet</SelectItem>
                {antoktonRegions.find(r => r.value === filters.region)?.cities.map(city => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {showAdvanced && (
        <div className="space-y-2 mt-2.5 pt-2.5 border-t border-white/10">
          {filters.category === "pune" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-white mb-1 block">Aftësi të kërkuara:</label>
                  <Input
                    value={filters.skills || ""}
                    onChange={(e) => setFilters({ ...filters, skills: e.target.value })}
                    className="border-white/20 h-7 text-xs bg-white/10 text-white placeholder:text-white/70"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white mb-1 block">Nivel përvoje:</label>
                  <Select value={filters.experienceLevel || "all"} onValueChange={(v) => setFilters({ ...filters, experienceLevel: v })}>
                    <SelectTrigger className="border-white/20 h-7 text-xs bg-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {experienceLevels.map(e => (
                        <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-white mb-1 block">Lloji i kontratës:</label>
                  <Select value={filters.contractType || "all"} onValueChange={(v) => setFilters({ ...filters, contractType: v })}>
                    <SelectTrigger className="border-white/20 h-7 text-xs bg-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {contractTypes.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] text-white mb-1 block">Vendi i punës:</label>
                  <Select value={filters.workLocation || "all"} onValueChange={(v) => setFilters({ ...filters, workLocation: v })}>
                    <SelectTrigger className="border-white/20 h-7 text-xs bg-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {workLocations.map(w => (
                        <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <label className="text-[10px] text-white mb-1 block">Data nga:</label>
              <Input
                type="date"
                value={filters.dateFrom || ""}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="border-white/20 h-7 text-xs bg-white/10 text-white"
              />
            </div>

            <div>
              <label className="text-[10px] text-white mb-1 block">Data deri:</label>
              <Input
                type="date"
                value={filters.dateTo || ""}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="border-white/20 h-7 text-xs bg-white/10 text-white"
              />
            </div>

            <div>
              <label className="text-[10px] text-white mb-1 block">Paga min (€):</label>
              <Input
                type="number"
                placeholder="0"
                value={filters.salaryMin || ""}
                onChange={(e) => setFilters({ ...filters, salaryMin: e.target.value })}
                className="border-white/20 h-7 text-xs bg-white/10 text-white placeholder:text-white/70"
              />
            </div>

            <div>
              <label className="text-[10px] text-white mb-1 block">Paga max (€):</label>
              <Input
                type="number"
                placeholder="∞"
                value={filters.salaryMax || ""}
                onChange={(e) => setFilters({ ...filters, salaryMax: e.target.value })}
                className="border-white/20 h-7 text-xs bg-white/10 text-white placeholder:text-white/70"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

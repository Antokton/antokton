import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Building2, Globe, Heart, Briefcase, GraduationCap, Scale, Newspaper } from "lucide-react";

export default function StateAntokton() {
  const categories = [
    {
      title: "Punë",
      description: "Mundësi pune për diasporën shqiptare në mbarë botën",
      icon: Briefcase,
      color: "from-blue-500 to-blue-600",
      projects: ["Antokton Punë", "Rekrutime", "Mentoring"]
    },
    {
      title: "Edukim",
      description: "Arsimim dhe trajnime profesionale",
      icon: GraduationCap,
      color: "from-purple-500 to-purple-600",
      projects: ["Shkolla Online", "Bursa", "Kurse Profesionale"]
    },
    {
      title: "Juridike",
      description: "Shërbime juridike dhe këshilla ligjore",
      icon: Scale,
      color: "from-green-500 to-green-600",
      projects: ["Konsulenca", "Dokumentacione", "Avokatë"]
    },
    {
      title: "Bamirësi",
      description: "Organizata bamirëse dhe mbështetje sociale",
      icon: Heart,
      color: "from-red-500 to-red-600",
      projects: ["Donacione", "Vullnetarizëm", "Projekte Sociale"]
    },
    {
      title: "Media",
      description: "Platforma mediatike dhe lajme",
      icon: Newspaper,
      color: "from-yellow-500 to-yellow-600",
      projects: ["Portale Lajmesh", "Revista", "Podcast"]
    },
    {
      title: "Shtëpi",
      description: "Prona dhe shërbime banimi",
      icon: Building2,
      color: "from-indigo-500 to-indigo-600",
      projects: ["Qira", "Shitje", "Menaxhim Pronash"]
    },
    {
      title: "Komunitet",
      description: "Rrjetëzim dhe ngjarje komunitare",
      icon: Users,
      color: "from-pink-500 to-pink-600",
      projects: ["Ngjarje", "Grupet", "Networking"]
    },
    {
      title: "Shërbime",
      description: "Shërbime të ndryshme për komunitetin",
      icon: Globe,
      color: "from-teal-500 to-teal-600",
      projects: ["Translatorë", "Transporti", "Mirëmbajtje"]
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-[#0d3a47] via-[#051e28] to-[#0b1020] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Vendi Antokton
          </h1>
          <p className="text-xl text-white/70 max-w-3xl mx-auto mb-8">
            Një ekosistem i plotë shërbimesh për diasporën shqiptare - punë, edukim, 
            juridike, bamirësi, media dhe shumë më tepër.
          </p>
          <div className="flex items-center justify-center gap-4 text-white/60">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              <span>10,000+ Anëtarë</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              <span>50+ Vende</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              <span>8 Kategori</span>
            </div>
          </div>
        </div>
      </div>

      {/* Vision */}
      <div className="py-16 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto text-center mb-16">
          <h2 className="text-3xl font-bold text-white mb-4">Vizioni ynë</h2>
          <p className="text-lg text-white/70 leading-relaxed">
            Antokton synon të krijojë një "shtet virtual" për diasporën shqiptare - 
            një platformë të plotë ku çdo shqiptar, kudo që të jetojë, të gjejë 
            mbështetje, mundësi dhe komunitet. Nga puna dhe arsimi, tek shërbimet 
            juridike dhe bamirësia, ne ndërtojmë një rrjet të fuqishëm që lidh dhe 
            forcon diasporën tonë.
          </p>
        </div>

        {/* Categories Grid */}
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">Kategoritë tona</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((category, i) => {
              const Icon = category.icon;
              return (
                <Card 
                  key={i} 
                  className="bg-white/5 border-white/10 hover:bg-white/8 transition-all duration-300 group cursor-pointer"
                >
                  <CardContent className="p-6">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{category.title}</h3>
                    <p className="text-white/60 text-sm mb-4">{category.description}</p>
                    <div className="space-y-1">
                      {category.projects.map((project, j) => (
                        <div key={j} className="flex items-center gap-2 text-white/40 text-xs">
                          <div className="w-1 h-1 rounded-full bg-white/40" />
                          <span>{project}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="py-16 px-4 sm:px-6 bg-white/5">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">Impakti ynë</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { value: "10,000+", label: "Anëtarë aktivë", icon: Users },
              { value: "5,000+", label: "Punë të postuara", icon: Briefcase },
              { value: "50+", label: "Vende", icon: Globe },
              { value: "1,000+", label: "Lidhje të krijuara", icon: Heart }
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <stat.icon className="w-8 h-8 text-[#8ab4ff] mx-auto mb-3" />
                <p className="text-4xl font-bold text-white mb-2">{stat.value}</p>
                <p className="text-white/60 text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="py-16 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">Si funksionon</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Regjistrohu", description: "Krijo një llogari falas dhe plotëso profilin tënd" },
              { step: "2", title: "Eksploro", description: "Shfleto mundësitë në të gjitha kategoritë tona" },
              { step: "3", title: "Lidhu", description: "Gjej punë, shërbime dhe lidh me komunitetin" }
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#8ab4ff] to-[#9bffd6] flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-[#0b1020]">{item.step}</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-white/60 text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="py-16 px-4 sm:px-6 bg-gradient-to-br from-[#8ab4ff]/10 to-[#9bffd6]/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Bëhu pjesë e Antokton</h2>
          <p className="text-lg text-white/70 mb-8">
            Bashkohu me mijëra shqiptarë që tashmë janë pjesë e këtij ekosistemi të jashtëzakonshëm.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-8 py-4 bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] font-semibold rounded-xl hover:opacity-90 transition-opacity text-lg"
          >
            Fillo tani - Falas
          </button>
        </div>
      </div>
    </div>
  );
}

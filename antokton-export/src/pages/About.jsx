import React, { useState, useEffect } from "react";
import { Globe, Users, Briefcase, Shield, Heart, Radio, Target, ArrowRight, GraduationCap, Wrench, Home, Scale } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { motion } from "framer-motion";
import { base44 } from "@/api/antoktonClient";
import { useQuery } from "@tanstack/react-query";

export default function About() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (isAuth) {
        const me = await base44.auth.me();
        setUser(me);
      }
    };
    checkAuth();
  }, []);

  const { data: projects = [] } = useQuery({
    queryKey: ['antonkton-projects'],
    queryFn: () => base44.entities.AntonktonProject.filter({ is_active: true }, 'order'),
    initialData: []
  });

  const iconMap = {
    Briefcase,
    Radio,
    Heart,
    Users,
    Shield,
    Globe,
    GraduationCap,
    Wrench,
    Home,
    Scale,
    Target
  };

  const getProjectLink = (project) => {
    if (project.link_type === "category" && project.category_name) {
      return createPageUrl("Feed") + `?category=${project.category_name}`;
    } else if (project.link_type === "external" && project.external_url) {
      return project.external_url;
    } else if (project.link_type === "project_page") {
      return createPageUrl("ProjectDetail") + `?id=${project.id}`;
    }
    return "#";
  };

  const isExternal = (project) => project.link_type === "external";

  const defaultProjects = [
    { icon: "Briefcase", title: "Punë në Europë", desc: "Portal njoftimesh pune për diasporën shqiptare në Europë dhe më gjerë.", color: "bg-blue-50 text-blue-500", link: createPageUrl("Feed") + "?category=pune" },
    { icon: "Radio", title: "Antokton TV & Radio", desc: "Përmbajtje mediatike komunitare — lajme, intervista dhe programe.", color: "bg-purple-50 text-purple-500", link: createPageUrl("Feed") + "?category=media" },
    { icon: "Heart", title: "Fitra Antokton", desc: "Bamirësi dhe solidaritet — mbështetje për ata që kanë nevojë.", color: "bg-rose-50 text-rose-500", link: createPageUrl("Feed") + "?category=bamiresi" },
    { icon: "Users", title: "Komunitet", desc: "Ndërveprim social, komente, diskutime dhe bashkëpunim.", color: "bg-amber-50 text-amber-500", link: createPageUrl("Feed") },
    { icon: "Shield", title: "Moderim & Besim", desc: "Sistem verifikimi, role të qarta dhe transparencë.", color: "bg-cyan-50 text-cyan-500", link: createPageUrl("About") },
    { icon: "Globe", title: "Shërbime", desc: "Shërbime juridike, edukative dhe profesionale.", color: "bg-emerald-50 text-emerald-500", link: createPageUrl("Feed") + "?category=sherbime" },
  ];

  const displayProjects = projects.length > 0 ? projects : defaultProjects;

  return (
    <div>
      {/* Hero */}
      <section className="relative py-24 px-4 sm:px-6 overflow-hidden" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="absolute inset-0 opacity-50">
          <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-[#8ab4ff]/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-[#9bffd6]/8 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ color: 'var(--text)' }}
            className="text-4xl sm:text-5xl font-black tracking-tight"
          >
            Çfarë është{" "}
            <span className="bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] bg-clip-text text-transparent">
              Antokton
            </span>
            ?
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{ color: '#ffffff' }}
            className="text-lg mt-6 leading-relaxed max-w-2xl mx-auto"
          >
            Antokton është një platformë komunitare, ekonomike dhe kulturore që synon të lidhë, mbështesë dhe fuqizojë shqiptarët dhe trashëgiminë shqiptare në të gjitha hapësirat ku ka ekzistuar ose ekziston një prani e konsiderueshme shqiptare.
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{ color: '#ffffff' }}
            className="text-base mt-4 leading-relaxed max-w-2xl mx-auto"
          >
            Platforma krijon ura bashkëpunimi, mundësi zhvillimi dhe hapësira komunikimi për komunitetin shqiptar, duke ruajtur identitetin dhe duke ndërtuar të ardhmen në mënyrë të përbashkët.
          </motion.p>
        </div>
      </section>

      {/* Three Dimensions */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl border border-white/10 p-8"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-5">
                <Globe className="w-6 h-6 text-blue-300" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Antokton si Realitet Gjeografik</h3>
              <p className="text-white leading-relaxed text-sm">
                Antokton përfaqëson tokat shqiptare në Ballkan — një koncept bashkimi 
                përmes punës dhe kontributit konkret për tokën dhe shoqërinë. 
                Nga veriu në jug, nga lindja në perëndim.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl border border-white/10 p-8"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-5">
                <Target className="w-6 h-6 text-emerald-300" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Antokton si Projekt Ombrellë Unifikuese</h3>
              <p className="text-white leading-relaxed text-sm">
                Bashkëpunim rajonal i vizionit strategjik — një platformë që bashkon 
                projekte funksionale: portal punësimi, edukim, media, bamirësi dhe 
                shërbime komunitare nën një qëllim të përbashkët.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="rounded-2xl border border-white/10 p-8"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-5">
                <Briefcase className="w-6 h-6 text-purple-300" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Antokton si Website</h3>
              <p className="text-white leading-relaxed text-sm">
                Një plotformë gjithëpërfshirëse që ofron punë, edukim, shërbime, 
                media dhe bamirësi për komunitetin. Kontakt: <a href="mailto:info@antokton.com" className="text-[#8ab4ff] hover:underline">info@antokton.com</a> | 
                Web: <a href={createPageUrl("Home")} className="text-[#8ab4ff] hover:underline">antokton.com</a>
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Projects */}
      <section className="py-16 px-4 sm:px-6" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black text-white text-center mb-10 uppercase tracking-wide">
            Projektet brenda Antokton
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayProjects.map((project, i) => {
              const IconComponent = iconMap[project.icon || project.icon_name] || Briefcase;
              const projectLink = project.link ? project.link : getProjectLink(project);
              const isExternalLink = project.link ? false : isExternal(project);
              
              const content = (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  className="rounded-2xl border border-white/10 p-6 hover:border-white/20 transition-all duration-300 cursor-pointer h-full"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                  style={project.background_image ? {
                    backgroundImage: `url(${project.background_image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  } : {}}
                >
                  {project.background_image && <div className="absolute inset-0 bg-white/90 rounded-2xl" />}
                  <div className="relative">
                    <div className={`w-10 h-10 rounded-xl ${project.color || project.color_class || 'bg-blue-50 text-blue-500'} flex items-center justify-center mb-4`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-white text-sm mb-2">{project.title}</h3>
                    <p className="text-white text-xs leading-relaxed">{project.desc || project.description}</p>
                  </div>
                </motion.div>
              );

              return isExternalLink ? (
                <a key={project.id || i} href={projectLink} target="_blank" rel="noopener noreferrer" className="block h-full">
                  {content}
                </a>
              ) : (
                <Link key={project.id || i} to={projectLink} className="block h-full">
                  {content}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-black mb-4 text-white uppercase tracking-wide">
            Bashkohu me Antokton
          </h2>
          <p className="mb-8 text-white">
            Kontribuo, posto njoftime, apo thjesht bëhu pjesë e komunitetit.
          </p>
          <Link
            to={createPageUrl("Feed")}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] font-semibold text-sm hover:opacity-90 transition-opacity"
            style={{ color: '#0b1020' }}
          >
            Fillo tani
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
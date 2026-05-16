import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { base44 } from "@/api/antoktonClient";
import { ArrowLeft, ExternalLink, Download, Image as ImageIcon } from "lucide-react";
import { createPageUrl } from "../utils";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function ProjectDetail() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get("id");
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) return;
      try {
        const projects = await base44.entities.AntonktonProject.filter({ id: projectId });
        if (projects.length > 0) {
          setProject(projects[0]);
        }
      } catch (error) {
        console.error("Error fetching project:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [projectId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">Duke u ngarkuar...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">Projekti nuk u gjet</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Link to={createPageUrl("About")} className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6">
          <ArrowLeft className="w-4 h-4" />
          Kthehu tek Rreth Nesh
        </Link>

        {/* Header with Background */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-2xl overflow-hidden mb-8"
          style={{
            backgroundImage: project.background_image ? `url(${project.background_image})` : 'none',
            backgroundColor: project.background_image ? 'transparent' : '#1a2340',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            minHeight: '300px'
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b1020] via-[#0b1020]/70 to-transparent" />
          <div className="relative z-10 p-8 flex flex-col justify-end min-h-[300px]">
            <h1 className="text-4xl font-bold text-white mb-3">{project.title}</h1>
            <p className="text-white/80 text-lg">{project.description}</p>
          </div>
        </motion.div>

        {/* Content */}
        {project.project_content && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/5 rounded-2xl p-8 mb-8"
          >
            <div className="prose prose-invert max-w-none">
              <div dangerouslySetInnerHTML={{ __html: project.project_content }} />
            </div>
          </motion.div>
        )}

        {/* Social Links */}
        {project.social_links && project.social_links.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/5 rounded-2xl p-6 mb-8"
          >
            <h2 className="text-xl font-bold text-white mb-4">Linqe Shoqëruese</h2>
            <div className="flex flex-wrap gap-3">
              {project.social_links.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
                >
                  {link.icon && <span>{link.icon}</span>}
                  {link.platform}
                  <ExternalLink className="w-4 h-4" />
                </a>
              ))}
            </div>
          </motion.div>
        )}

        {/* Gallery */}
        {project.gallery_images && project.gallery_images.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/5 rounded-2xl p-6 mb-8"
          >
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Galeria
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {project.gallery_images.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`Gallery ${i + 1}`}
                  className="w-full h-48 object-cover rounded-lg hover:scale-105 transition-transform cursor-pointer"
                  onClick={() => window.open(img, '_blank')}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Documents */}
        {project.documents && project.documents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white/5 rounded-2xl p-6"
          >
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Download className="w-5 h-5" />
              Dokumenta
            </h2>
            <div className="space-y-3">
              {project.documents.map((doc, i) => (
                <a
                  key={i}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
                >
                  <span>{doc.title}</span>
                  <Download className="w-4 h-4" />
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
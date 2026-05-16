import React, { useState } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Upload, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProjectManager() {
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    icon_name: "Briefcase",
    color_class: "bg-blue-50 text-blue-500",
    link_type: "category",
    category_name: "",
    external_url: "",
    project_content: "",
    order: 0,
    is_active: true
  });
  const [uploadingImage, setUploadingImage] = useState(false);

  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['antonkton-projects'],
    queryFn: () => base44.entities.AntonktonProject.list('order'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.AntonktonProject.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['antonkton-projects']);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AntonktonProject.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['antonkton-projects']);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AntonktonProject.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['antonkton-projects']);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      icon_name: "Briefcase",
      color_class: "bg-blue-50 text-blue-500",
      link_type: "category",
      category_name: "",
      external_url: "",
      project_content: "",
      order: 0,
      is_active: true
    });
    setEditingProject(null);
    setShowForm(false);
  };

  const handleEdit = (project) => {
    setEditingProject(project);
    setFormData({
      title: project.title || "",
      description: project.description || "",
      icon_name: project.icon_name || "Briefcase",
      color_class: project.color_class || "bg-blue-50 text-blue-500",
      link_type: project.link_type || "category",
      category_name: project.category_name || "",
      external_url: project.external_url || "",
      project_content: project.project_content || "",
      order: project.order || 0,
      is_active: project.is_active !== false
    });
    setShowForm(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, background_image: file_url });
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Gabim në ngarkimin e fotos");
    } finally {
      setUploadingImage(false);
    }
  };

  if (isLoading) {
    return <div className="text-white">Duke u ngarkuar...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Menaxho Projektet</h2>
        <Button onClick={() => setShowForm(!showForm)} className="bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020]">
          <Plus className="w-4 h-4 mr-2" />
          Projekt i Ri
        </Button>
      </div>

      {showForm && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">{editingProject ? "Edito Projektin" : "Krijo Projekt"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-white/80 text-sm mb-2 block">Titulli</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>

              <div>
                <label className="text-white/80 text-sm mb-2 block">Përshkrimi</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  className="bg-white/10 border-white/20 text-white"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-white/80 text-sm mb-2 block">Ikona</label>
                  <Select value={formData.icon_name} onValueChange={(val) => setFormData({ ...formData, icon_name: val })}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Briefcase">Briefcase</SelectItem>
                      <SelectItem value="Radio">Radio</SelectItem>
                      <SelectItem value="Heart">Heart</SelectItem>
                      <SelectItem value="Users">Users</SelectItem>
                      <SelectItem value="Shield">Shield</SelectItem>
                      <SelectItem value="Globe">Globe</SelectItem>
                      <SelectItem value="GraduationCap">GraduationCap</SelectItem>
                      <SelectItem value="Wrench">Wrench</SelectItem>
                      <SelectItem value="Home">Home</SelectItem>
                      <SelectItem value="Scale">Scale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-white/80 text-sm mb-2 block">Ngjyra</label>
                  <Input
                    value={formData.color_class}
                    onChange={(e) => setFormData({ ...formData, color_class: e.target.value })}
                    placeholder="bg-blue-50 text-blue-500"
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-white/80 text-sm mb-2 block">Foto e Sfondit</label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <div className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm hover:bg-white/20 transition-all inline-flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      {uploadingImage ? "Duke ngarkuar..." : "Ngarko Foto"}
                    </div>
                  </label>
                  {formData.background_image && (
                    <div className="flex items-center gap-2">
                      <img src={formData.background_image} alt="Preview" className="w-16 h-16 object-cover rounded" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setFormData({ ...formData, background_image: "" })}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-white/80 text-sm mb-2 block">Lloji i Linkut</label>
                <Select value={formData.link_type} onValueChange={(val) => setFormData({ ...formData, link_type: val })}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="category">Kategori Njoftimesh</SelectItem>
                    <SelectItem value="external">Link i Jashtëm</SelectItem>
                    <SelectItem value="project_page">Faqe e Projektit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.link_type === "category" && (
                <div>
                  <label className="text-white/80 text-sm mb-2 block">Kategoria</label>
                  <Select value={formData.category_name} onValueChange={(val) => setFormData({ ...formData, category_name: val })}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pune">Punë</SelectItem>
                      <SelectItem value="shtepi">Shtëpi</SelectItem>
                      <SelectItem value="juridike">Juridike</SelectItem>
                      <SelectItem value="edukim">Edukim</SelectItem>
                      <SelectItem value="bamiresi">Bamirësi</SelectItem>
                      <SelectItem value="media">Media</SelectItem>
                      <SelectItem value="sherbime">Shërbime</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.link_type === "external" && (
                <div>
                  <label className="text-white/80 text-sm mb-2 block">URL e Jashtme</label>
                  <Input
                    value={formData.external_url}
                    onChange={(e) => setFormData({ ...formData, external_url: e.target.value })}
                    placeholder="https://..."
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
              )}

              {formData.link_type === "project_page" && (
                <div>
                  <label className="text-white/80 text-sm mb-2 block">Përmbajtja e Projektit (HTML)</label>
                  <Textarea
                    value={formData.project_content}
                    onChange={(e) => setFormData({ ...formData, project_content: e.target.value })}
                    className="bg-white/10 border-white/20 text-white font-mono text-xs"
                    rows={8}
                  />
                </div>
              )}

              <div>
                <label className="text-white/80 text-sm mb-2 block">Renditja</label>
                <Input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Anulo
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020]">
                  {editingProject ? "Ruaj Ndryshimet" : "Krijo Projektin"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {projects.map((project) => (
          <Card key={project.id} className="bg-white/5 border-white/10">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-2">{project.title}</h3>
                  <p className="text-white/60 text-sm mb-3">{project.description}</p>
                  <div className="flex items-center gap-3 text-xs text-white/40">
                    <span>Ikona: {project.icon_name}</span>
                    <span>•</span>
                    <span>Link: {project.link_type}</span>
                    {project.category_name && <><span>•</span><span>Kategoria: {project.category_name}</span></>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="icon" variant="ghost" onClick={() => handleEdit(project)} className="text-blue-400 hover:text-blue-300">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("A jeni të sigurt që doni të fshini këtë projekt?")) {
                        deleteMutation.mutate(project.id);
                      }
                    }}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
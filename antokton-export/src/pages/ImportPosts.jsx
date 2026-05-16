import React, { useState, useEffect } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ImportForm from "../components/import/ImportForm";
import ImportTable from "../components/import/ImportTable";
import ImportJobForm from "../components/import/ImportJobForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Table, PlusCircle, ShieldAlert, Briefcase } from "lucide-react";

export default function ImportPosts() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("table");
  const [editingPost, setEditingPost] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-white/60">Duke ngarkuar...</div>
      </div>
    );
  }

  if (user.role !== "admin" && user.role !== "moderator") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-white font-semibold">Qasje e ndaluar</p>
          <p className="text-white/60 text-sm mt-1">Vetëm adminët dhe moderatorët mund ta qasin këtë modul.</p>
        </div>
      </div>
    );
  }

  const handleEdit = (post) => {
    setEditingPost(post);
    setActiveTab("form");
  };

  const handleFormDone = () => {
    setEditingPost(null);
    setActiveTab("table");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Header Note */}
      <div className="mb-6 p-4 rounded-xl border border-[#8ab4ff]/20 bg-[#8ab4ff]/5">
        <div className="flex items-start gap-3">
          <Download className="w-5 h-5 text-[#8ab4ff] mt-0.5 shrink-0" />
          <div>
            <p className="text-white font-semibold text-sm mb-1">Moduli i Importimit</p>
            <p className="text-white/70 text-xs leading-relaxed">
              Ky modul përdoret për të kaluar njoftime nga Facebook ose burime të tjera në Antokton.
              Teksti mund të korrigjohet, ndërsa linket dhe burimet ruhen vetëm për përdorim të brendshëm,
              përveç nëse admini vendos ndryshe.
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-black text-white uppercase tracking-wide">Importo në Antokton</h1>
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="table" className="text-white data-[state=active]:bg-white/10 text-xs gap-1.5">
              <Table className="w-3.5 h-3.5" /> Lista
            </TabsTrigger>
            <TabsTrigger value="form" className="text-white data-[state=active]:bg-white/10 text-xs gap-1.5">
              <PlusCircle className="w-3.5 h-3.5" /> {editingPost ? "Edito" : "Importo (tekst)"}
            </TabsTrigger>
            <TabsTrigger value="job" className="text-white data-[state=active]:bg-white/10 text-xs gap-1.5">
              <Briefcase className="w-3.5 h-3.5" /> Importo Punë (URL)
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="table">
          <ImportTable user={user} onEdit={handleEdit} />
        </TabsContent>

        <TabsContent value="form">
          <ImportForm user={user} editingPost={editingPost} onDone={handleFormDone} />
        </TabsContent>

        <TabsContent value="job">
          <ImportJobForm user={user} onDone={() => setActiveTab("table")} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
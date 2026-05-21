import React, { useState, useEffect } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Save, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

const STATIC_PAGES = [
  { id: "about", title: "Rreth Nesh", description: "Përmbajtja e faqes Rreth Nesh" },
  { id: "privacy", title: "Politika e Privatësisë", description: "Përmbajtja e politikës" },
  { id: "terms", title: "Termat e Përdorimit", description: "Përmbajtja e termave" },
  { id: "cookies", title: "Politika e Cookies", description: "Përmbajtja e politikës së cookies" },
  { id: "contact", title: "Kontakto", description: "Informacioni i kontaktit" }
];

export default function StaticContentManager() {
  const [selectedPage, setSelectedPage] = useState("about");
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const queryClient = useQueryClient();

  const { data: savedPages = {}, isLoading } = useQuery({
    queryKey: ["staticPages"],
    queryFn: async () => {
      const pages = {};
      for (const page of STATIC_PAGES) {
        try {
          const data = localStorage.getItem(`static_page_${page.id}`);
          pages[page.id] = data ? JSON.parse(data) : { title: page.title, content: "" };
        } catch {
          pages[page.id] = { title: page.title, content: "" };
        }
      }
      return pages;
    }
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const pageData = {
        title: title || STATIC_PAGES.find((p) => p.id === selectedPage)?.title,
        content
      };
      localStorage.setItem(`static_page_${selectedPage}`, JSON.stringify(pageData));

      try {
        await base44.functions.invoke("savePage", {
          pageId: selectedPage,
          data: pageData
        });
      } catch (e) {
        console.log("Backend sync not available");
      }
    },
    onSuccess: () => {
      toast.success("Përmbajtja u ruajt!");
      queryClient.invalidateQueries({ queryKey: ["staticPages"] });
    },
    onError: () => {
      toast.error("Gabim në ruajtje");
    }
  });

  useEffect(() => {
    if (savedPages[selectedPage]) {
      setTitle(savedPages[selectedPage].title);
      setContent(savedPages[selectedPage].content);
    } else {
      const page = STATIC_PAGES.find((p) => p.id === selectedPage);
      setTitle(page?.title || "");
      setContent("");
    }
  }, [selectedPage, savedPages]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {STATIC_PAGES.map((page) => (
          <button
            key={page.id}
            onClick={() => setSelectedPage(page.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedPage === page.id
                ? "bg-[#8ab4ff] text-white"
                : "bg-white/5 border border-white/10 text-white/70 hover:bg-white/10"
            }`}
          >
            {page.title}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 p-6" style={{ background: "rgba(255, 255, 255, 0.06)" }}>
        <div className="space-y-4">
          <div>
            <label className="text-white/70 text-sm font-medium block mb-2">Titulli</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titulli i faqes"
            />
          </div>

          <div>
            <label className="text-white/70 text-sm font-medium block mb-2">Përmbajtja</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Shkruaj përmbajtjen e faqes këtu..."
              className="min-h-[400px]"
            />
          </div>

          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] w-full"
          >
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Ruaj Përmbajtjen
          </Button>
        </div>
      </div>
    </div>
  );
}

import React from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { base44 } from "@/api/antoktonClient";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "../utils";

const DESIGNER_PAGES_KEY = "visual_designer_pages";

function parseDesignerPages(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function DesignerPage() {
  const { slug } = useParams();
  const { data: siteConfigs = [], isLoading } = useQuery({
    queryKey: ["siteConfig"],
    queryFn: () => base44.entities.SiteConfig.list(),
    staleTime: 60 * 1000,
  });

  const pagesConfig = siteConfigs.find((config) => config.key === DESIGNER_PAGES_KEY);
  const pages = parseDesignerPages(pagesConfig?.value);
  const page = pages.find((item) => item.slug === slug);
  const title = page?.title || "Faqe Antokton";
  const description = page?.description || "Hapesire e re per permbajtje, sherbime ose njoftime komunitare.";

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/15 border-t-[#9bffd6]" />
      </div>
    );
  }

  return (
    <main className="min-h-[70vh] bg-[#0b1020] px-4 py-12 text-white sm:px-6">
      <div className="mx-auto max-w-5xl space-y-10">
        <Button
          asChild
          variant="outline"
          className="border-white/15 bg-white/5 text-white hover:bg-white/10"
        >
          <Link to={createPageUrl("Admin")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Paneli Admin
          </Link>
        </Button>

        <section className="py-12 sm:py-16">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-[#9bffd6]">
            Antokton
          </p>
          <h1 className="max-w-4xl text-4xl font-black leading-tight text-white sm:text-6xl">
            {title}
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-white/65">
            {description}
          </p>
        </section>

        <section className="grid gap-5 md:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-bold">Qellimi</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/60">
              Kjo faqe mund te pershtatet per nje nisme, sherbim, projekt ose lajmerim te ri.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-bold">Permbajtja</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/60">
              Teksti, imazhet, linket dhe pamja mund te rregullohen nga editori vizual.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-bold">Publikimi</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/60">
              Faqja ruhet brenda projektit lokal dhe mund te publikohet bashke me aplikacionin.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

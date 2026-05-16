import React from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { createPageUrl } from "../utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Briefcase, Globe, Loader2, Mail, MapPin, Shield, Star, Users } from "lucide-react";
import CompanyReviews from "../components/company/CompanyReviews";

const matchesCompany = (company, slug) => {
  if (!slug) return false;
  return [company.id, company.slug, company.owner_email, company.company_name]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase() === slug.toLowerCase());
};

export default function CompanyDetail() {
  const [searchParams] = useSearchParams();
  const slug = searchParams.get("slug") || searchParams.get("id") || "";

  React.useEffect(() => {
    document.title = "Detajet e kompanise - Antokton Jobs";
  }, []);

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["companyProfiles"],
    queryFn: () => base44.entities.CompanyProfile.list("-created_date", 500)
  });

  const company = companies.find((item) => matchesCompany(item, slug));

  const { data: ratings = [] } = useQuery({
    queryKey: ["companyRatings", company?.owner_email],
    enabled: !!company?.owner_email,
    queryFn: async () => {
      const allRatings = await base44.entities.CompanyRating.filter({ company_id: company.owner_email });
      return allRatings.filter((rating) => rating.is_approved);
    }
  });

  const averageRating = ratings.length
    ? (ratings.reduce((sum, rating) => sum + Number(rating.overall_rating || 0), 0) / ratings.length).toFixed(1)
    : null;

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white/40" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-10 text-center">
            <Building2 className="w-14 h-14 mx-auto mb-4 text-white/25" />
            <h1 className="text-2xl font-bold text-white mb-2">Kompania nuk u gjet</h1>
            <p className="text-white/55 mb-6">Profili i kerkuar nuk ekziston ne databazen lokale.</p>
            <Button asChild className="bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020]">
              <Link to={createPageUrl("Companies")}>Kthehu te kompanite</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const categories = Array.isArray(company.service_categories) ? company.service_categories : [];
  const contactEmail = company.contact_email || company.owner_email;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <Card className="bg-white/5 border-white/10 overflow-hidden">
        {company.cover_image_url && (
          <div
            className="h-44 sm:h-56 bg-cover bg-center bg-white/5"
            style={{ backgroundImage: `url(${company.cover_image_url})` }}
          />
        )}
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row gap-5">
            {company.logo_url ? (
              <img
                src={company.logo_url}
                alt={company.company_name}
                className="w-20 h-20 rounded-xl object-cover border border-white/10 bg-white/5"
                onError={(event) => { event.currentTarget.style.display = "none"; }}
              />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-[#8ab4ff] to-[#9bffd6] flex items-center justify-center shrink-0">
                <Building2 className="w-10 h-10 text-[#0b1020]" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">{company.company_name}</h1>
                  <div className="flex flex-wrap gap-2 text-sm text-white/60">
                    {company.industry && <span className="inline-flex items-center gap-1"><Briefcase className="w-4 h-4" />{company.industry}</span>}
                    {company.headquarters && <span className="inline-flex items-center gap-1"><MapPin className="w-4 h-4" />{company.headquarters}</span>}
                    {company.company_size && <span className="inline-flex items-center gap-1"><Users className="w-4 h-4" />{company.company_size}</span>}
                  </div>
                </div>

                {averageRating && (
                  <div className="rounded-xl bg-white/8 border border-white/10 px-4 py-3 flex items-center gap-2 self-start">
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    <span className="text-white font-bold">{averageRating}</span>
                    <span className="text-white/45 text-sm">({ratings.length})</span>
                  </div>
                )}
              </div>

              {company.description && (
                <p className="text-white/75 leading-relaxed mt-5">{company.description}</p>
              )}

              <div className="flex flex-wrap gap-2 mt-5">
                {company.is_verified && (
                  <Badge className="bg-emerald-400/15 text-emerald-300 border border-emerald-400/25">
                    <Shield className="w-3 h-3 mr-1" />
                    Verifikuar
                  </Badge>
                )}
                {categories.map((category) => (
                  <Badge key={category} variant="outline" className="border-white/15 text-white/70">
                    {category}
                  </Badge>
                ))}
              </div>

              <div className="flex flex-wrap gap-3 mt-6">
                {company.website_url && (
                  <Button asChild variant="outline" className="border-white/15 text-white hover:bg-white/10">
                    <a href={company.website_url} target="_blank" rel="noopener noreferrer">
                      <Globe className="w-4 h-4 mr-2" />
                      Website
                    </a>
                  </Button>
                )}
                {contactEmail && (
                  <Button asChild variant="outline" className="border-white/15 text-white hover:bg-white/10">
                    <a href={`mailto:${contactEmail}`}>
                      <Mail className="w-4 h-4 mr-2" />
                      Kontakt
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <CompanyReviews companyEmail={company.owner_email || company.id} companyName={company.company_name} />

        <Card className="bg-white/5 border-white/10 self-start">
          <CardHeader>
            <CardTitle className="text-white text-lg">Informacion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {company.founded_year && (
              <div className="flex justify-between gap-4">
                <span className="text-white/45">Themeluar</span>
                <span className="text-white">{company.founded_year}</span>
              </div>
            )}
            {company.company_size && (
              <div className="flex justify-between gap-4">
                <span className="text-white/45">Punonjes</span>
                <span className="text-white">{company.company_size}</span>
              </div>
            )}
            {company.industry && (
              <div className="flex justify-between gap-4">
                <span className="text-white/45">Industri</span>
                <span className="text-white text-right">{company.industry}</span>
              </div>
            )}
            {company.headquarters && (
              <div className="flex justify-between gap-4">
                <span className="text-white/45">Lokacion</span>
                <span className="text-white text-right">{company.headquarters}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

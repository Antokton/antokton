import React, { useEffect, useState } from "react";
import { base44 } from "@/api/antoktonClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Loader2, Sparkles, Users, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../../utils";

export default function SimilarCompanies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSimilarCompanies = async () => {
      try {
        const { data } = await base44.functions.invoke('getSimilarCompanies', {});
        
        if (data.success) {
          setCompanies(data.similar_companies);
        }
      } catch (error) {
        console.error('Error loading similar companies:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSimilarCompanies();
  }, []);

  if (loading) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (companies.length === 0) {
    return null;
  }

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#8ab4ff]" />
          Kompani të ngjashme
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {companies.map(company => (
          <Link
            key={company.owner_email}
            to={createPageUrl("CompanyDetail") + `?slug=${company.slug || company.owner_email}`}
            className="block"
          >
            <div className="p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
              <div className="flex items-start gap-3">
                {company.logo_url ? (
                  <img
                    src={company.logo_url}
                    alt={company.company_name}
                    className="w-12 h-12 rounded object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded bg-gradient-to-br from-[#8ab4ff] to-[#9bffd6] flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-6 h-6 text-[#0b1020]" />
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-white font-medium truncate">{company.company_name}</h4>
                    <Badge className="bg-[#8ab4ff]/20 text-[#8ab4ff] text-xs flex-shrink-0">
                      {company.similarity_score}%
                    </Badge>
                  </div>
                  
                  {company.industry && (
                    <p className="text-white/60 text-xs mt-1">{company.industry}</p>
                  )}
                  
                  {company.similarity_reason && (
                    <p className="text-[#8ab4ff] text-xs mt-2">{company.similarity_reason}</p>
                  )}
                  
                  <div className="flex gap-2 mt-2">
                    {company.company_size && (
                      <Badge variant="outline" className="text-white/40 text-xs">
                        <Users className="w-3 h-3 mr-1" />
                        {company.company_size}
                      </Badge>
                    )}
                    {company.headquarters && (
                      <Badge variant="outline" className="text-white/40 text-xs">
                        <MapPin className="w-3 h-3 mr-1" />
                        {company.headquarters}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
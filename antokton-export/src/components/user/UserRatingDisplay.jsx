import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Award, Shield, CheckCircle } from "lucide-react";

export default function UserRatingDisplay({ user, ratings }) {
  const generalRatings = ratings.filter(r => r.rating_type === "general");
  const professionalRating = ratings.find(r => r.rating_type === "professional_inspector");
  const halalRating = ratings.find(r => r.rating_type === "halal_compliance");

  const averageGeneral = generalRatings.length > 0
    ? (generalRatings.reduce((sum, r) => sum + r.score, 0) / generalRatings.length).toFixed(1)
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* General Rating */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-400" />
              <h3 className="text-white font-semibold text-sm">Vlerësim i përgjithshëm</h3>
            </div>
            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
              {averageGeneral}/5
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-4 h-4 ${
                  star <= Math.round(averageGeneral)
                    ? "text-yellow-400 fill-yellow-400"
                    : "text-white/20"
                }`}
              />
            ))}
          </div>
          <p className="text-white/40 text-xs mt-2">{generalRatings.length} vlerësime</p>
        </CardContent>
      </Card>

      {/* Professional Rating */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-400" />
              <h3 className="text-white font-semibold text-sm">Vlerësim profesional</h3>
            </div>
            {professionalRating ? (
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                {professionalRating.professionalism_score}/5
              </Badge>
            ) : (
              <Badge variant="outline" className="text-white/40 border-white/10">
                Pa vlerësim
              </Badge>
            )}
          </div>
          {professionalRating ? (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/60">Profesionalizëm</span>
                  <span className="text-white">{professionalRating.professionalism_score}/5</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/60">Seriozitet</span>
                  <span className="text-white">{professionalRating.reliability_score}/5</span>
                </div>
              </div>
              {professionalRating.verified && (
                <div className="mt-3 flex items-center gap-1 text-blue-400 text-xs">
                  <CheckCircle className="w-3 h-3" />
                  Verifikuar nga inspektori
                </div>
              )}
            </>
          ) : (
            <p className="text-white/40 text-xs">Nuk është vlerësuar ende</p>
          )}
        </CardContent>
      </Card>

      {/* Halal Compliance */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-400" />
              <h3 className="text-white font-semibold text-sm">Halal Compliance</h3>
            </div>
            {user.halal_verified ? (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                Verifikuar
              </Badge>
            ) : (
              <Badge variant="outline" className="text-white/40 border-white/10">
                Pa verifikim
              </Badge>
            )}
          </div>
          {halalRating ? (
            <>
              <p className="text-white/70 text-sm">
                {halalRating.halal_compliant ? "Respekton standardet halal" : "Nën shqyrtim"}
              </p>
              {halalRating.comment && (
                <p className="text-white/40 text-xs mt-2 italic">"{halalRating.comment}"</p>
              )}
            </>
          ) : (
            <p className="text-white/40 text-xs">Nuk është vlerësuar ende</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
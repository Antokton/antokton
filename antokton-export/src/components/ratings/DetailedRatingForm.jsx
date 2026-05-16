import React, { useState } from "react";
import { base44 } from "@/api/antoktonClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, CheckCircle } from "lucide-react";

export default function DetailedRatingForm({ ratedEmail, ratingType, jobId, onSuccess }) {
  const [ratings, setRatings] = useState({
    overall_rating: 0,
    professionalism: 0,
    communication: 0,
    reliability: 0,
    work_quality: 0,
    work_environment: 0
  });

  const [comments, setComments] = useState({
    professionalism_comment: "",
    communication_comment: "",
    reliability_comment: "",
    work_quality_comment: "",
    work_environment_comment: ""
  });

  const [generalComment, setGeneralComment] = useState("");
  const [wouldRecommend, setWouldRecommend] = useState(true);
  const [loading, setLoading] = useState(false);

  const StarRating = ({ value, onChange, label, commentKey }) => (
    <div className="space-y-2 mb-4">
      <Label className="text-white/70">{label}</Label>
      <div className="flex gap-1 mb-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="focus:outline-none"
          >
            <Star
              className={`w-6 h-6 ${star <= value ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`}
            />
          </button>
        ))}
      </div>
      <Textarea
        placeholder={`Koment për ${label.toLowerCase()} (opsionale)...`}
        value={comments[commentKey] || ""}
        onChange={(e) => setComments({ ...comments, [commentKey]: e.target.value })}
        className="bg-white/5 border-white/10 text-white min-h-[60px]"
      />
    </div>
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (ratings.overall_rating === 0) {
      alert("Ju lutem vendosni një vlerësim të përgjithshëm!");
      return;
    }

    setLoading(true);
    try {
      const user = await base44.auth.me();
      await base44.entities.DetailedRating.create({
        rater_email: user.email,
        rated_email: ratedEmail,
        rating_type: ratingType,
        job_id: jobId,
        ...ratings,
        comments,
        general_comment: generalComment,
        would_recommend: wouldRecommend
      });
      
      if (onSuccess) onSuccess();
    } catch (error) {
      alert("Gabim në dërgimin e vlerësimit: " + error.message);
    }
    setLoading(false);
  };

  const isEmployerRating = ratingType === "employer_to_candidate";

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white">
          {isEmployerRating ? "Vlerëso kandidatin" : "Vlerëso punëdhënësin"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <StarRating
            label="Vlerësim i përgjithshëm"
            value={ratings.overall_rating}
            onChange={(val) => setRatings({ ...ratings, overall_rating: val })}
            commentKey="overall_comment"
          />

          <StarRating
            label="Profesionalizmi"
            value={ratings.professionalism}
            onChange={(val) => setRatings({ ...ratings, professionalism: val })}
            commentKey="professionalism_comment"
          />

          <StarRating
            label="Komunikimi"
            value={ratings.communication}
            onChange={(val) => setRatings({ ...ratings, communication: val })}
            commentKey="communication_comment"
          />

          <StarRating
            label="Besueshmëria"
            value={ratings.reliability}
            onChange={(val) => setRatings({ ...ratings, reliability: val })}
            commentKey="reliability_comment"
          />

          <StarRating
            label="Cilësia e punës"
            value={ratings.work_quality}
            onChange={(val) => setRatings({ ...ratings, work_quality: val })}
            commentKey="work_quality_comment"
          />

          {!isEmployerRating && (
            <StarRating
              label="Ambienti i punës"
              value={ratings.work_environment}
              onChange={(val) => setRatings({ ...ratings, work_environment: val })}
              commentKey="work_environment_comment"
            />
          )}

          <div className="space-y-2">
            <Label className="text-white/70">Koment i përgjithshëm</Label>
            <Textarea
              value={generalComment}
              onChange={(e) => setGeneralComment(e.target.value)}
              placeholder="Shkruani një koment të përgjithshëm..."
              className="bg-white/5 border-white/10 text-white min-h-[100px]"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="recommend"
              checked={wouldRecommend}
              onChange={(e) => setWouldRecommend(e.target.checked)}
              className="w-4 h-4"
            />
            <Label htmlFor="recommend" className="text-white/70">
              {isEmployerRating ? "Do ta punësoja sërish" : "Do ta rekomandoja këtë punëdhënës"}
            </Label>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020]"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Dërgo vlerësimin
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
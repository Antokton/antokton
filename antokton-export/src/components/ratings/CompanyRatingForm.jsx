import React, { useState } from "react";
import { base44 } from "@/api/antoktonClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, Loader2 } from "lucide-react";

export default function CompanyRatingForm({ companyEmail, jobId, trigger }) {
  const [open, setOpen] = useState(false);
  const [ratings, setRatings] = useState({
    overall_rating: 0,
    communication_rating: 0,
    work_environment_rating: 0,
    salary_benefits_rating: 0,
    comment: "",
    would_recommend: true
  });

  const queryClient = useQueryClient();

  const submitMutation = useMutation({
    mutationFn: (data) => base44.entities.CompanyRating.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companyRatings"] });
      setOpen(false);
      setRatings({
        overall_rating: 0,
        communication_rating: 0,
        work_environment_rating: 0,
        salary_benefits_rating: 0,
        comment: "",
        would_recommend: true
      });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (ratings.overall_rating === 0) {
      alert("Ju lutem zgjidhni një vlerësim të përgjithshëm");
      return;
    }

    submitMutation.mutate({
      company_email: companyEmail,
      job_id: jobId,
      ...ratings
    });
  };

  const StarRating = ({ value, onChange, label }) => (
    <div className="space-y-2">
      <Label className="text-white/70">{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="transition-transform hover:scale-110"
          >
            <Star 
              className={`w-6 h-6 ${
                star <= value 
                  ? "text-yellow-400 fill-yellow-400" 
                  : "text-white/20"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="bg-[#0b1020] border-white/10 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white">Vlerëso kompaninë</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <StarRating 
            value={ratings.overall_rating}
            onChange={(v) => setRatings({ ...ratings, overall_rating: v })}
            label="Vlerësim i përgjithshëm"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StarRating 
              value={ratings.communication_rating}
              onChange={(v) => setRatings({ ...ratings, communication_rating: v })}
              label="Komunikimi"
            />
            <StarRating 
              value={ratings.work_environment_rating}
              onChange={(v) => setRatings({ ...ratings, work_environment_rating: v })}
              label="Ambienti"
            />
            <StarRating 
              value={ratings.salary_benefits_rating}
              onChange={(v) => setRatings({ ...ratings, salary_benefits_rating: v })}
              label="Paga & Benefite"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white/70">Komenti (opsional)</Label>
            <Textarea
              value={ratings.comment}
              onChange={(e) => setRatings({ ...ratings, comment: e.target.value })}
              placeholder="Ndaj eksperiencën tënde..."
              className="bg-white/5 border-white/10 text-white min-h-[100px]"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="would_recommend"
              checked={ratings.would_recommend}
              onChange={(e) => setRatings({ ...ratings, would_recommend: e.target.checked })}
              className="w-4 h-4"
            />
            <Label htmlFor="would_recommend" className="text-white/70">
              Do ta rekomandoja këtë kompani
            </Label>
          </div>

          <Button
            type="submit"
            disabled={submitMutation.isPending}
            className="w-full bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] hover:opacity-90"
          >
            {submitMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Dërgo vlerësimin
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
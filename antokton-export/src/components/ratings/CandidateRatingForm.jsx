import React, { useState } from "react";
import { base44 } from "@/api/antoktonClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, Loader2 } from "lucide-react";

export default function CandidateRatingForm({ candidateEmail, jobId, trigger }) {
  const [open, setOpen] = useState(false);
  const [ratings, setRatings] = useState({
    overall_rating: 0,
    professionalism_rating: 0,
    skills_rating: 0,
    communication_rating: 0,
    reliability_rating: 0,
    comment: "",
    would_rehire: true
  });

  const queryClient = useQueryClient();

  const submitMutation = useMutation({
    mutationFn: (data) => base44.entities.CandidateRating.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidateRatings"] });
      setOpen(false);
      setRatings({
        overall_rating: 0,
        professionalism_rating: 0,
        skills_rating: 0,
        communication_rating: 0,
        reliability_rating: 0,
        comment: "",
        would_rehire: true
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
      candidate_email: candidateEmail,
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
    <Dialog open={open} onViewChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="bg-[#0b1020] border-white/10 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white">Vlerëso kandidatin</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <StarRating 
            value={ratings.overall_rating}
            onChange={(v) => setRatings({ ...ratings, overall_rating: v })}
            label="Vlerësim i përgjithshëm"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StarRating 
              value={ratings.professionalism_rating}
              onChange={(v) => setRatings({ ...ratings, professionalism_rating: v })}
              label="Profesionalizmi"
            />
            <StarRating 
              value={ratings.skills_rating}
              onChange={(v) => setRatings({ ...ratings, skills_rating: v })}
              label="Aftësitë"
            />
            <StarRating 
              value={ratings.communication_rating}
              onChange={(v) => setRatings({ ...ratings, communication_rating: v })}
              label="Komunikimi"
            />
            <StarRating 
              value={ratings.reliability_rating}
              onChange={(v) => setRatings({ ...ratings, reliability_rating: v })}
              label="Serioziteti"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white/70">Komenti (opsional)</Label>
            <Textarea
              value={ratings.comment}
              onChange={(e) => setRatings({ ...ratings, comment: e.target.value })}
              placeholder="Ndaj eksperiencën me këtë kandidat..."
              className="bg-white/5 border-white/10 text-white min-h-[100px]"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="would_rehire"
              checked={ratings.would_rehire}
              onChange={(e) => setRatings({ ...ratings, would_rehire: e.target.checked })}
              className="w-4 h-4"
            />
            <Label htmlFor="would_rehire" className="text-white/70">
              Do ta punësoja sërish këtë kandidat
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
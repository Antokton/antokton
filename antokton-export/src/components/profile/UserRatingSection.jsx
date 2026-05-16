import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/antoktonClient";
import { Star, ThumbsUp, MessageSquare, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import moment from "moment";

export default function UserRatingSection({ profileEmail }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [professionalism, setProfessionalism] = useState(5);
  const [communication, setCommunication] = useState(5);
  const [reliability, setReliability] = useState(5);
  const [comment, setComment] = useState("");
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const getUser = async () => {
      const auth = await base44.auth.isAuthenticated();
      if (auth) {
        const me = await base44.auth.me();
        setCurrentUser(me);
      }
    };
    getUser();
  }, []);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["userReviews", profileEmail],
    queryFn: () => base44.entities.UserReview.filter({ reviewed_email: profileEmail }, "-created_date", 50),
  });

  const { data: myReview } = useQuery({
    queryKey: ["myReview", profileEmail, currentUser?.email],
    queryFn: () => {
      if (!currentUser) return null;
      return base44.entities.UserReview.filter({
        reviewer_email: currentUser.email,
        reviewed_email: profileEmail
      }, "-created_date", 1);
    },
    enabled: !!currentUser,
  });

  const createReviewMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.UserReview.create({
        reviewer_email: currentUser.email,
        reviewed_email: profileEmail,
        rating,
        professionalism,
        communication,
        reliability,
        comment,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userReviews", profileEmail] });
      queryClient.invalidateQueries({ queryKey: ["myReview", profileEmail, currentUser?.email] });
      setShowForm(false);
      setComment("");
    },
  });

  const avgRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

  const avgProfessionalism = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + (r.professionalism || 0), 0) / reviews.length).toFixed(1)
    : 0;

  const avgCommunication = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + (r.communication || 0), 0) / reviews.length).toFixed(1)
    : 0;

  const avgReliability = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + (r.reliability || 0), 0) / reviews.length).toFixed(1)
    : 0;

  const canReview = currentUser && currentUser.email !== profileEmail && (!myReview || myReview.length === 0);

  const StarRating = ({ value, onChange, readonly = false }) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => !readonly && onChange(star)}
            className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform`}
          >
            <Star
              className={`w-5 h-5 ${
                star <= value
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-white/20"
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Stats */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Vlerësimet</h3>
            {canReview && !showForm && (
              <Button
                onClick={() => setShowForm(true)}
                size="sm"
                className="bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020]"
              >
                Lër vlerësim
              </Button>
            )}
          </div>

          {reviews.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-1">{avgRating}</div>
                <StarRating value={Math.round(avgRating)} readonly />
                <p className="text-white/40 text-xs mt-1">{reviews.length} vlerësime</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <ThumbsUp className="w-4 h-4 text-[#8ab4ff]" />
                  <span className="text-white/60 text-sm">Profesionalizëm</span>
                </div>
                <div className="text-2xl font-bold text-white">{avgProfessionalism}</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-[#9bffd6]" />
                  <span className="text-white/60 text-sm">Komunikim</span>
                </div>
                <div className="text-2xl font-bold text-white">{avgCommunication}</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-[#8ab4ff]" />
                  <span className="text-white/60 text-sm">Besueshmëri</span>
                </div>
                <div className="text-2xl font-bold text-white">{avgReliability}</div>
              </div>
            </div>
          ) : (
            <p className="text-white/40 text-center py-4">Asnjë vlerësim ende</p>
          )}
        </CardContent>
      </Card>

      {/* Review Form */}
      {showForm && (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6 space-y-4">
            <h4 className="font-semibold text-white">Lër vlerësimin tënd</h4>
            
            <div>
              <label className="text-white/60 text-sm mb-2 block">Vlerësim i përgjithshëm</label>
              <StarRating value={rating} onChange={setRating} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-white/60 text-sm mb-2 block">Profesionalizëm</label>
                <StarRating value={professionalism} onChange={setProfessionalism} />
              </div>
              <div>
                <label className="text-white/60 text-sm mb-2 block">Komunikim</label>
                <StarRating value={communication} onChange={setCommunication} />
              </div>
              <div>
                <label className="text-white/60 text-sm mb-2 block">Besueshmëri</label>
                <StarRating value={reliability} onChange={setReliability} />
              </div>
            </div>

            <div>
              <label className="text-white/60 text-sm mb-2 block">Komenti (opsional)</label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Shkruaj përshtypjet tua..."
                className="bg-white/5 border-white/10 text-white min-h-[100px]"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => createReviewMutation.mutate()}
                disabled={createReviewMutation.isPending}
                className="bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020]"
              >
                {createReviewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Publiko"}
              </Button>
              <Button
                onClick={() => setShowForm(false)}
                variant="outline"
                className="border-white/10 text-white"
              >
                Anulo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reviews List */}
      <div className="space-y-3">
        {reviews.map((review) => (
          <Card key={review.id} className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-medium text-sm">{review.reviewer_email}</span>
                    {review.is_verified && (
                      <Badge className="bg-[#8ab4ff]/20 text-[#8ab4ff] text-xs">Verifikuar</Badge>
                    )}
                  </div>
                  <StarRating value={review.rating} readonly />
                </div>
                <span className="text-white/40 text-xs">{moment(review.created_date).fromNow()}</span>
              </div>

              <div className="flex gap-4 mb-3 text-xs">
                <span className="text-white/60">
                  <ThumbsUp className="w-3 h-3 inline mr-1" />
                  Profesionalizëm: {review.professionalism}/5
                </span>
                <span className="text-white/60">
                  <MessageSquare className="w-3 h-3 inline mr-1" />
                  Komunikim: {review.communication}/5
                </span>
                <span className="text-white/60">
                  <Clock className="w-3 h-3 inline mr-1" />
                  Besueshmëri: {review.reliability}/5
                </span>
              </div>

              {review.comment && (
                <p className="text-white/80 text-sm">{review.comment}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
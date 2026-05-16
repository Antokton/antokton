import React, { useState } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Star, MessageSquare, Loader2, User, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import moment from "moment";

export default function CompanyReviews({ companyEmail, companyName }) {
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    overall_rating: 5,
    position: "",
    start_year: new Date().getFullYear(),
    end_year: null,
    is_current: false,
    work_environment: 5,
    salary_benefits: 5,
    management: 5,
    career_opportunities: 5,
    work_life_balance: 5,
    comment: "",
    is_anonymous: false
  });
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const loadUser = async () => {
      const authenticated = await base44.auth.isAuthenticated();
      if (authenticated) {
        const me = await base44.auth.me();
        setUser(me);
      }
    };
    loadUser();
  }, []);

  const { data: reviews = [] } = useQuery({
    queryKey: ["companyReviews", companyEmail],
    queryFn: async () => {
      const allReviews = await base44.entities.CompanyRating.filter({ company_id: companyEmail });
      return allReviews.filter(r => r.is_approved);
    }
  });

  const submitReviewMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.CompanyRating.create({
        ...data,
        company_id: companyEmail,
        reviewer_email: user.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companyReviews"] });
      setShowForm(false);
      setForm({
        overall_rating: 5,
        position: "",
        start_year: new Date().getFullYear(),
        end_year: null,
        is_current: false,
        work_environment: 5,
        salary_benefits: 5,
        management: 5,
        career_opportunities: 5,
        work_life_balance: 5,
        comment: "",
        is_anonymous: false
      });
      alert("Rishikimi juaj u dërgua për aprovim!");
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    submitReviewMutation.mutate(form);
  };

  const avgRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.overall_rating, 0) / reviews.length).toFixed(1)
    : null;

  const avgCategoryRatings = reviews.length > 0 ? {
    work_environment: (reviews.reduce((sum, r) => sum + r.work_environment, 0) / reviews.length).toFixed(1),
    salary_benefits: (reviews.reduce((sum, r) => sum + r.salary_benefits, 0) / reviews.length).toFixed(1),
    management: (reviews.reduce((sum, r) => sum + r.management, 0) / reviews.length).toFixed(1),
    career_opportunities: (reviews.reduce((sum, r) => sum + r.career_opportunities, 0) / reviews.length).toFixed(1),
    work_life_balance: (reviews.reduce((sum, r) => sum + r.work_life_balance, 0) / reviews.length).toFixed(1)
  } : null;

  const StarRating = ({ value, onChange, readonly = false }) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onClick={() => !readonly && onChange(star)}
            disabled={readonly}
            className={`${readonly ? '' : 'hover:scale-110'} transition-transform`}
          >
            <Star 
              className={`w-5 h-5 ${star <= value ? 'text-yellow-400 fill-yellow-400' : 'text-white/20'}`}
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-white">
            <MessageSquare className="w-5 h-5" />
            Rishikimet nga Punonjësit
          </CardTitle>
          {user && (
            <Button
              onClick={() => setShowForm(!showForm)}
              className="bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020]"
            >
              {showForm ? 'Anulo' : 'Shkruaj një Rishikim'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Review Form */}
        <AnimatePresence>
          {showForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleSubmit}
              className="p-6 rounded-lg bg-white/5 border border-white/10 space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white">Vlerësimi i përgjithshëm *</Label>
                  <StarRating value={form.overall_rating} onChange={(v) => setForm({...form, overall_rating: v})} />
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Pozicioni *</Label>
                  <Input
                    value={form.position}
                    onChange={(e) => setForm({...form, position: e.target.value})}
                    placeholder="P.sh. Software Developer"
                    required
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-white">Viti i fillimit *</Label>
                  <Input
                    type="number"
                    value={form.start_year}
                    onChange={(e) => setForm({...form, start_year: parseInt(e.target.value)})}
                    min="1950"
                    max={new Date().getFullYear()}
                    required
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Viti i mbarimit</Label>
                  <Input
                    type="number"
                    value={form.end_year || ''}
                    onChange={(e) => setForm({...form, end_year: e.target.value ? parseInt(e.target.value) : null, is_current: false})}
                    min={form.start_year}
                    max={new Date().getFullYear()}
                    disabled={form.is_current}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_current}
                      onChange={(e) => setForm({...form, is_current: e.target.checked, end_year: null})}
                      className="w-4 h-4"
                    />
                    Punoj aktualisht
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-white font-semibold">Vlerësime detajuara *</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { key: 'work_environment', label: 'Ambienti i punës' },
                    { key: 'salary_benefits', label: 'Paga & Benefitime' },
                    { key: 'management', label: 'Menaxhimi' },
                    { key: 'career_opportunities', label: 'Mundësi Karriere' },
                    { key: 'work_life_balance', label: 'Balance Punë-Jetë' }
                  ].map(({ key, label }) => (
                    <div key={key} className="space-y-1">
                      <Label className="text-white/70 text-sm">{label}</Label>
                      <StarRating value={form[key]} onChange={(v) => setForm({...form, [key]: v})} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Komenti *</Label>
                <Textarea
                  value={form.comment}
                  onChange={(e) => setForm({...form, comment: e.target.value})}
                  placeholder="Shpjego përvojën tënde në kompani..."
                  rows={4}
                  required
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <label className="flex items-center gap-2 text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_anonymous}
                  onChange={(e) => setForm({...form, is_anonymous: e.target.checked})}
                  className="w-4 h-4"
                />
                Postoje Anonim
              </label>

              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={submitReviewMutation.isPending}
                  className="bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020]"
                >
                  {submitReviewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Dërgo Rishikimin
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  className="border-white/10 text-white"
                >
                  Anulo
                </Button>
              </div>

              <p className="text-white/40 text-xs">
                <AlertCircle className="w-3 h-3 inline mr-1" />
                Rishikimi do të shfaqet pas aprovimit nga moderatorët
              </p>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Average Ratings */}
        {avgCategoryRatings && (
          <div className="p-6 rounded-lg bg-white/5 border border-white/10">
            <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
              {avgRating && (
                <>
                  <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  <span>{avgRating}</span>
                  <span className="text-white/40 text-sm">({reviews.length} rishikime)</span>
                </>
              )}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'work_environment', label: 'Ambienti i punës' },
                { key: 'salary_benefits', label: 'Paga & Benefitime' },
                { key: 'management', label: 'Menaxhimi' },
                { key: 'career_opportunities', label: 'Mundësi Karriere' },
                { key: 'work_life_balance', label: 'Balance Punë-Jetë' }
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-white/70 text-sm">{label}</span>
                  <div className="flex items-center gap-2">
                    <StarRating value={parseFloat(avgCategoryRatings[key])} readonly />
                    <span className="text-white text-sm">{avgCategoryRatings[key]}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews List */}
        {reviews.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/40">Nuk ka rishikime ende</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-lg bg-white/5 border border-white/10"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#8ab4ff] to-[#9bffd6] flex items-center justify-center">
                      <User className="w-5 h-5 text-[#0b1020]" />
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        {review.is_anonymous ? 'Anonim' : review.reviewer_email?.split('@')[0]}
                      </p>
                      <p className="text-white/50 text-sm">{review.position}</p>
                      <p className="text-white/40 text-xs">
                        {review.start_year} - {review.is_current ? 'Aktualisht' : review.end_year}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StarRating value={review.overall_rating} readonly />
                    <span className="text-white/40 text-xs flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {moment(review.created_date).fromNow()}
                    </span>
                  </div>
                </div>

                <p className="text-white/80 mb-3 leading-relaxed">{review.comment}</p>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {[
                    { key: 'work_environment', label: 'Ambienti' },
                    { key: 'salary_benefits', label: 'Paga' },
                    { key: 'management', label: 'Menaxhimi' },
                    { key: 'career_opportunities', label: 'Karriera' },
                    { key: 'work_life_balance', label: 'Balance' }
                  ].map(({ key, label }) => (
                    <Badge key={key} variant="outline" className="border-white/20 text-white/60 text-xs justify-between">
                      {label}: {review[key]}⭐
                    </Badge>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
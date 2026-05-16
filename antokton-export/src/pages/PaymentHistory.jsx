import React, { useState, useEffect } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Receipt, Calendar, CreditCard, CheckCircle } from "lucide-react";

export default function PaymentHistory() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const authenticated = await base44.auth.isAuthenticated();
      if (authenticated) {
        const me = await base44.auth.me();
        setUser(me);
      } else {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, []);

  const { data: featuredPayments, isLoading: loadingFeatured } = useQuery({
    queryKey: ['featuredPayments', user?.email],
    queryFn: () => base44.entities.FeaturedJob.filter({ created_by: user.email }, '-created_date', 50),
    enabled: !!user
  });

  const { data: subscriptions, isLoading: loadingSubs } = useQuery({
    queryKey: ['subscriptionPayments', user?.email],
    queryFn: () => base44.entities.PremiumSubscription.filter({ user_email: user.email }, '-created_date', 50),
    enabled: !!user
  });

  if (!user || loadingFeatured || loadingSubs) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  const allPayments = [
    ...(featuredPayments || []).map(p => ({
      id: p.id,
      type: 'featured',
      description: `Njoftim i ${p.featured_type}`,
      amount: p.price_paid,
      date: p.created_date,
      status: 'completed'
    })),
    ...(subscriptions || []).map(s => ({
      id: s.id,
      type: 'subscription',
      description: `Abonim ${s.subscription_type}`,
      amount: s.amount_paid,
      date: s.created_date,
      status: s.is_active ? 'active' : 'expired'
    }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const totalSpent = allPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] flex items-center justify-center">
              <Receipt className="w-5 h-5 text-[#0b1020]" />
            </div>
            <h1 className="text-3xl font-bold text-white">Historiku i Pagesave</h1>
          </div>
          <p className="text-white/60">Të gjitha transaksionet dhe abonimet tuaja</p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-4 h-4 text-white/40" />
                <p className="text-white/40 text-xs">Totali i shpenzuar</p>
              </div>
              <p className="text-2xl font-bold text-white">{totalSpent.toFixed(2)}€</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Receipt className="w-4 h-4 text-white/40" />
                <p className="text-white/40 text-xs">Transaksione</p>
              </div>
              <p className="text-2xl font-bold text-white">{allPayments.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-white/40" />
                <p className="text-white/40 text-xs">Të suksesshme</p>
              </div>
              <p className="text-2xl font-bold text-white">{allPayments.filter(p => p.status === 'completed' || p.status === 'active').length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Payments List */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Transaksionet</CardTitle>
          </CardHeader>
          <CardContent>
            {allPayments.length === 0 ? (
              <div className="text-center py-8">
                <Receipt className="w-12 h-12 text-white/40 mx-auto mb-3" />
                <p className="text-white/60">Nuk ka pagesa ende</p>
              </div>
            ) : (
              <div className="space-y-3">
                {allPayments.map(payment => (
                  <div key={payment.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                    <div className="flex-1">
                      <p className="text-white font-medium">{payment.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="w-3 h-3 text-white/40" />
                        <p className="text-white/40 text-xs">
                          {new Date(payment.date).toLocaleDateString('sq', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-white font-bold">{payment.amount.toFixed(2)}€</p>
                      <Badge 
                        className={
                          payment.status === 'completed' || payment.status === 'active' 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-gray-500/20 text-gray-400'
                        }
                      >
                        {payment.status === 'completed' || payment.status === 'active' ? 'Aktiv' : 'Skaduar'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
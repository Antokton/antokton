import React, { useState, useEffect } from "react";
import { base44 } from "@/api/antoktonClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import { Users, Briefcase, TrendingUp, FileText, Loader2, ShieldAlert } from "lucide-react";
import { subDays, format, startOfDay } from "date-fns";

export default function AdminAnalytics() {
  const [user, setUser] = useState(null);
  const [checked, setChecked] = useState(false);

  React.useEffect(() => {
    base44.auth.isAuthenticated().then(auth => {
      if (auth) base44.auth.me().then(u => { setUser(u); setChecked(true); });
      else setChecked(true);
    });
  }, []);

  const { data: allUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["adminAnalyticsUsers"],
    queryFn: () => base44.entities.User.list(),
    enabled: user?.role === "admin"
  });

  const { data: allJobs = [], isLoading: loadingJobs } = useQuery({
    queryKey: ["adminAnalyticsJobs"],
    queryFn: () => base44.entities.Job.list("-created_date", 500),
    enabled: user?.role === "admin"
  });

  const { data: allApplications = [], isLoading: loadingApps } = useQuery({
    queryKey: ["adminAnalyticsApps"],
    queryFn: () => base44.entities.JobApplication.list("-created_date", 500),
    enabled: user?.role === "admin"
  });

  if (!checked) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-white/50 animate-spin" /></div>;
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <ShieldAlert className="w-12 h-12 text-red-400" />
        <p className="text-white/60 text-lg">Vetëm administratorët mund ta shohin këtë faqe.</p>
      </div>
    );
  }

  // Build last 7 days data
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = startOfDay(subDays(new Date(), 6 - i));
    const label = format(date, "dd/MM");
    const nextDay = startOfDay(subDays(new Date(), 5 - i));

    const newUsers = allUsers.filter(u => {
      const d = new Date(u.created_date);
      return d >= date && d < nextDay;
    }).length;

    const newJobs = allJobs.filter(j => {
      const d = new Date(j.created_date);
      return d >= date && d < nextDay;
    }).length;

    const newApps = allApplications.filter(a => {
      const d = new Date(a.created_date);
      return d >= date && d < nextDay;
    }).length;

    return { label, newUsers, newJobs, newApps };
  });

  const isLoading = loadingUsers || loadingJobs || loadingApps;

  const stats = [
    { label: "Gjithsej Përdorues", value: allUsers.length, icon: Users, color: "text-[#8ab4ff]" },
    { label: "Gjithsej Njoftime", value: allJobs.length, icon: Briefcase, color: "text-[#9bffd6]" },
    { label: "Gjithsej Aplikime", value: allApplications.length, icon: FileText, color: "text-yellow-400" },
    { label: "Njoftime Aktive", value: allJobs.filter(j => j.status === "approved").length, icon: TrendingUp, color: "text-green-400" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight">Analytics</h1>
        <p className="text-white/50 mt-1">Statistikat e platformës për 7 ditët e fundit</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-white/50 animate-spin" /></div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {stats.map(s => (
              <Card key={s.label} className="bg-white/5 border-white/10">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <s.icon className={`w-4 h-4 ${s.color}`} />
                    <p className="text-white/60 text-xs font-medium">{s.label}</p>
                  </div>
                  <p className="text-3xl font-bold text-white">{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Users chart */}
          <Card className="bg-white/5 border-white/10 mb-6">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-[#8ab4ff]" />
                Përdorues të rinj (7 ditë)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={days} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#0b1020', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="newUsers" name="Përdorues të rinj" fill="#8ab4ff" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Jobs & Applications chart */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#9bffd6]" />
                Njoftime & Aplikime (7 ditë)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={days} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#0b1020', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
                  <Line type="monotone" dataKey="newJobs" name="Njoftime" stroke="#9bffd6" strokeWidth={2} dot={{ fill: '#9bffd6', r: 3 }} />
                  <Line type="monotone" dataKey="newApps" name="Aplikime" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
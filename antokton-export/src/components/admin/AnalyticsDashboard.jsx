import React, { useMemo } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Briefcase, Users, TrendingUp, Eye } from "lucide-react";
import moment from "moment";

export default function AnalyticsDashboard({ jobs, events, users, adminActions }) {
  const stats = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Total stats
    const totalJobs = jobs.length;
    const totalEvents = events.length;
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.last_seen && new Date(u.last_seen) > thirtyDaysAgo).length;
    
    // Jobs by status
    const jobsByStatus = {
      approved: jobs.filter(j => j.status === "approved").length,
      pending: jobs.filter(j => j.status === "pending").length,
      rejected: jobs.filter(j => j.status === "rejected").length
    };
    
    // Jobs by category
    const jobsByCategory = {};
    jobs.forEach(j => {
      jobsByCategory[j.category] = (jobsByCategory[j.category] || 0) + 1;
    });
    
    // Activity over last 30 days
    const activityByDay = {};
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = moment(date).format("DD/MM");
      activityByDay[dateStr] = { date: dateStr, jobs: 0, events: 0 };
    }
    
    jobs.forEach(j => {
      const dateStr = moment(j.created_date).format("DD/MM");
      if (activityByDay[dateStr]) activityByDay[dateStr].jobs++;
    });
    
    events.forEach(e => {
      const dateStr = moment(e.created_date).format("DD/MM");
      if (activityByDay[dateStr]) activityByDay[dateStr].events++;
    });
    
    return {
      totalJobs,
      totalEvents,
      totalUsers,
      activeUsers,
      jobsByStatus,
      jobsByCategory: Object.entries(jobsByCategory).map(([category, count]) => ({ category, count })),
      activityData: Object.values(activityByDay)
    };
  }, [jobs, events, users]);

  const COLORS = ["#8ab4ff", "#9bffd6", "#ff6b6b", "#ffd93d", "#6bcf7f"];

  return (
    <div className="space-y-6">
      {/* Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-white/10 p-4" style={{ background: 'rgba(255, 255, 255, 0.06)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-xs uppercase tracking-wider">Njoftime Totale</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.totalJobs}</p>
            </div>
            <Briefcase className="w-8 h-8 text-[#8ab4ff] opacity-50" />
          </div>
        </div>
        
        <div className="rounded-xl border border-white/10 p-4" style={{ background: 'rgba(255, 255, 255, 0.06)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-xs uppercase tracking-wider">Ngjarje Totale</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.totalEvents}</p>
            </div>
            <Eye className="w-8 h-8 text-[#9bffd6] opacity-50" />
          </div>
        </div>
        
        <div className="rounded-xl border border-white/10 p-4" style={{ background: 'rgba(255, 255, 255, 0.06)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-xs uppercase tracking-wider">Anëtarë Aktivë</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.activeUsers}</p>
            </div>
            <Users className="w-8 h-8 text-green-500 opacity-50" />
          </div>
        </div>
        
        <div className="rounded-xl border border-white/10 p-4" style={{ background: 'rgba(255, 255, 255, 0.06)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-xs uppercase tracking-wider">Të Gjithë Anëtarët</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.totalUsers}</p>
            </div>
            <Users className="w-8 h-8 text-blue-500 opacity-50" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Chart */}
        <div className="rounded-xl border border-white/10 p-4" style={{ background: 'rgba(255, 255, 255, 0.06)' }}>
          <h3 className="text-white font-semibold mb-4">Veprimtaria - 30 ditë të fundit</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.activityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" stroke="rgba(255,255,255,0.6)" fontSize={12} />
              <YAxis stroke="rgba(255,255,255,0.6)" fontSize={12} />
              <Tooltip 
                contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Legend />
              <Line type="monotone" dataKey="jobs" stroke="#8ab4ff" strokeWidth={2} name="Njoftime" />
              <Line type="monotone" dataKey="events" stroke="#9bffd6" strokeWidth={2} name="Ngjarje" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Jobs by Category */}
        <div className="rounded-xl border border-white/10 p-4" style={{ background: 'rgba(255, 255, 255, 0.06)' }}>
          <h3 className="text-white font-semibold mb-4">Njoftime sipas Kategorisë</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats.jobsByCategory}
                dataKey="count"
                nameKey="category"
                cx="50%"
                cy="50%"
                outerRadius={100}
              >
                {stats.jobsByCategory.map((entry, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}
                labelStyle={{ color: '#e2e8f0' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="rounded-xl border border-white/10 p-4" style={{ background: 'rgba(255, 255, 255, 0.06)' }}>
        <h3 className="text-white font-semibold mb-4">Statusit i Njoftimeve</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
            <p className="text-green-400 text-sm">Aprovuar</p>
            <p className="text-2xl font-bold text-green-300 mt-1">{stats.jobsByStatus.approved}</p>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
            <p className="text-yellow-400 text-sm">Në Pritje</p>
            <p className="text-2xl font-bold text-yellow-300 mt-1">{stats.jobsByStatus.pending}</p>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <p className="text-red-400 text-sm">Refuzuar</p>
            <p className="text-2xl font-bold text-red-300 mt-1">{stats.jobsByStatus.rejected}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
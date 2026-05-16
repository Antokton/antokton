import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Users, Briefcase, Eye, TrendingUp, Award, MapPin } from "lucide-react";

export default function MembersDashboard({ allUsers }) {
  // Calculate statistics
  const stats = React.useMemo(() => {
    const totalUsers = allUsers.length;
    const jobSeekers = allUsers.filter(u => u.user_type === 'job_seeker').length;
    const employers = allUsers.filter(u => u.user_type === 'employer').length;
    const recruiters = allUsers.filter(u => u.user_type === 'recruiter').length;
    
    const avgExperience = allUsers
      .filter(u => u.experience_years)
      .reduce((sum, u) => sum + (u.experience_years || 0), 0) / (allUsers.filter(u => u.experience_years).length || 1);

    return {
      totalUsers,
      jobSeekers,
      employers,
      recruiters,
      avgExperience: Math.round(avgExperience * 10) / 10
    };
  }, [allUsers]);

  // User type distribution for pie chart
  const userTypeData = [
    { name: 'Kërkoj punë', value: stats.jobSeekers, color: '#8ab4ff' },
    { name: 'Punëdhënës', value: stats.employers, color: '#9bffd6' },
    { name: 'Rekrutues', value: stats.recruiters, color: '#ffd68a' }
  ];

  // Experience distribution
  const experienceData = React.useMemo(() => {
    const ranges = {
      '0-2 vite': 0,
      '3-5 vite': 0,
      '6-10 vite': 0,
      '10+ vite': 0
    };

    allUsers.forEach(u => {
      const exp = u.experience_years || 0;
      if (exp <= 2) ranges['0-2 vite']++;
      else if (exp <= 5) ranges['3-5 vite']++;
      else if (exp <= 10) ranges['6-10 vite']++;
      else ranges['10+ vite']++;
    });

    return Object.entries(ranges).map(([name, value]) => ({ name, value }));
  }, [allUsers]);

  // Top locations
  const locationData = React.useMemo(() => {
    const locations = {};
    allUsers.forEach(u => {
      if (u.location) {
        const loc = u.location.split(',')[0].trim(); // Get city
        locations[loc] = (locations[loc] || 0) + 1;
      }
    });

    return Object.entries(locations)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));
  }, [allUsers]);

  // Top skills
  const skillsData = React.useMemo(() => {
    const skills = {};
    allUsers.forEach(u => {
      if (u.skills) {
        u.skills.split(',').forEach(skill => {
          const s = skill.trim();
          if (s) skills[s] = (skills[s] || 0) + 1;
        });
      }
    });

    return Object.entries(skills)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
  }, [allUsers]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#8ab4ff]/20 to-[#8ab4ff]/5 border-[#8ab4ff]/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm mb-1">Total Anëtarë</p>
                <p className="text-white text-3xl font-bold">{stats.totalUsers}</p>
              </div>
              <Users className="w-10 h-10 text-[#8ab4ff]" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#9bffd6]/20 to-[#9bffd6]/5 border-[#9bffd6]/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm mb-1">Kërkoj Punë</p>
                <p className="text-white text-3xl font-bold">{stats.jobSeekers}</p>
              </div>
              <Briefcase className="w-10 h-10 text-[#9bffd6]" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#ffd68a]/20 to-[#ffd68a]/5 border-[#ffd68a]/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm mb-1">Punëdhënës</p>
                <p className="text-white text-3xl font-bold">{stats.employers}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-[#ffd68a]" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-400/20 to-purple-400/5 border-purple-400/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm mb-1">Përvoja mesatare</p>
                <p className="text-white text-3xl font-bold">{stats.avgExperience}</p>
                <p className="text-white/40 text-xs">vite</p>
              </div>
              <Award className="w-10 h-10 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              Shpërndarja sipas tipit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={userTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {userTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Award className="w-5 h-5" />
              Shpërndarja e përvojës
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={experienceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke="#fff" tick={{ fill: '#fff', fontSize: 12 }} />
                <YAxis stroke="#fff" tick={{ fill: '#fff', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(11,16,32,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar dataKey="value" fill="#8ab4ff" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Top vendndodhjet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={locationData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis type="number" stroke="#fff" tick={{ fill: '#fff', fontSize: 12 }} />
                <YAxis dataKey="name" type="category" stroke="#fff" tick={{ fill: '#fff', fontSize: 11 }} width={80} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(11,16,32,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar dataKey="value" fill="#9bffd6" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Top aftësitë
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={skillsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke="#fff" tick={{ fill: '#fff', fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="#fff" tick={{ fill: '#fff', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(11,16,32,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar dataKey="value" fill="#ffd68a" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
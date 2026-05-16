import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/antoktonClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, Calendar, Clock, Loader2, MapPin, Shield, User, Users } from "lucide-react";
import { formatDate, formatMoney, isActiveCourse } from "@/lib/akademia";

export default function Akademia() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.isAuthenticated().then((authenticated) => {
      if (authenticated) base44.auth.me().then(setCurrentUser).catch(() => {});
    });
  }, []);

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["akademiaCourses"],
    queryFn: () => base44.entities.AkademiaCourse.list("start_date", 200)
  });

  const activeCourses = useMemo(
    () => courses.filter(isActiveCourse),
    [courses]
  );

  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "moderator";
  const hasMentorCourses = currentUser?.email && courses.some(course => course.mentor_email === currentUser.email || course.mentor_id === currentUser.id);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8">
        <div>
          <Badge className="bg-[#9bffd6]/15 text-[#9bffd6] border-[#9bffd6]/30 mb-3">
            <Award className="w-3.5 h-3.5 mr-1" />
            Akademia Antokton
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Kurse praktike 5-7 ditore
          </h1>
          <p className="text-white/60 mt-2 max-w-2xl">
            Trajnime te shkurtra me mentorim, vleresim dhe certifikim per kandidate qe duan te kalojne shpejt nga profili ne praktike pune.
          </p>
        </div>

        {(isAdmin || hasMentorCourses) && (
          <div className="flex flex-wrap gap-2">
            {hasMentorCourses && (
              <Button asChild variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10">
                <Link to="/AkademiaMentor">
                  <Users className="w-4 h-4 mr-2" />
                  Paneli i mentorit
                </Link>
              </Button>
            )}
            {isAdmin && (
              <Button asChild className="bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] font-semibold hover:opacity-90">
                <Link to="/AkademiaAdmin">
                  <Shield className="w-4 h-4 mr-2" />
                  Admin Akademia
                </Link>
              </Button>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-white/30 animate-spin" />
        </div>
      ) : activeCourses.length === 0 ? (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="py-14 text-center">
            <Award className="w-12 h-12 text-white/25 mx-auto mb-4" />
            <h2 className="text-white font-semibold text-lg mb-2">Nuk ka kurse aktive per momentin</h2>
            <p className="text-white/50 text-sm">Kur admini te publikoje kursin e pare, ai do te shfaqet ketu.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {activeCourses.map((course) => (
            <Card key={course.id} className="bg-white/5 border-white/10 hover:bg-white/8 transition-colors overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <Badge className="bg-[#8ab4ff]/15 text-[#8ab4ff] border-[#8ab4ff]/30">
                    {course.category || "Praktike"}
                  </Badge>
                  <span className="text-white/40 text-xs whitespace-nowrap">{formatDate(course.start_date)}</span>
                </div>
                <CardTitle className="text-white text-xl leading-snug mt-2">{course.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex items-center gap-2 text-white/65">
                    <MapPin className="w-4 h-4 text-[#9bffd6]" />
                    {[course.city, course.country].filter(Boolean).join(", ") || "Online/Lokale"}
                  </div>
                  <div className="flex items-center gap-2 text-white/65">
                    <Clock className="w-4 h-4 text-[#9bffd6]" />
                    {course.duration_days || 5} dite
                  </div>
                  <div className="flex items-center gap-2 text-white/65">
                    <User className="w-4 h-4 text-[#9bffd6]" />
                    {course.mentor_name || "Mentor caktohet nga Antokton"}
                  </div>
                  <div className="flex items-center gap-2 text-white/65">
                    <Calendar className="w-4 h-4 text-[#9bffd6]" />
                    {formatMoney(course.price, course.currency)}
                  </div>
                </div>

                <Button asChild className="w-full bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] font-semibold hover:opacity-90">
                  <Link to={`/akademia/${course.id}`}>Shiko kursin</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

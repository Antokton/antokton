import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/antoktonClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, CheckCircle, ExternalLink, GraduationCap } from "lucide-react";
import { formatDate, userKeys } from "@/lib/akademia";

export default function AkademiaProfileSummary({ user }) {
  const keys = useMemo(() => new Set(userKeys(user)), [user]);

  const { data: applications = [] } = useQuery({
    queryKey: ["profileAkademiaApplications", user?.id, user?.email],
    queryFn: () => base44.entities.AkademiaApplication.list("-created_date", 500),
    enabled: !!user
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["profileAkademiaCourses"],
    queryFn: () => base44.entities.AkademiaCourse.list("-created_date", 500),
    enabled: !!user
  });

  const { data: certificates = [] } = useQuery({
    queryKey: ["profileAkademiaCertificates", user?.id, user?.email],
    queryFn: () => base44.entities.AkademiaCertificate.list("-issue_date", 500),
    enabled: !!user
  });

  const myApplications = applications.filter(app => keys.has(app.user_id) || keys.has(app.user_email));
  const completedApplications = myApplications.filter(app => app.status === "completed");
  const myCertificates = certificates.filter(cert => cert.status === "valid" && (keys.has(cert.user_id) || keys.has(cert.user_email)));
  const courseById = new Map(courses.map(course => [course.id, course]));

  if (completedApplications.length === 0 && myCertificates.length === 0) return null;

  return (
    <Card className="bg-white/5 border-white/10 mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Award className="w-5 h-5 text-[#9bffd6]" />
          Akademia Antokton
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {myCertificates.length > 0 && (
          <Badge className="bg-[#9bffd6]/15 text-[#9bffd6] border-[#9bffd6]/30">
            <CheckCircle className="w-3.5 h-3.5 mr-1" />
            I certifikuar nga Akademia Antokton
          </Badge>
        )}

        {completedApplications.length > 0 && (
          <div>
            <h3 className="text-white/80 text-sm font-semibold mb-2">Kurse te perfunduara</h3>
            <div className="space-y-2">
              {completedApplications.map(app => {
                const course = courseById.get(app.course_id);
                return (
                  <div key={app.id} className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
                    <div>
                      <p className="text-white font-medium text-sm">{course?.title || app.course_id}</p>
                      <p className="text-white/45 text-xs">{course?.category || "Kurs praktik"} {course?.start_date ? `- ${formatDate(course.start_date)}` : ""}</p>
                    </div>
                    <GraduationCap className="w-4 h-4 text-[#8ab4ff] shrink-0" />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {myCertificates.length > 0 && (
          <div>
            <h3 className="text-white/80 text-sm font-semibold mb-2">Certifikata</h3>
            <div className="space-y-2">
              {myCertificates.map(cert => (
                <div key={cert.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-white/10 bg-white/5 p-3">
                  <div>
                    <p className="text-white font-medium text-sm">{cert.course_title || cert.course_id}</p>
                    <p className="text-white/45 text-xs">{cert.certificate_number} - {formatDate(cert.issue_date)}</p>
                  </div>
                  <Button asChild size="sm" variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10">
                    <Link to={`/verify-certificate/${cert.certificate_number}`}>
                      Verifiko
                      <ExternalLink className="w-3.5 h-3.5 ml-1" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

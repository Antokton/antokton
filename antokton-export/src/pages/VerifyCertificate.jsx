import React from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/antoktonClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Award, CheckCircle, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { formatDate } from "@/lib/akademia";

export default function VerifyCertificate() {
  const { certificateNumber } = useParams();

  const { data: certificates = [], isLoading } = useQuery({
    queryKey: ["verifyCertificate", certificateNumber],
    queryFn: () => base44.entities.AkademiaCertificate.list("-issue_date", 1000),
    enabled: !!certificateNumber
  });

  const certificate = certificates.find(cert => cert.certificate_number === certificateNumber);
  const isValid = certificate?.status === "valid";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-6 sm:p-10">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 text-white/30 animate-spin" />
            </div>
          ) : !certificate ? (
            <div className="text-center py-10">
              <XCircle className="w-16 h-16 text-red-300/70 mx-auto mb-4" />
              <h1 className="text-white text-2xl font-bold mb-2">Certifikata nuk u gjet</h1>
              <p className="text-white/55 mb-6">Kontrolloni numrin e certifikates dhe provoni perseri.</p>
              <Button asChild variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10">
                <Link to="/akademia">Shko te Akademia</Link>
              </Button>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-[#9bffd6]/15 border border-[#9bffd6]/30 flex items-center justify-center mb-5">
                {isValid ? <ShieldCheck className="w-10 h-10 text-[#9bffd6]" /> : <XCircle className="w-10 h-10 text-red-300" />}
              </div>
              <Badge className={isValid ? "bg-green-500/20 text-green-300 border-green-500/30" : "bg-red-500/20 text-red-300 border-red-500/30"}>
                {isValid ? "Valid" : "Revoked"}
              </Badge>
              <h1 className="text-3xl font-bold text-white mt-4 mb-2">Akademia Antokton</h1>
              <p className="text-white/55 mb-8">Verifikim publik i certifikates</p>

              <div className="text-left rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wide">Numri i certifikates</p>
                  <p className="text-white font-mono text-lg">{certificate.certificate_number}</p>
                </div>
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wide">Kandidati</p>
                  <p className="text-white font-semibold">{certificate.user_name || certificate.user_email}</p>
                </div>
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wide">Kursi</p>
                  <p className="text-white font-semibold">{certificate.course_title || certificate.course_id}</p>
                </div>
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wide">Data e leshimit</p>
                  <p className="text-white font-semibold">{formatDate(certificate.issue_date)}</p>
                </div>
              </div>

              {isValid && (
                <div className="mt-6 flex items-center justify-center gap-2 text-[#9bffd6] text-sm">
                  <CheckCircle className="w-4 h-4" />
                  Kjo certifikate eshte e vlefshme ne sistemin lokal Antokton.
                </div>
              )}

              <Button asChild className="mt-8 bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] font-semibold hover:opacity-90">
                <Link to="/akademia">
                  <Award className="w-4 h-4 mr-2" />
                  Shiko Akademine
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

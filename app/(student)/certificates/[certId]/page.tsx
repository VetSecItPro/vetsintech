import { notFound } from "next/navigation";
import { getCertificateById } from "@/lib/domains/certificates/queries";
import { Award, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ certId: string }>;
}) {
  const { certId } = await params;
  const cert = await getCertificateById(certId);
  return {
    title: cert
      ? `Certificate — ${cert.course_title}`
      : "Certificate Not Found",
  };
}

export default async function CertificateViewPage({
  params,
}: {
  params: Promise<{ certId: string }>;
}) {
  const { certId } = await params;
  const cert = await getCertificateById(certId);

  if (!cert || cert.status === "revoked") notFound();

  const issuedDate = new Date(cert.issued_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mx-auto max-w-2xl py-8">
      <Card className="overflow-hidden">
        {/* Certificate Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-10 text-center text-white">
          <Award className="mx-auto h-16 w-16 opacity-80" />
          <h1 className="mt-4 text-sm font-medium uppercase tracking-widest opacity-80">
            Certificate of Completion
          </h1>
        </div>

        <CardContent className="space-y-6 px-8 py-10 text-center">
          <div>
            <p className="text-sm text-slate-500">This certifies that</p>
            <p className="mt-1 text-2xl font-bold">{cert.student_name}</p>
          </div>

          <div>
            <p className="text-sm text-slate-500">
              has successfully completed
            </p>
            <p className="mt-1 text-xl font-semibold text-blue-700 dark:text-blue-400">
              {cert.course_title}
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-500">Issued by</p>
            <p className="mt-1 font-medium">{cert.organization_name}</p>
            <p className="text-sm text-slate-400">on {issuedDate}</p>
          </div>

          <div className="border-t pt-4">
            <p className="text-xs text-slate-400">
              Certificate ID: {cert.certificate_number}
            </p>
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <Button variant="outline" size="sm" asChild>
              <a
                href={`/api/certificates/${cert.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="mr-1 h-4 w-4" />
                Download PDF
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

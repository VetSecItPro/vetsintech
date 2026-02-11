import { NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { getCertificateById } from "@/lib/domains/certificates/queries";
import { generateCertificatePDF } from "@/lib/domains/certificates/generate";

/**
 * GET /api/certificates/[certId]/pdf
 * Generate and return a PDF for the given certificate.
 *
 * Auth: user must be the certificate owner or an admin.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ certId: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { certId } = await params;
    const certificate = await getCertificateById(certId);

    if (!certificate) {
      return NextResponse.json(
        { error: "Certificate not found" },
        { status: 404 }
      );
    }

    // Only the certificate owner or an admin may download the PDF
    const isOwner = certificate.user_id === auth.user.id;
    const isAdmin = auth.roles.includes("admin");

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "Forbidden — you do not have access to this certificate" },
        { status: 403 }
      );
    }

    // Revoked certificates should not be downloadable
    if (certificate.status === "revoked") {
      return NextResponse.json(
        { error: "This certificate has been revoked" },
        { status: 410 }
      );
    }

    const pdfBuffer = await generateCertificatePDF(certificate);

    const filename = `certificate-${certificate.certificate_number}.pdf`;

    // Build a ReadableStream from the buffer for the Response constructor.
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(pdfBuffer));
        controller.close();
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("GET /api/certificates/[certId]/pdf error:", error);
    return NextResponse.json(
      { error: "Failed to generate certificate PDF" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { getCertificateById } from "@/lib/domains/certificates/queries";
import { revokeCertificate } from "@/lib/domains/certificates/mutations";

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

    return NextResponse.json({ data: certificate }, { status: 200 });
  } catch (error) {
    console.error("GET /api/certificates/[certId] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ certId: string }> }
) {
  try {
    const auth = await requireAuth(request, ["admin"]);
    if (isAuthError(auth)) return auth;

    const { certId } = await params;
    const certificate = await revokeCertificate(certId);

    return NextResponse.json({ data: certificate }, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/certificates/[certId] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

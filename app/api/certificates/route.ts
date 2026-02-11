import { NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { getStudentCertificates } from "@/lib/domains/certificates/queries";
import { issueCertificate } from "@/lib/domains/certificates/mutations";
import { z } from "zod/v4";

/**
 * GET /api/certificates
 * Get all certificates for the current user.
 */
export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const certs = await getStudentCertificates(
      auth.user.id,
      auth.organizationId
    );
    return NextResponse.json({ data: certs }, { status: 200 });
  } catch (error) {
    console.error("GET /api/certificates error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

const issueSchema = z.object({
  course_id: z.string().uuid(),
  cohort_id: z.string().uuid(),
});

/**
 * POST /api/certificates
 * Issue a certificate (typically triggered when course is completed).
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const body = await request.json();
    const parsed = issueSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    const cert = await issueCertificate({
      user_id: auth.user.id,
      course_id: parsed.data.course_id,
      cohort_id: parsed.data.cohort_id,
      organization_id: auth.organizationId,
    });

    return NextResponse.json({ data: cert }, { status: 201 });
  } catch (error) {
    console.error("POST /api/certificates error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

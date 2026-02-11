import { NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { getCohortById } from "@/lib/domains/courses/queries";
import { updateCohort, deleteCohort } from "@/lib/domains/courses/mutations";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ cohortId: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { cohortId } = await params;
    const cohort = await getCohortById(cohortId, auth.organizationId);

    if (!cohort) {
      return NextResponse.json({ error: "Cohort not found" }, { status: 404 });
    }

    return NextResponse.json({ data: cohort });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ cohortId: string }> }
) {
  try {
    const auth = await requireAuth(request, ["admin", "instructor"]);
    if (isAuthError(auth)) return auth;

    const { cohortId } = await params;
    const body = await request.json();

    const cohort = await updateCohort(cohortId, auth.organizationId, body);
    return NextResponse.json({ data: cohort });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ cohortId: string }> }
) {
  try {
    const auth = await requireAuth(request, ["admin"]);
    if (isAuthError(auth)) return auth;

    const { cohortId } = await params;
    await deleteCohort(cohortId, auth.organizationId);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

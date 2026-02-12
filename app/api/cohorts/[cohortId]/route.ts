import { NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { getCohortById } from "@/lib/domains/courses/queries";
import { updateCohort, deleteCohort } from "@/lib/domains/courses/mutations";
import { z } from "zod/v4";

const updateCohortSchema = z.object({
  name: z.string().min(3).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(["active", "completed", "archived"]).optional(),
  starts_at: z.string().optional(),
  ends_at: z.string().optional(),
  max_students: z.number().int().positive().max(10000).optional(),
});

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
    const parsed = updateCohortSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    const cohort = await updateCohort(cohortId, auth.organizationId, parsed.data);
    return NextResponse.json({ data: cohort });
  } catch (err) {
    console.error("PATCH /api/cohorts/[cohortId] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
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

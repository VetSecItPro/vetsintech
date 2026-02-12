import { NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { getCohorts } from "@/lib/domains/courses/queries";
import { createCohort } from "@/lib/domains/courses/mutations";
import { cohortSchema } from "@/lib/utils/validation";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const filters = {
      course_id: searchParams.get("course_id") || undefined,
      status: (searchParams.get("status") as "active" | "completed" | "archived") || undefined,
      search: searchParams.get("search") || undefined,
    };

    const cohorts = await getCohorts(auth.organizationId, filters);
    return NextResponse.json({ data: cohorts });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request, ["admin", "instructor"]);
    if (isAuthError(auth)) return auth;

    const body = await request.json();
    const result = cohortSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.issues },
        { status: 400 }
      );
    }

    const cohort = await createCohort(
      result.data,
      auth.organizationId,
      auth.user.id
    );

    return NextResponse.json({ data: cohort }, { status: 201 });
  } catch (err) {
    console.error("POST /api/cohorts error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

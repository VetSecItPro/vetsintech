import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { createClient } from "@/lib/supabase/server";

const createEnrollmentSchema = z.object({
  user_id: z.uuid("Invalid user ID"),
  cohort_id: z.uuid("Invalid cohort ID"),
});

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request, ["admin"]);
    if (isAuthError(auth)) return auth;

    const body = await request.json();
    const parsed = createEnrollmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    const { user_id, cohort_id } = parsed.data;
    const supabase = await createClient();

    // Verify the cohort belongs to the admin's organization
    const { data: cohort, error: cohortError } = await supabase
      .from("cohorts")
      .select("id, organization_id")
      .eq("id", cohort_id)
      .eq("organization_id", auth.organizationId)
      .single();

    if (cohortError || !cohort) {
      return NextResponse.json(
        { error: "Cohort not found" },
        { status: 404 }
      );
    }

    // Verify the user belongs to the same organization
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, organization_id")
      .eq("id", user_id)
      .eq("organization_id", auth.organizationId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Student not found in this organization" },
        { status: 404 }
      );
    }

    // Check for existing enrollment
    const { data: existing } = await supabase
      .from("enrollments")
      .select("id")
      .eq("user_id", user_id)
      .eq("cohort_id", cohort_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Student is already enrolled in this cohort" },
        { status: 409 }
      );
    }

    // Create enrollment
    const { data: enrollment, error: insertError } = await supabase
      .from("enrollments")
      .insert({
        user_id,
        cohort_id,
        status: "active",
        enrolled_at: new Date().toISOString(),
        enrolled_by: auth.user.id,
      })
      .select("*")
      .single();

    if (insertError) {
      console.error("POST /api/enrollments error:", insertError);
      return NextResponse.json(
        { error: "Failed to create enrollment" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: enrollment }, { status: 201 });
  } catch (error) {
    console.error("POST /api/enrollments error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

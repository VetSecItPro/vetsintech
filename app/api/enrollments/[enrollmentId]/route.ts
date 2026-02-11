import { NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ enrollmentId: string }> }
) {
  try {
    const auth = await requireAuth(request, ["admin"]);
    if (isAuthError(auth)) return auth;

    const { enrollmentId } = await params;
    const supabase = await createClient();

    // Verify the enrollment exists and belongs to a cohort in the admin's org
    const { data: enrollment, error: fetchError } = await supabase
      .from("enrollments")
      .select("id, cohort_id, cohorts!inner(organization_id)")
      .eq("id", enrollmentId)
      .single();

    if (fetchError || !enrollment) {
      return NextResponse.json(
        { error: "Enrollment not found" },
        { status: 404 }
      );
    }

    const cohortOrg = (
      enrollment.cohorts as unknown as { organization_id: string }
    ).organization_id;

    if (cohortOrg !== auth.organizationId) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // Delete the enrollment
    const { error: deleteError } = await supabase
      .from("enrollments")
      .delete()
      .eq("id", enrollmentId);

    if (deleteError) {
      console.error("DELETE /api/enrollments/[id] error:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete enrollment" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/enrollments/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { createClient } from "@/lib/supabase/server";

const updateStudentSchema = z.object({
  full_name: z.string().min(1).max(200).optional(),
  bio: z.string().max(1000).optional(),
  is_active: z.boolean().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const auth = await requireAuth(request, ["admin", "instructor"]);
    if (isAuthError(auth)) return auth;

    const { studentId } = await params;
    const supabase = await createClient();

    // Verify student belongs to the organization
    const { data: studentRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", studentId)
      .eq("organization_id", auth.organizationId)
      .maybeSingle();

    if (!studentRole) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

    // Get student profile
    const { data: student, error: profileError } = await supabase
      .from("profiles")
      .select(
        "id, full_name, email, avatar_url, bio, is_active, created_at, last_sign_in_at"
      )
      .eq("id", studentId)
      .single();

    if (profileError || !student) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

    // Fetch enrollments with cohort and course info
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select(
        "id, status, enrolled_at, cohort_id, cohorts(id, name, course_id, courses(id, title))"
      )
      .eq("user_id", studentId);

    // Fetch course progress
    const { data: courseProgress } = await supabase
      .from("course_progress")
      .select("id, progress_pct, updated_at, course_id, courses(id, title)")
      .eq("user_id", studentId);

    // Fetch quiz attempts
    const { data: quizAttempts } = await supabase
      .from("quiz_attempts")
      .select(
        "id, score, max_score, passed, started_at, completed_at, quiz_id, quizzes(id, title)"
      )
      .eq("user_id", studentId)
      .order("started_at", { ascending: false })
      .limit(20);

    // Fetch certificates
    const { data: certificates } = await supabase
      .from("certificates")
      .select("id, issued_at, certificate_url, course_id, courses(id, title)")
      .eq("user_id", studentId)
      .order("issued_at", { ascending: false });

    return NextResponse.json({
      data: {
        ...student,
        role: studentRole.role,
        enrollments: enrollments || [],
        course_progress: courseProgress || [],
        quiz_attempts: quizAttempts || [],
        certificates: certificates || [],
      },
    });
  } catch (error) {
    console.error("GET /api/students/[studentId] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const auth = await requireAuth(request, ["admin"]);
    if (isAuthError(auth)) return auth;

    const { studentId } = await params;
    const supabase = await createClient();

    // Verify student belongs to the organization
    const { data: studentRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", studentId)
      .eq("organization_id", auth.organizationId)
      .maybeSingle();

    if (!studentRole) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = updateStudentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from("profiles")
      .update(parsed.data)
      .eq("id", studentId)
      .select("id, full_name, email, avatar_url, bio, is_active, created_at")
      .single();

    if (updateError) {
      console.error("Update student error:", updateError);
      return NextResponse.json(
        { error: "Failed to update student" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("PATCH /api/students/[studentId] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const auth = await requireAuth(request, ["admin"]);
    if (isAuthError(auth)) return auth;

    const { studentId } = await params;
    const supabase = await createClient();

    // Verify student belongs to the organization
    const { data: studentRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", studentId)
      .eq("organization_id", auth.organizationId)
      .maybeSingle();

    if (!studentRole) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

    // Soft-delete: set is_active = false
    const { error: deactivateError } = await supabase
      .from("profiles")
      .update({ is_active: false })
      .eq("id", studentId);

    if (deactivateError) {
      console.error("Deactivate student error:", deactivateError);
      return NextResponse.json(
        { error: "Failed to deactivate student" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: { id: studentId, is_active: false } });
  } catch (error) {
    console.error("DELETE /api/students/[studentId] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { getStudentGrades, getCourseGradebook } from "@/lib/domains/gradebook/queries";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { courseId } = await params;
    const isAdmin = auth.roles.includes("admin") || auth.roles.includes("instructor");

    if (isAdmin) {
      // Admin/instructor gets the full gradebook for all students
      const gradebook = await getCourseGradebook(courseId);
      return NextResponse.json({ data: gradebook }, { status: 200 });
    }

    // Student gets only their own grades
    const studentGrades = await getStudentGrades(courseId, auth.user.id);
    return NextResponse.json({ data: studentGrades }, { status: 200 });
  } catch (error) {
    console.error("GET /api/gradebook/[courseId] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

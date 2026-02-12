import { NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { getCourseGradebook } from "@/lib/domains/gradebook/queries";
import { exportGradebookCSV } from "@/lib/domains/gradebook/utils";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const auth = await requireAuth(request, ["admin", "instructor"]);
    if (isAuthError(auth)) return auth;

    const { courseId } = await params;
    const gradebook = await getCourseGradebook(courseId);
    const csv = exportGradebookCSV(gradebook);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="gradebook-${courseId}.csv"`,
      },
    });
  } catch (error) {
    console.error("GET /api/gradebook/[courseId]/export error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

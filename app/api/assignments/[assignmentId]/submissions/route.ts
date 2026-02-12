import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import {
  getSubmissionsByAssignment,
  getAssignmentById,
} from "@/lib/domains/assignments/queries";
import { submitAssignment } from "@/lib/domains/assignments/mutations";
import { submitAssignmentSchema } from "@/lib/domains/assignments/validation";

/**
 * GET /api/assignments/[assignmentId]/submissions
 * List all submissions for an assignment. Admin/instructor only.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const auth = await requireAuth(request, ["admin", "instructor"]);
    if (isAuthError(auth)) return auth;

    const { assignmentId } = await params;
    const submissions = await getSubmissionsByAssignment(assignmentId);

    return NextResponse.json({ data: submissions }, { status: 200 });
  } catch (error) {
    console.error(
      "GET /api/assignments/[assignmentId]/submissions error:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/assignments/[assignmentId]/submissions
 * Submit an assignment (student).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { assignmentId } = await params;
    const body = await request.json();
    const parsed = submitAssignmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    const submission = await submitAssignment({
      assignment_id: assignmentId,
      student_id: auth.user.id,
      content: parsed.data.content,
      organization_id: auth.organizationId,
    });

    return NextResponse.json({ data: submission }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      // Known business logic errors
      if (
        error.message.includes("Maximum attempts") ||
        error.message.includes("not available") ||
        error.message.includes("past due")
      ) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (error.message.includes("not found")) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
    }
    console.error(
      "POST /api/assignments/[assignmentId]/submissions error:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

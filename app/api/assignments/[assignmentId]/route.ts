import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { getAssignmentById } from "@/lib/domains/assignments/queries";
import {
  updateAssignment,
  deleteAssignment,
} from "@/lib/domains/assignments/mutations";
import { updateAssignmentSchema } from "@/lib/domains/assignments/validation";

/**
 * GET /api/assignments/[assignmentId]
 * Get a single assignment.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { assignmentId } = await params;
    const assignment = await getAssignmentById(assignmentId);

    if (!assignment) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: assignment }, { status: 200 });
  } catch (error) {
    console.error("GET /api/assignments/[assignmentId] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/assignments/[assignmentId]
 * Update an assignment. Admin/instructor only.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const auth = await requireAuth(request, ["admin", "instructor"]);
    if (isAuthError(auth)) return auth;

    const { assignmentId } = await params;
    const body = await request.json();
    const parsed = updateAssignmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    const assignment = await updateAssignment(assignmentId, parsed.data);
    return NextResponse.json({ data: assignment }, { status: 200 });
  } catch (error) {
    console.error("PATCH /api/assignments/[assignmentId] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/assignments/[assignmentId]
 * Delete an assignment. Admin only.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const auth = await requireAuth(request, ["admin"]);
    if (isAuthError(auth)) return auth;

    const { assignmentId } = await params;
    await deleteAssignment(assignmentId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/assignments/[assignmentId] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

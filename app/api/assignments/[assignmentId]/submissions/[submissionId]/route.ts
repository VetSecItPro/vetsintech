import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { getSubmissionById } from "@/lib/domains/assignments/queries";
import {
  gradeSubmission,
  returnSubmission,
} from "@/lib/domains/assignments/mutations";
import {
  gradeSubmissionSchema,
  returnSubmissionSchema,
} from "@/lib/domains/assignments/validation";

/**
 * GET /api/assignments/[assignmentId]/submissions/[submissionId]
 * Get a single submission with files.
 */
export async function GET(
  request: Request,
  {
    params,
  }: { params: Promise<{ assignmentId: string; submissionId: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { submissionId } = await params;
    const submission = await getSubmissionById(submissionId);

    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: submission }, { status: 200 });
  } catch (error) {
    console.error(
      "GET /api/assignments/[assignmentId]/submissions/[submissionId] error:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/assignments/[assignmentId]/submissions/[submissionId]
 * Grade or return a submission. Admin/instructor only.
 *
 * Body must include `action`: "grade" or "return"
 */
export async function PATCH(
  request: Request,
  {
    params,
  }: { params: Promise<{ assignmentId: string; submissionId: string }> }
) {
  try {
    const auth = await requireAuth(request, ["admin", "instructor"]);
    if (isAuthError(auth)) return auth;

    const { submissionId } = await params;
    const body = await request.json();
    const action = body.action as string;

    if (action === "return") {
      const parsed = returnSubmissionSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          {
            error: "Validation error",
            details: z.prettifyError(parsed.error),
          },
          { status: 400 }
        );
      }

      const submission = await returnSubmission(
        submissionId,
        parsed.data.feedback,
        auth.user.id
      );
      return NextResponse.json({ data: submission }, { status: 200 });
    }

    // Default: grade
    const parsed = gradeSubmissionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    const submission = await gradeSubmission(submissionId, {
      score: parsed.data.score,
      feedback: parsed.data.feedback,
      graded_by: auth.user.id,
    });

    return NextResponse.json({ data: submission }, { status: 200 });
  } catch (error) {
    console.error(
      "PATCH /api/assignments/[assignmentId]/submissions/[submissionId] error:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { getLearningPathById } from "@/lib/domains/learning-paths/queries";
import { enrollInPath } from "@/lib/domains/learning-paths/mutations";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ pathId: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { pathId } = await params;

    // Verify the path exists and is published
    const path = await getLearningPathById(pathId, auth.organizationId);

    if (!path) {
      return NextResponse.json(
        { error: "Learning path not found" },
        { status: 404 }
      );
    }

    if (path.status !== "published") {
      return NextResponse.json(
        { error: "Cannot enroll in an unpublished learning path" },
        { status: 400 }
      );
    }

    const enrollment = await enrollInPath(
      pathId,
      auth.user.id,
      auth.organizationId
    );

    return NextResponse.json({ data: enrollment }, { status: 201 });
  } catch (error) {
    // Handle unique constraint violation (already enrolled)
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23505"
    ) {
      return NextResponse.json(
        { error: "Already enrolled in this learning path" },
        { status: 409 }
      );
    }

    console.error("POST /api/paths/[pathId]/enroll error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

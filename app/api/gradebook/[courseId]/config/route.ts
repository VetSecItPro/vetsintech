import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { getGradeConfigs } from "@/lib/domains/gradebook/queries";
import { batchUpsertGradeConfigs } from "@/lib/domains/gradebook/mutations";
import { batchGradeConfigSchema } from "@/lib/domains/gradebook/validation";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { courseId } = await params;
    const configs = await getGradeConfigs(courseId);

    return NextResponse.json({ data: configs }, { status: 200 });
  } catch (error) {
    console.error("GET /api/gradebook/[courseId]/config error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const auth = await requireAuth(request, ["admin", "instructor"]);
    if (isAuthError(auth)) return auth;

    const { courseId } = await params;
    const body = await request.json();
    const parsed = batchGradeConfigSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    // Validate weights sum to 100%
    const totalWeight = parsed.data.configs.reduce(
      (sum, c) => sum + c.weight,
      0
    );
    if (Math.abs(totalWeight - 100) > 0.01) {
      return NextResponse.json(
        { error: `Category weights must sum to 100% (currently ${totalWeight}%)` },
        { status: 400 }
      );
    }

    const configs = await batchUpsertGradeConfigs(
      courseId,
      parsed.data.configs,
      auth.organizationId
    );

    return NextResponse.json({ data: configs }, { status: 200 });
  } catch (error) {
    console.error("PUT /api/gradebook/[courseId]/config error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { getLearningPaths } from "@/lib/domains/learning-paths/queries";
import { createLearningPath } from "@/lib/domains/learning-paths/mutations";
import { learningPathSchema } from "@/lib/domains/learning-paths/validation";
import type { LearningPathFilters } from "@/lib/domains/learning-paths/types";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const filters: LearningPathFilters = {};

    const status = searchParams.get("status");
    if (status) {
      filters.status = status as LearningPathFilters["status"];
    }

    const difficulty = searchParams.get("difficulty_level");
    if (difficulty) {
      filters.difficulty_level = difficulty as LearningPathFilters["difficulty_level"];
    }

    const search = searchParams.get("search");
    if (search) {
      filters.search = search;
    }

    const paths = await getLearningPaths(auth.organizationId, filters);

    return NextResponse.json({ data: paths }, { status: 200 });
  } catch (error) {
    console.error("GET /api/paths error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request, ["admin"]);
    if (isAuthError(auth)) return auth;

    const body = await request.json();
    const parsed = learningPathSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    const path = await createLearningPath(
      parsed.data,
      auth.organizationId,
      auth.user.id
    );

    return NextResponse.json({ data: path }, { status: 201 });
  } catch (error) {
    console.error("POST /api/paths error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

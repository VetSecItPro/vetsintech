import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { getCourses } from "@/lib/domains/courses/queries";
import { createCourse } from "@/lib/domains/courses/mutations";
import { courseSchema } from "@/lib/utils/validation";
import type { CourseFilters } from "@/lib/domains/courses/types";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const filters: CourseFilters = {};

    const status = searchParams.get("status");
    if (status) {
      filters.status = status as CourseFilters["status"];
    }

    const category = searchParams.get("category");
    if (category) {
      filters.category = category;
    }

    const search = searchParams.get("search");
    if (search) {
      filters.search = search;
    }

    const courses = await getCourses(auth.organizationId, filters);

    return NextResponse.json({ data: courses }, {
      status: 200,
      headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    console.error("GET /api/courses error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request, ["admin", "instructor"]);
    if (isAuthError(auth)) return auth;

    const body = await request.json();
    const parsed = courseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    const course = await createCourse(
      parsed.data,
      auth.organizationId,
      auth.user.id
    );

    return NextResponse.json({ data: course }, { status: 201 });
  } catch (error) {
    console.error("POST /api/courses error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { getResources } from "@/lib/domains/resources/queries";
import { createResource } from "@/lib/domains/resources/mutations";
import { createResourceSchema } from "@/lib/domains/resources/validation";
import type { ResourceFilters, ResourceType } from "@/lib/domains/resources/types";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const filters: ResourceFilters = {};

    const course_id = searchParams.get("course_id");
    if (course_id) {
      filters.course_id = course_id;
    }

    const type = searchParams.get("type");
    if (type) {
      filters.type = type as ResourceType;
    }

    const tag = searchParams.get("tag");
    if (tag) {
      filters.tag = tag;
    }

    const search = searchParams.get("search");
    if (search) {
      filters.search = search;
    }

    const resources = await getResources(auth.organizationId, filters);

    return NextResponse.json({ data: resources }, {
      status: 200,
      headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    console.error("GET /api/resources error:", error);
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
    const parsed = createResourceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    const resource = await createResource(
      parsed.data,
      auth.organizationId,
      auth.user.id
    );

    return NextResponse.json({ data: resource }, { status: 201 });
  } catch (error) {
    console.error("POST /api/resources error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

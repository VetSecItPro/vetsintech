import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { getDiscussions } from "@/lib/domains/community/queries";
import { createDiscussion } from "@/lib/domains/community/mutations";
import type { DiscussionFilters } from "@/lib/domains/community/types";

/**
 * GET /api/discussions?cohort_id=xxx&search=xxx&limit=25&offset=0
 * List discussions for the authenticated user's organization.
 */
export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const filters: DiscussionFilters = {};

    const cohortId = searchParams.get("cohort_id");
    if (cohortId) {
      filters.cohort_id = cohortId;
    }

    const search = searchParams.get("search");
    if (search) {
      filters.search = search;
    }

    const limit = searchParams.get("limit");
    if (limit) {
      const parsed = parseInt(limit, 10);
      filters.limit = Number.isNaN(parsed) ? 25 : Math.min(Math.max(1, parsed), 100);
    }

    const offset = searchParams.get("offset");
    if (offset) {
      const parsed = parseInt(offset, 10);
      filters.offset = Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
    }

    const discussions = await getDiscussions(auth.organizationId, filters);

    return NextResponse.json({ data: discussions }, { status: 200 });
  } catch (error) {
    console.error("GET /api/discussions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

const createDiscussionSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be 200 characters or fewer"),
  body: z.record(z.string(), z.unknown()).optional(),
  cohort_id: z.string().uuid("Invalid cohort ID").optional(),
});

/**
 * POST /api/discussions
 * Create a new discussion in the user's organization.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const body = await request.json();
    const parsed = createDiscussionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    const discussion = await createDiscussion(
      auth.organizationId,
      auth.user.id,
      parsed.data
    );

    return NextResponse.json({ data: discussion }, { status: 201 });
  } catch (error) {
    console.error("POST /api/discussions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

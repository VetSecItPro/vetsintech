import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { getAnnouncements } from "@/lib/domains/notifications/queries";
import { createAnnouncement } from "@/lib/domains/notifications/mutations";

const createAnnouncementSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.object({}).passthrough(),
  cohort_id: z.uuid().optional(),
});

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { searchParams } = new URL(request.url);

    const options: { cohort_id?: string; limit?: number; offset?: number } = {};

    const cohortId = searchParams.get("cohort_id");
    if (cohortId) {
      options.cohort_id = cohortId;
    }

    const limit = searchParams.get("limit");
    if (limit) {
      const parsed = parseInt(limit, 10);
      options.limit = Number.isNaN(parsed) ? 25 : Math.min(Math.max(1, parsed), 100);
    }

    const offset = searchParams.get("offset");
    if (offset) {
      const parsed = parseInt(offset, 10);
      options.offset = Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
    }

    const announcements = await getAnnouncements(
      auth.organizationId,
      options
    );

    return NextResponse.json({ data: announcements }, {
      status: 200,
      headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    console.error("GET /api/announcements error:", error);
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
    const parsed = createAnnouncementSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    const announcement = await createAnnouncement(
      auth.organizationId,
      auth.user.id,
      parsed.data
    );

    return NextResponse.json({ data: announcement }, { status: 201 });
  } catch (error) {
    console.error("POST /api/announcements error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

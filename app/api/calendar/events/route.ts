import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { getCalendarEvents } from "@/lib/domains/calendar/queries";
import { createCalendarEvent } from "@/lib/domains/calendar/mutations";
import { createCalendarEventSchema } from "@/lib/domains/calendar/validation";

/**
 * GET /api/calendar/events?start=<ISO>&end=<ISO>
 * Get custom calendar events for a date range.
 */
export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    if (!start || !end) {
      return NextResponse.json(
        { error: "start and end query parameters are required (ISO datetime)" },
        { status: 400 }
      );
    }

    if (isNaN(Date.parse(start)) || isNaN(Date.parse(end))) {
      return NextResponse.json(
        { error: "start and end must be valid ISO datetime strings" },
        { status: 400 }
      );
    }

    const events = await getCalendarEvents(auth.organizationId, start, end);
    return NextResponse.json({ data: events }, { status: 200 });
  } catch (error) {
    console.error("GET /api/calendar/events error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/calendar/events
 * Create a new custom calendar event. Admin only.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request, ["admin"]);
    if (isAuthError(auth)) return auth;

    const body = await request.json();
    const parsed = createCalendarEventSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    // Map "none" to null for course_id
    const courseId = parsed.data.course_id === "none" ? null : parsed.data.course_id;

    const event = await createCalendarEvent({
      ...parsed.data,
      course_id: courseId,
      organization_id: auth.organizationId,
      created_by: auth.user.id,
    });

    return NextResponse.json({ data: event }, { status: 201 });
  } catch (error) {
    console.error("POST /api/calendar/events error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

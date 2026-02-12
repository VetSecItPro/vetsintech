import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import {
  updateCalendarEvent,
  deleteCalendarEvent,
} from "@/lib/domains/calendar/mutations";
import { updateCalendarEventSchema } from "@/lib/domains/calendar/validation";

interface RouteContext {
  params: Promise<{ eventId: string }>;
}

/**
 * PATCH /api/calendar/events/:eventId
 * Update a custom calendar event. Admin only.
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await requireAuth(request, ["admin"]);
    if (isAuthError(auth)) return auth;

    const { eventId } = await context.params;

    const body = await request.json();
    const parsed = updateCalendarEventSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    const event = await updateCalendarEvent(eventId, parsed.data);
    return NextResponse.json({ data: event }, { status: 200 });
  } catch (error) {
    console.error("PATCH /api/calendar/events/:eventId error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/calendar/events/:eventId
 * Delete a custom calendar event. Admin only.
 */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const auth = await requireAuth(request, ["admin"]);
    if (isAuthError(auth)) return auth;

    const { eventId } = await context.params;

    await deleteCalendarEvent(eventId);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/calendar/events/:eventId error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

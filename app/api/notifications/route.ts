import { NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import {
  getNotifications,
  getUnreadCount,
} from "@/lib/domains/notifications/queries";
import { markAllAsRead } from "@/lib/domains/notifications/mutations";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { searchParams } = new URL(request.url);

    const options: { is_read?: boolean; limit?: number; offset?: number } = {};

    const isRead = searchParams.get("is_read");
    if (isRead !== null) {
      options.is_read = isRead === "true";
    }

    const limit = searchParams.get("limit");
    if (limit) {
      options.limit = parseInt(limit, 10);
    }

    const offset = searchParams.get("offset");
    if (offset) {
      options.offset = parseInt(offset, 10);
    }

    const [notifications, unreadCount] = await Promise.all([
      getNotifications(auth.user.id, auth.organizationId, options),
      getUnreadCount(auth.user.id, auth.organizationId),
    ]);

    return NextResponse.json(
      { data: notifications },
      {
        status: 200,
        headers: { "X-Unread-Count": String(unreadCount) },
      }
    );
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    await markAllAsRead(auth.user.id, auth.organizationId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("POST /api/notifications error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

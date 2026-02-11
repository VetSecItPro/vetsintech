import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { getAnnouncementById } from "@/lib/domains/notifications/queries";
import {
  updateAnnouncement,
  deleteAnnouncement,
  publishAnnouncement,
  unpublishAnnouncement,
} from "@/lib/domains/notifications/mutations";

const updateAnnouncementSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.object({}).passthrough().optional(),
  cohort_id: z.uuid().optional(),
  action: z.enum(["publish", "unpublish"]).optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { id } = await params;
    const announcement = await getAnnouncementById(id);

    if (!announcement) {
      return NextResponse.json(
        { error: "Announcement not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: announcement }, { status: 200 });
  } catch (error) {
    console.error("GET /api/announcements/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request, ["admin", "instructor"]);
    if (isAuthError(auth)) return auth;

    const { id } = await params;
    const body = await request.json();
    const parsed = updateAnnouncementSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    const { action, ...updateData } = parsed.data;

    // Handle publish/unpublish actions
    if (action === "publish") {
      const announcement = await publishAnnouncement(id);
      return NextResponse.json({ data: announcement }, { status: 200 });
    }

    if (action === "unpublish") {
      const announcement = await unpublishAnnouncement(id);
      return NextResponse.json({ data: announcement }, { status: 200 });
    }

    // Handle field updates
    const announcement = await updateAnnouncement(id, updateData);

    return NextResponse.json({ data: announcement }, { status: 200 });
  } catch (error) {
    console.error("PATCH /api/announcements/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request, ["admin"]);
    if (isAuthError(auth)) return auth;

    const { id } = await params;
    await deleteAnnouncement(id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/announcements/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

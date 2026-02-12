import { NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { createClient } from "@/lib/supabase/server";
import {
  sendEmail,
  announcementSubject,
  announcementHtml,
} from "@/lib/services/email";

/**
 * POST /api/email/send
 * Admin-only: Send an announcement email to all students (or a specific cohort).
 *
 * Body: { announcement_id: string, cohort_id?: string }
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request, ["admin"]);
    if (isAuthError(auth)) return auth;

    const body = await request.json();
    const { announcement_id, cohort_id } = body as {
      announcement_id?: string;
      cohort_id?: string;
    };

    if (!announcement_id) {
      return NextResponse.json(
        { error: "announcement_id is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Fetch the announcement
    const { data: announcement, error: annError } = await supabase
      .from("announcements")
      .select("title, body, organization_id")
      .eq("id", announcement_id)
      .single();

    if (annError || !announcement) {
      return NextResponse.json(
        { error: "Announcement not found" },
        { status: 404 }
      );
    }

    // Fetch the organization name
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", announcement.organization_id)
      .single();

    const orgName = org?.name ?? "VetsInTech";

    // Get recipient students
    let recipientQuery = supabase
      .from("user_roles")
      .select("user_id")
      .eq("organization_id", auth.organizationId)
      .eq("role", "student");

    // If cohort_id is provided, filter to students enrolled in that cohort
    if (cohort_id) {
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("user_id")
        .eq("cohort_id", cohort_id)
        .eq("status", "active");

      const enrolledUserIds = (enrollments || []).map((e) => e.user_id);
      if (enrolledUserIds.length === 0) {
        return NextResponse.json(
          { data: { sent: 0, failed: 0 } },
          { status: 200 }
        );
      }
      recipientQuery = recipientQuery.in("user_id", enrolledUserIds);
    }

    const { data: studentRoles, error: rolesError } = await recipientQuery;
    if (rolesError) throw rolesError;

    const studentIds = (studentRoles || []).map((r) => r.user_id);
    if (studentIds.length === 0) {
      return NextResponse.json(
        { data: { sent: 0, failed: 0 } },
        { status: 200 }
      );
    }

    // Fetch profiles (email) and email preferences for those students
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email")
      .in("id", studentIds);

    const { data: allPrefs } = await supabase
      .from("email_preferences")
      .select("user_id, announcement_emails")
      .in("user_id", studentIds);

    const prefsMap = new Map(
      (allPrefs || []).map((p) => [p.user_id, p.announcement_emails])
    );

    // Extract plain text preview from announcement body (Tiptap JSON)
    const bodyContent = announcement.body as Record<string, unknown>;
    const previewText =
      typeof bodyContent === "object" && bodyContent !== null
        ? JSON.stringify(bodyContent).replace(/<[^>]*>/g, "").slice(0, 200)
        : "Check the platform for details.";

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://vetsintech.org";

    let sent = 0;
    let failed = 0;

    // Send emails (skip users who opted out)
    for (const profile of profiles || []) {
      const optedIn = prefsMap.get(profile.id);
      // Default to true if no preferences row exists
      if (optedIn === false) continue;

      const result = await sendEmail({
        to: profile.email,
        subject: announcementSubject(announcement.title),
        html: announcementHtml({
          organizationName: orgName,
          announcementTitle: announcement.title,
          previewText,
          viewUrl: `${baseUrl}/announcements`,
          unsubscribeUrl: `${baseUrl}/settings/notifications`,
        }),
        template: "announcement",
        toUserId: profile.id,
        organizationId: auth.organizationId,
      });

      if (result.success) {
        sent++;
      } else {
        failed++;
      }
    }

    return NextResponse.json({ data: { sent, failed } }, { status: 200 });
  } catch (error) {
    console.error("POST /api/email/send error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

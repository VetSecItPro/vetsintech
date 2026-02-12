import { NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { sendEmail, baseTemplate } from "@/lib/services/email";

/**
 * POST /api/email/test
 * Sends a test email to the authenticated user's own email address.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const html = baseTemplate({
      heading: "Test Email",
      preheader: "This is a test email from VetsInTech Learning",
      bodyHtml: `
        <p style="margin: 0 0 12px 0;">
          This is a test email to verify your email notification settings are working correctly.
        </p>
        <p style="margin: 0;">
          If you received this email, your notifications are set up properly.
        </p>
      `,
    });

    const result = await sendEmail({
      to: auth.user.email,
      subject: "VetsInTech: Test Email",
      html,
      template: "test",
      toUserId: auth.user.id,
      organizationId: auth.organizationId,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "Failed to send test email" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data: { message: "Test email sent", resend_id: result.resendId } },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST /api/email/test error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

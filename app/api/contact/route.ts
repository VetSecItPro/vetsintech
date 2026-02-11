import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const contactSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.email(),
  organization: z.string().max(200).nullable().optional(),
  message: z.string().min(10).max(5000),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = contactSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: z.prettifyError(result.error) },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Store the contact inquiry in notifications table as a system notification
    // In production, you'd also send an email notification to admins
    const { error } = await supabase.from("notifications").insert({
      user_id: "00000000-0000-0000-0000-000000000000", // System placeholder
      organization_id: "00000000-0000-0000-0000-000000000000", // Will be updated when org exists
      type: "cohort_update", // Reusing type for general system notifications
      title: `Contact form: ${result.data.name}`,
      body: `From: ${result.data.email}${result.data.organization ? ` (${result.data.organization})` : ""}\n\n${result.data.message}`,
      metadata: {
        source: "contact_form",
        name: result.data.name,
        email: result.data.email,
        organization: result.data.organization,
      },
    });

    if (error) {
      // Log but don't expose DB errors
      console.error("Contact form save error:", error);
    }

    // Always return success to the user (don't let DB issues block the UX)
    return NextResponse.json({ data: { success: true } });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

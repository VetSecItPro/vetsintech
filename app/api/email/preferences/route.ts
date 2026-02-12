import { NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { getUserEmailPreferences } from "@/lib/domains/email/queries";
import {
  updateEmailPreferences,
  createDefaultPreferences,
} from "@/lib/domains/email/mutations";
import { updateEmailPreferencesSchema } from "@/lib/domains/email/validation";

/**
 * GET /api/email/preferences
 * Returns the current user's email preferences.
 * Creates default preferences if none exist.
 */
export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    let prefs = await getUserEmailPreferences(auth.user.id);

    // Auto-create default preferences on first access
    if (!prefs) {
      prefs = await createDefaultPreferences(
        auth.user.id,
        auth.organizationId
      );
    }

    return NextResponse.json({ data: prefs }, { status: 200 });
  } catch (error) {
    console.error("GET /api/email/preferences error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/email/preferences
 * Updates the current user's email preferences.
 */
export async function PUT(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const body = await request.json();
    const parsed = updateEmailPreferencesSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    // Ensure preferences row exists first
    let prefs = await getUserEmailPreferences(auth.user.id);
    if (!prefs) {
      await createDefaultPreferences(auth.user.id, auth.organizationId);
    }

    prefs = await updateEmailPreferences(auth.user.id, parsed.data);

    return NextResponse.json({ data: prefs }, { status: 200 });
  } catch (error) {
    console.error("PUT /api/email/preferences error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

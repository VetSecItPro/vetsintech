import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { createClient } from "@/lib/supabase/server";

const PROFILE_SELECT =
  "id, full_name, email, bio, avatar_url, organization_id, created_at, updated_at";

const updateProfileSchema = z.object({
  full_name: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  avatar_url: z.string().url().nullable().optional(),
});

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const supabase = await createClient();

    const { data: profile, error } = await supabase
      .from("profiles")
      .select(PROFILE_SELECT)
      .eq("id", auth.user.id)
      .single();

    if (error || !profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: profile }, { status: 200 });
  } catch (error) {
    console.error("GET /api/profiles error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    // Build update payload from only the fields that were provided
    const update: Record<string, unknown> = {};
    if (parsed.data.full_name !== undefined) {
      update.full_name = parsed.data.full_name;
    }
    if (parsed.data.bio !== undefined) {
      update.bio = parsed.data.bio;
    }
    if (parsed.data.avatar_url !== undefined) {
      update.avatar_url = parsed.data.avatar_url;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    update.updated_at = new Date().toISOString();

    const supabase = await createClient();

    const { data: profile, error } = await supabase
      .from("profiles")
      .update(update)
      .eq("id", auth.user.id)
      .select(PROFILE_SELECT)
      .single();

    if (error) {
      console.error("PATCH /api/profiles update error:", error);
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: profile }, { status: 200 });
  } catch (error) {
    console.error("PATCH /api/profiles error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

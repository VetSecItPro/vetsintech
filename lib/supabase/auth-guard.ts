// ============================================================================
// Server-Side Auth Guard
// Shared authentication + profile check for all protected server pages.
// Returns the authenticated user, their profile, org ID, and supabase client.
// Redirects to login if unauthenticated or profile is missing.
// ============================================================================

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/constants/routes";

export interface AuthGuardResult {
  user: { id: string; email?: string };
  profile: {
    organization_id: string;
    full_name: string | null;
    role: string | null;
  };
  organizationId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
}

/**
 * Authenticate the current user and load their profile.
 *
 * - Creates a server-side Supabase client
 * - Verifies the user is authenticated (redirects to login if not)
 * - Fetches their profile with org ID, name, and role
 * - Redirects to login if profile is missing
 *
 * @returns Authenticated user, profile, org ID, and supabase client
 */
export async function getAuthenticatedUser(): Promise<AuthGuardResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(ROUTES.login);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, full_name, role")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) {
    redirect(ROUTES.login);
  }

  return {
    user,
    profile,
    organizationId: profile.organization_id,
    supabase,
  };
}

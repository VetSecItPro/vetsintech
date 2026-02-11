import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { UserRole } from "@/lib/types/auth";

interface AuthResult {
  user: { id: string; email: string };
  organizationId: string;
  roles: UserRole[];
}

/**
 * Authenticate and authorize an API request.
 * Returns user info + roles if authorized, or a NextResponse error.
 *
 * Usage in API routes:
 * ```ts
 * const auth = await requireAuth(request, ["admin", "instructor"]);
 * if (auth instanceof NextResponse) return auth; // Error response
 * // auth.user, auth.organizationId, auth.roles are available
 * ```
 */
export async function requireAuth(
  _request: Request,
  allowedRoles?: UserRole[]
): Promise<AuthResult | NextResponse> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Get profile with organization
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json(
      { error: "Profile not found" },
      { status: 403 }
    );
  }

  // Get user roles
  const { data: userRoles, error: rolesError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", profile.organization_id);

  if (rolesError) {
    return NextResponse.json(
      { error: "Failed to fetch roles" },
      { status: 500 }
    );
  }

  const roles = (userRoles || []).map((r) => r.role as UserRole);

  // Check role authorization if specific roles are required
  if (allowedRoles && allowedRoles.length > 0) {
    const hasPermission = roles.some((role) => allowedRoles.includes(role));
    if (!hasPermission) {
      return NextResponse.json(
        { error: "Forbidden — insufficient permissions" },
        { status: 403 }
      );
    }
  }

  return {
    user: { id: user.id, email: user.email || "" },
    organizationId: profile.organization_id,
    roles,
  };
}

/**
 * Type guard to check if requireAuth returned an error response.
 */
export function isAuthError(
  result: AuthResult | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}

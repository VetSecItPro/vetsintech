import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

const createStudentSchema = z.object({
  full_name: z.string().min(1, "Full name is required").max(200),
  email: z.email("Invalid email address"),
  cohort_id: z.uuid().optional(),
  role: z.enum(["student", "instructor"]).default("student"),
});

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request, ["admin", "instructor"]);
    if (isAuthError(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const cohort_id = searchParams.get("cohort_id") || undefined;
    const status = searchParams.get("status") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const supabase = await createClient();

    // Get student user IDs in this org
    const { data: studentRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("organization_id", auth.organizationId)
      .eq("role", "student");

    const studentIds = (studentRoles || []).map((r) => r.user_id);

    if (studentIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // If filtering by cohort, intersect with enrollment user IDs
    let filteredIds = studentIds;
    if (cohort_id) {
      const { data: cohortEnrollments } = await supabase
        .from("enrollments")
        .select("user_id")
        .eq("cohort_id", cohort_id);
      const cohortUserIds = new Set(
        (cohortEnrollments || []).map((e) => e.user_id)
      );
      filteredIds = filteredIds.filter((id) => cohortUserIds.has(id));
    }

    if (filteredIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Fetch profiles
    let query = supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url, is_active, last_sign_in_at")
      .in("id", filteredIds)
      .order("full_name", { ascending: true })
      .range(offset, offset + limit - 1);

    if (search && search.length <= 100) {
      // Escape SQL LIKE wildcards to prevent pattern injection
      const sanitized = search.replace(/[%_\\]/g, "\\$&");
      query = query.or(
        `full_name.ilike.%${sanitized}%,email.ilike.%${sanitized}%`
      );
    }

    if (status === "active") {
      query = query.eq("is_active", true);
    } else if (status === "inactive") {
      query = query.eq("is_active", false);
    }

    const { data: students, error } = await query;

    if (error) {
      console.error("GET /api/students error:", error);
      return NextResponse.json(
        { error: "Failed to fetch students" },
        { status: 500 }
      );
    }

    // Enrich with enrollment info
    const resultIds = (students || []).map((s) => s.id);
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("user_id, cohort_id, cohorts(id, name)")
      .in("user_id", resultIds.length > 0 ? resultIds : ["__none__"]);

    const enriched = (students || []).map((s) => {
      const studentEnrollments = (enrollments || []).filter(
        (e) => e.user_id === s.id
      );
      const cohorts = studentEnrollments
        .map((e) => {
          const cohort = e.cohorts as unknown as { id: string; name: string } | null;
          return cohort;
        })
        .filter(Boolean);

      return { ...s, cohorts };
    });

    return NextResponse.json({ data: enriched });
  } catch (error) {
    console.error("GET /api/students error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request, ["admin"]);
    if (isAuthError(auth)) return auth;

    const body = await request.json();
    const parsed = createStudentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    const { full_name, email, cohort_id, role } = parsed.data;
    const adminSupabase = createAdminClient();

    // Create auth user with a random password
    const randomPassword = crypto.randomBytes(24).toString("base64url");
    const { data: newUser, error: createError } =
      await adminSupabase.auth.admin.createUser({
        email,
        password: randomPassword,
        email_confirm: true,
      });

    if (createError) {
      console.error("Create user error:", createError);
      return NextResponse.json(
        { error: createError.message || "Failed to create user" },
        { status: 400 }
      );
    }

    if (!newUser.user) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }

    const userId = newUser.user.id;

    // Create profile in vit schema (no auto-trigger in shared DB)
    await adminSupabase.from("profiles").upsert({
      id: userId,
      email,
      full_name,
      organization_id: auth.organizationId,
    });

    // Assign role
    await adminSupabase.from("user_roles").insert({
      user_id: userId,
      organization_id: auth.organizationId,
      role,
    });

    // Optionally enroll in cohort
    if (cohort_id) {
      await adminSupabase.from("enrollments").insert({
        user_id: userId,
        cohort_id,
        status: "active",
      });
    }

    // Fetch the created profile
    const { data: student } = await adminSupabase
      .from("profiles")
      .select("id, full_name, email, avatar_url, is_active, created_at")
      .eq("id", userId)
      .single();

    return NextResponse.json({ data: student }, { status: 201 });
  } catch (error) {
    console.error("POST /api/students error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

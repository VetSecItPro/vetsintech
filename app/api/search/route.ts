import { NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { organizationId, roles } = auth;
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query || query.length < 2 || query.length > 100) {
    return NextResponse.json({ data: { courses: [], discussions: [], students: [] } });
  }

  try {
    const supabase = await createClient();
    // Escape SQL LIKE wildcards to prevent pattern injection
    const sanitized = query.replace(/[%_\\]/g, "\\$&");
    const searchPattern = `%${sanitized}%`;

    // Search courses
    const coursesPromise = supabase
      .from("courses")
      .select("id, title, slug, category, status")
      .eq("organization_id", organizationId)
      .ilike("title", searchPattern)
      .limit(5);

    // Search discussions
    const discussionsPromise = supabase
      .from("discussions")
      .select("id, title, author:profiles!discussions_author_id_fkey(full_name)")
      .eq("organization_id", organizationId)
      .ilike("title", searchPattern)
      .limit(5);

    // Search students (admin only)
    const isAdmin = roles.includes("admin") || roles.includes("instructor");
    const studentsPromise = isAdmin
      ? supabase
          .from("profiles")
          .select("id, full_name, email")
          .eq("organization_id", organizationId)
          .or(`full_name.ilike.${searchPattern},email.ilike.${searchPattern}`)
          .limit(5)
      : Promise.resolve({ data: [] });

    const [coursesRes, discussionsRes, studentsRes] = await Promise.all([
      coursesPromise,
      discussionsPromise,
      studentsPromise,
    ]);

    return NextResponse.json({
      data: {
        courses: coursesRes.data || [],
        discussions: discussionsRes.data || [],
        students: studentsRes.data || [],
      },
    });
  } catch (err) {
    console.error("Search error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

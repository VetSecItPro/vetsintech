import { createClient } from "@/lib/supabase/server";
import type {
  Resource,
  ResourceWithUploader,
  ResourceWithCourse,
  ResourceFilters,
} from "./types";

// ============================================================================
// Resource Queries
// ============================================================================

export async function getResources(
  organizationId: string,
  filters?: ResourceFilters
): Promise<ResourceWithCourse[]> {
  const supabase = await createClient();

  let query = supabase
    .from("resources")
    .select(
      `
      *,
      uploader:profiles!uploaded_by(id, full_name, email),
      course:courses!course_id(id, title)
    `
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (filters?.course_id) {
    query = query.eq("course_id", filters.course_id);
  }
  if (filters?.type) {
    query = query.eq("type", filters.type);
  }
  if (filters?.tag) {
    query = query.contains("tags", [filters.tag]);
  }
  if (filters?.search) {
    query = query.or(
      `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((row) => ({
    ...row,
    tags: row.tags || [],
    uploader: row.uploader as unknown as ResourceWithCourse["uploader"],
    course: row.course as unknown as ResourceWithCourse["course"],
  }));
}

export async function getResourceById(
  resourceId: string,
  organizationId: string
): Promise<ResourceWithUploader | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("resources")
    .select(
      `
      *,
      uploader:profiles!uploaded_by(id, full_name, email)
    `
    )
    .eq("id", resourceId)
    .eq("organization_id", organizationId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw error;
  }

  return {
    ...data,
    tags: data.tags || [],
    uploader: data.uploader as unknown as ResourceWithUploader["uploader"],
  };
}

export async function getResourcesByCourse(
  courseId: string,
  organizationId: string
): Promise<ResourceWithUploader[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("resources")
    .select(
      `
      *,
      uploader:profiles!uploaded_by(id, full_name, email)
    `
    )
    .eq("course_id", courseId)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((row) => ({
    ...row,
    tags: row.tags || [],
    uploader: row.uploader as unknown as ResourceWithUploader["uploader"],
  }));
}

export async function getPopularResources(
  organizationId: string,
  limit: number = 10
): Promise<Resource[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("resources")
    .select("*")
    .eq("organization_id", organizationId)
    .order("download_count", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data || []).map((row) => ({
    ...row,
    tags: row.tags || [],
  }));
}

export async function getResourceTags(
  organizationId: string
): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("resources")
    .select("tags")
    .eq("organization_id", organizationId)
    .limit(5000);

  if (error) throw error;

  const allTags = (data || []).flatMap((r) => r.tags || []);
  return [...new Set(allTags)].sort();
}

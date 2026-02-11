import { createClient } from "@/lib/supabase/server";
import type {
  ExternalPlatform,
  ExternalStudentProgress,
  PlatformConfig,
} from "./types";

export async function getPlatformConfigs(
  orgId: string
): Promise<PlatformConfig[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("platform_configs")
    .select("*")
    .eq("organization_id", orgId)
    .order("platform", { ascending: true });

  if (error) throw error;
  return (data ?? []) as PlatformConfig[];
}

export async function getPlatformConfig(
  orgId: string,
  platform: ExternalPlatform
): Promise<PlatformConfig | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("platform_configs")
    .select("*")
    .eq("organization_id", orgId)
    .eq("platform", platform)
    .maybeSingle();

  if (error) throw error;
  return data as PlatformConfig | null;
}

export async function getExternalProgress(
  orgId: string,
  options?: {
    platform?: ExternalPlatform;
    userId?: string;
    limit?: number;
    offset?: number;
  }
): Promise<ExternalStudentProgress[]> {
  const supabase = await createClient();

  let query = supabase
    .from("external_enrollments")
    .select(
      `
      user_id,
      platform,
      external_course_title,
      profiles!inner (
        full_name,
        email
      ),
      external_progress (
        progress_percentage,
        status,
        last_activity_at
      )
    `
    )
    .eq("organization_id", orgId);

  if (options?.platform) {
    query = query.eq("platform", options.platform);
  }

  if (options?.userId) {
    query = query.eq("user_id", options.userId);
  }

  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) throw error;

  return (data ?? []).map((row: Record<string, unknown>) => {
    const profile = row.profiles as Record<string, unknown> | null;
    const progress = Array.isArray(row.external_progress)
      ? (row.external_progress[0] as Record<string, unknown> | undefined)
      : undefined;

    return {
      userId: row.user_id as string,
      fullName: (profile?.full_name as string) ?? "Unknown",
      email: (profile?.email as string) ?? "",
      platform: row.platform as ExternalPlatform,
      courseTitle: row.external_course_title as string,
      progressPercentage: (progress?.progress_percentage as number) ?? 0,
      status: (progress?.status as string) ?? "in_progress",
      lastActivityAt: (progress?.last_activity_at as string) ?? null,
    };
  });
}

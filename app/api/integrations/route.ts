import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { getPlatformConfigs, getExternalProgress } from "@/lib/domains/integrations/queries";
import { upsertPlatformConfig } from "@/lib/domains/integrations/mutations";

export async function GET(request: Request) {
  const auth = await requireAuth(request, ["admin"]);
  if (isAuthError(auth)) return auth;

  try {
    const [configs, progress] = await Promise.all([
      getPlatformConfigs(auth.organizationId),
      getExternalProgress(auth.organizationId),
    ]);

    return NextResponse.json({ data: { configs, progress } });
  } catch (error) {
    console.error("GET /api/integrations error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

const postSchema = z.object({
  platform: z.enum(["coursera", "pluralsight", "udemy"]),
  credentials: z.record(z.string(), z.string()),
  is_enabled: z.boolean().optional(),
  sync_frequency_minutes: z.number().int().min(15).max(1440).optional(),
});

export async function POST(request: Request) {
  const auth = await requireAuth(request, ["admin"]);
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const result = postSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: z.prettifyError(result.error) },
        { status: 400 }
      );
    }

    const { platform, credentials, is_enabled, sync_frequency_minutes } =
      result.data;

    const config = await upsertPlatformConfig(
      auth.organizationId,
      platform,
      {
        credentials,
        is_enabled,
        sync_frequency_minutes,
      }
    );

    return NextResponse.json({ data: config });
  } catch (error) {
    console.error("POST /api/integrations error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { incrementDownloadCount } from "@/lib/domains/resources/mutations";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ resourceId: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { resourceId } = await params;
    await incrementDownloadCount(resourceId, auth.organizationId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("POST /api/resources/[resourceId]/download error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

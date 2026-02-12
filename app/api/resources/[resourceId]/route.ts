import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { getResourceById } from "@/lib/domains/resources/queries";
import { updateResource, deleteResource } from "@/lib/domains/resources/mutations";
import { updateResourceSchema } from "@/lib/domains/resources/validation";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ resourceId: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { resourceId } = await params;
    const resource = await getResourceById(resourceId, auth.organizationId);

    if (!resource) {
      return NextResponse.json(
        { error: "Resource not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: resource }, { status: 200 });
  } catch (error) {
    console.error("GET /api/resources/[resourceId] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ resourceId: string }> }
) {
  try {
    const auth = await requireAuth(request, ["admin"]);
    if (isAuthError(auth)) return auth;

    const { resourceId } = await params;
    const body = await request.json();

    const parsed = updateResourceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: z.prettifyError(parsed.error) },
        { status: 400 }
      );
    }

    const resource = await updateResource(
      resourceId,
      auth.organizationId,
      parsed.data
    );

    return NextResponse.json({ data: resource }, { status: 200 });
  } catch (error) {
    console.error("PATCH /api/resources/[resourceId] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ resourceId: string }> }
) {
  try {
    const auth = await requireAuth(request, ["admin"]);
    if (isAuthError(auth)) return auth;

    const { resourceId } = await params;
    await deleteResource(resourceId, auth.organizationId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/resources/[resourceId] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/supabase/api-middleware";
import { createClient } from "@/lib/supabase/server";

/**
 * File management API routes.
 * Uses Supabase Storage for file uploads.
 *
 * Storage buckets (to be created when Supabase project is set up):
 * - "course-files" (private): PDFs, docs, presentations, videos
 * - "thumbnails" (public): Course and profile thumbnail images
 *
 * Bucket policies:
 * - course-files: Authenticated users can read files in their org's folder
 * - course-files: Admin/instructor can upload/delete
 * - thumbnails: Public read, admin/instructor upload
 */

const PRIVATE_BUCKET = "course-files";
const PUBLIC_BUCKET = "thumbnails";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("course_id");

    const supabase = await createClient();

    let query = supabase
      .from("course_files")
      .select("*")
      .eq("organization_id", auth.organizationId)
      .order("created_at", { ascending: false });

    if (courseId) {
      query = query.eq("course_id", courseId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request, ["admin", "instructor"]);
    if (isAuthError(auth)) return auth;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const courseId = formData.get("course_id") as string | null;
    const bucket = formData.get("bucket") as string || PRIVATE_BUCKET;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file size (50 MB max)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File exceeds 50 MB limit" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Generate storage path: org_id/course_id/filename
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = courseId
      ? `${auth.organizationId}/${courseId}/${timestamp}-${safeName}`
      : `${auth.organizationId}/shared/${timestamp}-${safeName}`;

    const targetBucket = bucket === "thumbnails" ? PUBLIC_BUCKET : PRIVATE_BUCKET;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(targetBucket)
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Get public URL for thumbnails, signed URL for private files
    let url: string;
    if (targetBucket === PUBLIC_BUCKET) {
      const {
        data: { publicUrl },
      } = supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(storagePath);
      url = publicUrl;
    } else {
      const { data: signedData, error: signedError } = await supabase.storage
        .from(PRIVATE_BUCKET)
        .createSignedUrl(storagePath, 3600); // 1 hour
      if (signedError) throw signedError;
      url = signedData.signedUrl;
    }

    // Record in database
    const { data: fileRecord, error: dbError } = await supabase
      .from("course_files")
      .insert({
        organization_id: auth.organizationId,
        course_id: courseId || null,
        uploaded_by: auth.user.id,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: storagePath,
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return NextResponse.json(
      { data: { ...fileRecord, url, path: storagePath } },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/files error:", err);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireAuth(request, ["admin", "instructor"]);
    if (isAuthError(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("id");

    if (!fileId) {
      return NextResponse.json(
        { error: "File ID required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get file record first
    const { data: fileRecord, error: fetchError } = await supabase
      .from("course_files")
      .select("storage_path")
      .eq("id", fileId)
      .eq("organization_id", auth.organizationId)
      .single();

    if (fetchError || !fileRecord) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Delete from storage
    await supabase.storage
      .from(PRIVATE_BUCKET)
      .remove([fileRecord.storage_path]);

    // Delete from database
    const { error: deleteError } = await supabase
      .from("course_files")
      .delete()
      .eq("id", fileId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { createClient } from "@/lib/supabase/server";
import type {
  Resource,
  CreateResourceInput,
  UpdateResourceInput,
} from "./types";

// ============================================================================
// Resource Mutations
// ============================================================================

export async function createResource(
  input: CreateResourceInput,
  organizationId: string,
  uploadedBy: string
): Promise<Resource> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("resources")
    .insert({
      organization_id: organizationId,
      title: input.title,
      description: input.description || null,
      type: input.type,
      file_path: input.file_path || null,
      file_size: input.file_size || null,
      file_name: input.file_name || null,
      external_url: input.external_url || null,
      course_id: input.course_id || null,
      tags: input.tags || [],
      uploaded_by: uploadedBy,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateResource(
  resourceId: string,
  organizationId: string,
  input: UpdateResourceInput
): Promise<Resource> {
  const supabase = await createClient();

  // Build update payload — only include provided fields
  const payload: Record<string, unknown> = {};
  if (input.title !== undefined) payload.title = input.title;
  if (input.description !== undefined) payload.description = input.description;
  if (input.type !== undefined) payload.type = input.type;
  if (input.file_path !== undefined) payload.file_path = input.file_path;
  if (input.file_size !== undefined) payload.file_size = input.file_size;
  if (input.file_name !== undefined) payload.file_name = input.file_name;
  if (input.external_url !== undefined) payload.external_url = input.external_url;
  if (input.course_id !== undefined) payload.course_id = input.course_id;
  if (input.tags !== undefined) payload.tags = input.tags;

  const { data, error } = await supabase
    .from("resources")
    .update(payload)
    .eq("id", resourceId)
    .eq("organization_id", organizationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteResource(
  resourceId: string,
  organizationId: string
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("resources")
    .delete()
    .eq("id", resourceId)
    .eq("organization_id", organizationId);

  if (error) throw error;
}

export async function incrementDownloadCount(
  resourceId: string,
  organizationId: string
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("increment_resource_download_count", {
    resource_id: resourceId,
  });

  // Fallback: if the RPC doesn't exist, do a manual increment
  if (error) {
    const { data: resource, error: fetchError } = await supabase
      .from("resources")
      .select("download_count")
      .eq("id", resourceId)
      .eq("organization_id", organizationId)
      .single();

    if (fetchError) throw fetchError;

    const { error: updateError } = await supabase
      .from("resources")
      .update({ download_count: (resource.download_count || 0) + 1 })
      .eq("id", resourceId)
      .eq("organization_id", organizationId);

    if (updateError) throw updateError;
  }
}

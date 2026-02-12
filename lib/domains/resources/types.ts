// ============================================================================
// Resource Domain Types
// Maps to: resources table
// ============================================================================

// ---------- Enums (match DB enum) ----------

export type ResourceType =
  | "pdf"
  | "slide"
  | "document"
  | "spreadsheet"
  | "video"
  | "link"
  | "repo"
  | "other";

// ---------- Core Entities ----------

export interface Resource {
  id: string;
  title: string;
  description: string | null;
  type: ResourceType;
  file_path: string | null;
  file_size: number | null;
  file_name: string | null;
  external_url: string | null;
  course_id: string | null;
  tags: string[];
  download_count: number;
  organization_id: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

// ---------- Joined / Extended Types ----------

export interface ResourceWithUploader extends Resource {
  uploader: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface ResourceWithCourse extends ResourceWithUploader {
  course: {
    id: string;
    title: string;
  } | null;
}

// ---------- Input Types (for create/update) ----------

export interface CreateResourceInput {
  title: string;
  description?: string;
  type: ResourceType;
  file_path?: string;
  file_size?: number;
  file_name?: string;
  external_url?: string;
  course_id?: string;
  tags?: string[];
}

export interface UpdateResourceInput {
  title?: string;
  description?: string;
  type?: ResourceType;
  file_path?: string;
  file_size?: number;
  file_name?: string;
  external_url?: string;
  course_id?: string | null;
  tags?: string[];
}

// ---------- Filter / Query Types ----------

export interface ResourceFilters {
  course_id?: string;
  type?: ResourceType;
  tag?: string;
  search?: string;
}

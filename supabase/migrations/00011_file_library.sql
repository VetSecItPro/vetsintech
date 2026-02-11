-- ============================================================================
-- Migration: 00011_file_library
-- Purpose: File and media management for course content
-- Rollback: DROP TABLE IF EXISTS course_files CASCADE;
-- ============================================================================

CREATE TABLE course_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,  -- NULL = org-level file
    uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,                      -- MIME type
    file_size INTEGER NOT NULL,                   -- Bytes
    storage_path TEXT NOT NULL,                   -- Supabase Storage path
    thumbnail_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_course_files_org ON course_files(organization_id);
CREATE INDEX idx_course_files_course ON course_files(course_id);
CREATE INDEX idx_course_files_uploaded_by ON course_files(uploaded_by);
CREATE INDEX idx_course_files_type ON course_files(file_type);

COMMENT ON TABLE course_files IS 'Uploaded files and media. Can be scoped to a course or shared org-wide.';
COMMENT ON COLUMN course_files.storage_path IS 'Path within Supabase Storage bucket. Use signed URLs for private access.';

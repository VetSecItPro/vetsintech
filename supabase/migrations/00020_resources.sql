-- ============================================================================
-- Migration: 00020_resources
-- Purpose: Resource library — shared files, docs, links, repos per org/course
-- Rollback: DROP TABLE IF EXISTS resources CASCADE;
--           DROP TYPE IF EXISTS resource_type;
-- ============================================================================

SET search_path = vit;

-- Resource type enum
CREATE TYPE resource_type AS ENUM (
    'pdf',
    'slide',
    'document',
    'spreadsheet',
    'video',
    'link',
    'repo',
    'other'
);

-- ============================================================================
-- Resources
-- ============================================================================
CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    type resource_type NOT NULL DEFAULT 'document',
    file_path TEXT,              -- Supabase Storage path (null for external links)
    file_size INTEGER,           -- bytes
    file_name TEXT,
    external_url TEXT,           -- for links and repos
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,  -- null = org-wide
    tags TEXT[] DEFAULT '{}',
    download_count INTEGER NOT NULL DEFAULT 0,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    uploaded_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_resources_org ON resources(organization_id);
CREATE INDEX idx_resources_course ON resources(course_id);
CREATE INDEX idx_resources_type ON resources(type);
CREATE INDEX idx_resources_tags ON resources USING gin(tags);

CREATE TRIGGER trg_resources_updated_at
    BEFORE UPDATE ON resources
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- Admins can do everything within their org
CREATE POLICY resources_admin_all ON resources FOR ALL USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Students can read resources within their org
CREATE POLICY resources_student_read ON resources FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
);

COMMENT ON TABLE resources IS 'Shared resource library — PDFs, slides, documents, links, and code repos organized by course or org-wide.';
COMMENT ON COLUMN resources.file_path IS 'Supabase Storage path. NULL for external links/repos.';
COMMENT ON COLUMN resources.external_url IS 'External URL for link and repo resource types.';
COMMENT ON COLUMN resources.course_id IS 'Optional course association. NULL means the resource is org-wide.';

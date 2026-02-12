-- ============================================================================
-- Migration: 00018_learning_paths
-- Purpose: Learning Paths — ordered sequences of courses (e.g. "Web Dev Bootcamp")
-- Rollback: DROP TABLE IF EXISTS learning_path_enrollments CASCADE;
--           DROP TABLE IF EXISTS learning_path_courses CASCADE;
--           DROP TABLE IF EXISTS learning_paths CASCADE;
--           DROP TYPE IF EXISTS learning_path_status;
-- ============================================================================

SET search_path = vit;

-- Learning path status enum
CREATE TYPE learning_path_status AS ENUM ('draft', 'published', 'archived');

-- ============================================================================
-- Learning Paths
-- ============================================================================
CREATE TABLE learning_paths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    status learning_path_status NOT NULL DEFAULT 'draft',
    estimated_hours INTEGER,
    difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    tags TEXT[] DEFAULT '{}',
    organization_id UUID NOT NULL REFERENCES organizations(id),
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(slug, organization_id)
);

CREATE INDEX idx_lp_org ON learning_paths(organization_id);
CREATE INDEX idx_lp_status ON learning_paths(status);

CREATE TRIGGER trg_learning_paths_updated_at
    BEFORE UPDATE ON learning_paths
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Learning Path Courses (ordered join table)
-- ============================================================================
CREATE TABLE learning_path_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    learning_path_id UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0,
    is_required BOOLEAN NOT NULL DEFAULT true,
    UNIQUE(learning_path_id, course_id)
);

CREATE INDEX idx_lpc_path ON learning_path_courses(learning_path_id);
CREATE INDEX idx_lpc_position ON learning_path_courses(learning_path_id, position);

-- ============================================================================
-- Learning Path Enrollments
-- ============================================================================
CREATE TABLE learning_path_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    learning_path_id UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id),
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    UNIQUE(learning_path_id, student_id)
);

CREATE INDEX idx_lpe_path ON learning_path_enrollments(learning_path_id);
CREATE INDEX idx_lpe_student ON learning_path_enrollments(student_id);

-- ============================================================================
-- RLS Policies
-- ============================================================================
ALTER TABLE learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_path_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_path_enrollments ENABLE ROW LEVEL SECURITY;

-- Admins: full access to learning paths in their org
CREATE POLICY lp_admin_all ON learning_paths FOR ALL USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Students: read published paths in their org
CREATE POLICY lp_student_read ON learning_paths FOR SELECT USING (
    status = 'published' AND organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
);

-- Admins: full access to path courses in their org
CREATE POLICY lpc_admin_all ON learning_path_courses FOR ALL USING (
    learning_path_id IN (
        SELECT id FROM learning_paths
        WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    )
    AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Students: read courses in published paths in their org
CREATE POLICY lpc_student_read ON learning_path_courses FOR SELECT USING (
    learning_path_id IN (
        SELECT id FROM learning_paths
        WHERE status = 'published'
        AND organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    )
);

-- Students: manage own enrollments
CREATE POLICY lpe_student_own ON learning_path_enrollments FOR ALL USING (student_id = auth.uid());

-- Admins: full access to enrollments in their org
CREATE POLICY lpe_admin_all ON learning_path_enrollments FOR ALL USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

COMMENT ON TABLE learning_paths IS 'Ordered sequences of courses. Admins create paths; students enroll and progress through them.';
COMMENT ON TABLE learning_path_courses IS 'Join table linking courses to learning paths with ordering.';
COMMENT ON TABLE learning_path_enrollments IS 'Tracks which students are enrolled in which learning paths.';

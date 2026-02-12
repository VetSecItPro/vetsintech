-- ============================================================================
-- Migration: 00016_gradebook
-- Purpose: Gradebook system — grade configurations (category weights) and
--          manual grade overrides (participation, extra credit, adjustments).
--          Builds on top of existing quiz_attempts and assignment_submissions.
-- Rollback: DROP TABLE IF EXISTS grade_overrides CASCADE;
--           DROP TABLE IF EXISTS grade_configs CASCADE;
--           DROP TYPE IF EXISTS grade_category;
-- ============================================================================

SET search_path = vit;

-- Grade category enum
CREATE TYPE grade_category AS ENUM ('quiz', 'assignment', 'participation', 'extra_credit');

-- ============================================================================
-- Grade Configurations (weight per category per course)
-- ============================================================================
CREATE TABLE grade_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    category grade_category NOT NULL,
    weight NUMERIC(5,2) NOT NULL DEFAULT 25.0,  -- percentage weight
    drop_lowest INTEGER NOT NULL DEFAULT 0,      -- drop N lowest scores in this category
    organization_id UUID NOT NULL REFERENCES organizations(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(course_id, category)
);

CREATE INDEX idx_grade_configs_course ON grade_configs(course_id);

-- ============================================================================
-- Grade Overrides (manual entries: participation, extra credit, adjustments)
-- ============================================================================
CREATE TABLE grade_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id),
    category grade_category NOT NULL,
    label TEXT NOT NULL,           -- e.g., "Class Participation", "Extra Credit Project"
    score NUMERIC(6,2) NOT NULL,
    max_score NUMERIC(6,2) NOT NULL DEFAULT 100,
    notes TEXT,
    graded_by UUID NOT NULL REFERENCES profiles(id),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_grade_overrides_course ON grade_overrides(course_id);
CREATE INDEX idx_grade_overrides_student ON grade_overrides(student_id);

CREATE TRIGGER trg_grade_overrides_updated_at
    BEFORE UPDATE ON grade_overrides
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE grade_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_overrides ENABLE ROW LEVEL SECURITY;

-- Grade configs: admins can do everything within their org
CREATE POLICY gc_admin_all ON grade_configs FOR ALL USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Grade configs: all org members can read
CREATE POLICY gc_student_read ON grade_configs FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
);

-- Grade overrides: admins can do everything within their org
CREATE POLICY go_admin_all ON grade_overrides FOR ALL USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Grade overrides: students can read their own
CREATE POLICY go_student_own ON grade_overrides FOR SELECT USING (student_id = auth.uid());

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE grade_configs IS 'Per-course grade category weights. Categories: quiz, assignment, participation, extra_credit. Weights should sum to 100%.';
COMMENT ON TABLE grade_overrides IS 'Manual grade entries for participation, extra credit, or instructor adjustments. Linked to a student and course.';

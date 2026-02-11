-- ============================================================================
-- Migration: 00004_cohorts_enrollments
-- Purpose: Cohort instances of courses + student enrollment tracking
-- Rollback: DROP TABLE IF EXISTS enrollments CASCADE;
--           DROP TABLE IF EXISTS cohorts CASCADE;
--           DROP TYPE IF EXISTS cohort_status;
--           DROP TYPE IF EXISTS enrollment_status;
-- ============================================================================

CREATE TYPE cohort_status AS ENUM ('active', 'completed', 'archived');
CREATE TYPE enrollment_status AS ENUM ('active', 'completed', 'dropped', 'suspended');

-- ============================================================================
-- Cohorts (instances of a course for a group of students)
-- ============================================================================
CREATE TABLE cohorts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,                       -- e.g., "Spring 2026 Cohort"
    description TEXT,
    status cohort_status NOT NULL DEFAULT 'active',
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    max_students INTEGER,
    cloned_from UUID REFERENCES cohorts(id) ON DELETE SET NULL,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cohorts_org ON cohorts(organization_id);
CREATE INDEX idx_cohorts_course ON cohorts(course_id);
CREATE INDEX idx_cohorts_status ON cohorts(organization_id, status);

CREATE TRIGGER trg_cohorts_updated_at
    BEFORE UPDATE ON cohorts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Enrollments (student ↔ cohort relationship)
-- ============================================================================
CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cohort_id UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    enrolled_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    status enrollment_status NOT NULL DEFAULT 'active',
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(cohort_id, user_id)
);

CREATE INDEX idx_enrollments_cohort ON enrollments(cohort_id);
CREATE INDEX idx_enrollments_user ON enrollments(user_id);
CREATE INDEX idx_enrollments_status ON enrollments(cohort_id, status);

COMMENT ON TABLE cohorts IS 'Instances of a course for a specific group of students. Supports cloning lineage tracking.';
COMMENT ON TABLE enrollments IS 'Maps students to cohorts. One enrollment per student per cohort.';
COMMENT ON COLUMN cohorts.cloned_from IS 'References the cohort this was cloned from, enabling lineage tracking.';

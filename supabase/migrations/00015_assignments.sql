-- ============================================================================
-- Migration: 00015_assignments
-- Purpose: Assignment submission & grading system — assignments, submissions,
--          submission files
-- Rollback: DROP TABLE IF EXISTS submission_files CASCADE;
--           DROP TABLE IF EXISTS assignment_submissions CASCADE;
--           DROP TABLE IF EXISTS assignments CASCADE;
--           DROP TYPE IF EXISTS submission_status;
--           DROP TYPE IF EXISTS assignment_status;
-- ============================================================================

SET search_path = vit;

-- Assignment status enum
CREATE TYPE assignment_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE submission_status AS ENUM ('not_started', 'draft', 'submitted', 'graded', 'returned');

-- ============================================================================
-- Assignments (linked to courses, optionally to modules)
-- ============================================================================
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    module_id UUID REFERENCES modules(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,                 -- Rich text (Tiptap HTML)
    instructions TEXT,                -- Rich text
    max_score NUMERIC(6,2) NOT NULL DEFAULT 100,
    weight NUMERIC(5,2) NOT NULL DEFAULT 1.0,  -- Weight in gradebook
    due_date TIMESTAMPTZ,
    allow_late_submissions BOOLEAN NOT NULL DEFAULT false,
    late_penalty_percent NUMERIC(5,2) DEFAULT 0,  -- % deducted per day late
    max_file_size_mb INTEGER NOT NULL DEFAULT 50,
    allowed_file_types TEXT[] DEFAULT ARRAY['pdf', 'doc', 'docx', 'txt', 'zip', 'png', 'jpg'],
    max_attempts INTEGER DEFAULT 1,
    status assignment_status NOT NULL DEFAULT 'draft',
    rubric JSONB,                     -- Optional rubric criteria [{name, description, maxPoints}]
    organization_id UUID NOT NULL REFERENCES organizations(id),
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assignments_course ON assignments(course_id);
CREATE INDEX idx_assignments_org ON assignments(organization_id);
CREATE INDEX idx_assignments_module ON assignments(module_id);

CREATE TRIGGER trg_assignments_updated_at
    BEFORE UPDATE ON assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Assignment Submissions
-- ============================================================================
CREATE TABLE assignment_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id),
    content TEXT,                      -- Text submission content
    submitted_at TIMESTAMPTZ,
    status submission_status NOT NULL DEFAULT 'not_started',
    attempt_number INTEGER NOT NULL DEFAULT 1,
    score NUMERIC(6,2),
    feedback TEXT,                     -- Instructor feedback (rich text)
    graded_by UUID REFERENCES profiles(id),
    graded_at TIMESTAMPTZ,
    late BOOLEAN NOT NULL DEFAULT false,
    late_penalty_applied NUMERIC(5,2) DEFAULT 0,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(assignment_id, student_id, attempt_number)
);

CREATE INDEX idx_submissions_assignment ON assignment_submissions(assignment_id);
CREATE INDEX idx_submissions_student ON assignment_submissions(student_id);
CREATE INDEX idx_submissions_status ON assignment_submissions(status);
CREATE INDEX idx_submissions_org ON assignment_submissions(organization_id);

CREATE TRIGGER trg_assignment_submissions_updated_at
    BEFORE UPDATE ON assignment_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Submission Files (attached to submissions)
-- ============================================================================
CREATE TABLE submission_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,          -- Supabase Storage path
    file_size INTEGER NOT NULL,
    file_type TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_submission_files_submission ON submission_files(submission_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_files ENABLE ROW LEVEL SECURITY;

-- Assignments: admins full CRUD within org
CREATE POLICY assignments_admin_all ON assignments FOR ALL USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Assignments: students can read published assignments in their org
CREATE POLICY assignments_student_read ON assignments FOR SELECT USING (
    status = 'published'
    AND organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
);

-- Submissions: students can manage their own submissions
CREATE POLICY submissions_student_own ON assignment_submissions FOR ALL USING (
    student_id = auth.uid()
);

-- Submissions: admins can manage all submissions in their org
CREATE POLICY submissions_admin_all ON assignment_submissions FOR ALL USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Submission files: same access as parent submission (student owns)
CREATE POLICY files_student_own ON submission_files FOR ALL USING (
    submission_id IN (SELECT id FROM assignment_submissions WHERE student_id = auth.uid())
);

-- Submission files: admins can access files for submissions in their org
CREATE POLICY files_admin_all ON submission_files FOR ALL USING (
    submission_id IN (
        SELECT s.id FROM assignment_submissions s
        JOIN assignments a ON s.assignment_id = a.id
        WHERE a.organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
        AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    )
);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE assignments IS 'Assignment definitions linked to courses. Supports rubrics, late policies, file uploads, and multiple attempts.';
COMMENT ON TABLE assignment_submissions IS 'Student assignment submissions. Tracks status, score, feedback, and late penalties.';
COMMENT ON TABLE submission_files IS 'Files attached to assignment submissions. Stored in Supabase Storage.';

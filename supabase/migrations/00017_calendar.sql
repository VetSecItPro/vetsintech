-- ============================================================================
-- Migration: 00017_calendar
-- Purpose: Calendar & due dates — add due_date to quizzes, create custom
--          calendar_events table for meetings, office hours, etc.
-- Rollback: DROP TABLE IF EXISTS calendar_events CASCADE;
--           ALTER TABLE quizzes DROP COLUMN IF EXISTS due_date;
--           DROP INDEX IF EXISTS idx_quizzes_due_date;
-- ============================================================================

SET search_path = vit;

-- Add due_date to quizzes (assignments already have it from 00015)
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;

-- ============================================================================
-- Calendar Events (custom events: office hours, meetings, deadlines, etc.)
-- ============================================================================
CREATE TABLE calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    event_type TEXT NOT NULL DEFAULT 'custom',  -- 'custom', 'office_hours', 'meeting', 'deadline'
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    all_day BOOLEAN NOT NULL DEFAULT false,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,  -- null = org-wide
    cohort_id UUID REFERENCES cohorts(id) ON DELETE SET NULL,
    color TEXT DEFAULT '#3b82f6',  -- hex color for calendar display
    recurring BOOLEAN NOT NULL DEFAULT false,
    recurrence_rule TEXT,  -- iCal RRULE format if recurring
    organization_id UUID NOT NULL REFERENCES organizations(id),
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_calendar_events_org ON calendar_events(organization_id);
CREATE INDEX idx_calendar_events_course ON calendar_events(course_id);
CREATE INDEX idx_calendar_events_start ON calendar_events(start_time);
CREATE INDEX idx_quizzes_due_date ON quizzes(due_date);

CREATE TRIGGER trg_calendar_events_updated_at
    BEFORE UPDATE ON calendar_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Admins: full CRUD within their organization
CREATE POLICY ce_admin_all ON calendar_events FOR ALL USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Students: read-only within their organization
CREATE POLICY ce_student_read ON calendar_events FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE calendar_events IS 'Custom calendar events for organizations. Supports meetings, office hours, deadlines, and recurring events.';

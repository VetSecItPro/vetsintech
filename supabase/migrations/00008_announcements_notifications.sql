-- ============================================================================
-- Migration: 00008_announcements_notifications
-- Purpose: Broadcast announcements + per-user notification system
-- Rollback: DROP TABLE IF EXISTS notifications CASCADE;
--           DROP TABLE IF EXISTS announcements CASCADE;
--           DROP TYPE IF EXISTS notification_type;
-- ============================================================================

CREATE TYPE notification_type AS ENUM (
    'announcement',
    'discussion_reply',
    'quiz_graded',
    'enrollment',
    'course_completed',
    'certificate_issued',
    'mention',
    'cohort_update'
);

-- ============================================================================
-- Announcements (admin/instructor broadcast to cohort or org)
-- ============================================================================
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    cohort_id UUID REFERENCES cohorts(id) ON DELETE CASCADE,  -- NULL = org-wide
    title TEXT NOT NULL,
    body JSONB NOT NULL,                         -- Tiptap JSON
    author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    is_published BOOLEAN NOT NULL DEFAULT false,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_announcements_org ON announcements(organization_id);
CREATE INDEX idx_announcements_cohort ON announcements(cohort_id);
CREATE INDEX idx_announcements_published ON announcements(organization_id, is_published, published_at DESC);

CREATE TRIGGER trg_announcements_updated_at
    BEFORE UPDATE ON announcements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Notifications (per-user notification queue)
-- ============================================================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    link TEXT,                                   -- Deep link to relevant page
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',                 -- Type-specific payload
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(user_id, type);

COMMENT ON TABLE announcements IS 'Admin/instructor announcements. Can target a cohort or the entire organization.';
COMMENT ON TABLE notifications IS 'Per-user notification queue. Supports deep linking and read tracking.';

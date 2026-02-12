-- ============================================================================
-- Migration: 00021_email_preferences
-- Purpose: Email notification preferences + email audit log for Resend integration
-- Rollback: DROP TABLE IF EXISTS email_log CASCADE;
--           DROP TABLE IF EXISTS email_preferences CASCADE;
-- ============================================================================

SET search_path = vit;

-- ============================================================================
-- Email Preferences (per-user opt-in/out for each email category)
-- ============================================================================
CREATE TABLE email_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    announcement_emails BOOLEAN NOT NULL DEFAULT true,
    grade_emails BOOLEAN NOT NULL DEFAULT true,
    assignment_reminder_emails BOOLEAN NOT NULL DEFAULT true,
    enrollment_emails BOOLEAN NOT NULL DEFAULT true,
    discussion_reply_emails BOOLEAN NOT NULL DEFAULT false,
    weekly_digest BOOLEAN NOT NULL DEFAULT true,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id)
);

CREATE INDEX idx_email_prefs_user ON email_preferences(user_id);

CREATE TRIGGER trg_email_prefs_updated_at
    BEFORE UPDATE ON email_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Email Log (audit trail for all transactional emails sent via Resend)
-- ============================================================================
CREATE TABLE email_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    to_email TEXT NOT NULL,
    to_user_id UUID REFERENCES profiles(id),
    subject TEXT NOT NULL,
    template TEXT NOT NULL,             -- template name e.g. 'announcement', 'grade-posted'
    resend_id TEXT,                     -- Resend API message ID for delivery tracking
    status TEXT NOT NULL DEFAULT 'sent',  -- sent, delivered, bounced, failed
    error_message TEXT,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_log_user ON email_log(to_user_id);
CREATE INDEX idx_email_log_created ON email_log(created_at);

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

-- Users can manage their own email preferences
CREATE POLICY email_prefs_own ON email_preferences
    FOR ALL USING (user_id = auth.uid());

-- Admins can view email preferences in their organization
CREATE POLICY email_prefs_admin ON email_preferences
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
        AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

-- Admins can view/manage email logs in their organization
CREATE POLICY email_log_admin ON email_log
    FOR ALL USING (
        organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
        AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

COMMENT ON TABLE email_preferences IS 'Per-user email notification preferences. Controls which transactional emails are sent.';
COMMENT ON TABLE email_log IS 'Audit log for all transactional emails sent via Resend. Tracks delivery status.';

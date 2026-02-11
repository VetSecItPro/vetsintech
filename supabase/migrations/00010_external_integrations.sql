-- ============================================================================
-- Migration: 00010_external_integrations
-- Purpose: External learning platform integration (Coursera, Pluralsight, Udemy)
-- Rollback: DROP TABLE IF EXISTS external_progress CASCADE;
--           DROP TABLE IF EXISTS external_enrollments CASCADE;
--           DROP TABLE IF EXISTS external_platform_configs CASCADE;
--           DROP TYPE IF EXISTS external_platform;
--           DROP TYPE IF EXISTS sync_status;
-- ============================================================================

CREATE TYPE external_platform AS ENUM ('coursera', 'pluralsight', 'udemy');
CREATE TYPE sync_status AS ENUM ('idle', 'syncing', 'success', 'error');

-- ============================================================================
-- Platform Configurations (API credentials + sync settings per org)
-- ============================================================================
CREATE TABLE external_platform_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    platform external_platform NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT false,
    credentials JSONB NOT NULL DEFAULT '{}',      -- API keys/tokens (encrypted at rest by Supabase)
    sync_frequency_minutes INTEGER NOT NULL DEFAULT 1440,  -- Default: daily
    last_synced_at TIMESTAMPTZ,
    sync_status sync_status NOT NULL DEFAULT 'idle',
    sync_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, platform)
);

CREATE INDEX idx_ext_configs_org ON external_platform_configs(organization_id);

CREATE TRIGGER trg_ext_configs_updated_at
    BEFORE UPDATE ON external_platform_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- External Enrollments (student ↔ external course mapping)
-- ============================================================================
CREATE TABLE external_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    platform external_platform NOT NULL,
    external_course_id TEXT NOT NULL,
    external_course_title TEXT NOT NULL,
    enrolled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, platform, external_course_id)
);

CREATE INDEX idx_ext_enrollments_org ON external_enrollments(organization_id);
CREATE INDEX idx_ext_enrollments_user ON external_enrollments(user_id);
CREATE INDEX idx_ext_enrollments_platform ON external_enrollments(platform);

CREATE TRIGGER trg_ext_enrollments_updated_at
    BEFORE UPDATE ON external_enrollments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- External Progress (synced progress from external platforms)
-- ============================================================================
CREATE TABLE external_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_enrollment_id UUID NOT NULL REFERENCES external_enrollments(id) ON DELETE CASCADE,
    progress_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'in_progress',  -- in_progress, completed
    completed_at TIMESTAMPTZ,
    time_spent_minutes INTEGER,
    last_activity_at TIMESTAMPTZ,
    raw_data JSONB DEFAULT '{}',                  -- Platform-specific raw API response
    synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ext_progress_enrollment ON external_progress(external_enrollment_id);

CREATE TRIGGER trg_ext_progress_updated_at
    BEFORE UPDATE ON external_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE external_platform_configs IS 'API credentials and sync configuration for external learning platforms.';
COMMENT ON TABLE external_enrollments IS 'Maps students to courses on external platforms (Coursera, Pluralsight, Udemy).';
COMMENT ON TABLE external_progress IS 'Synced progress data from external platforms. raw_data preserves the original API response.';
COMMENT ON COLUMN external_platform_configs.credentials IS 'API keys/tokens. Stored as JSONB. Structure varies by platform (OAuth tokens, API keys, etc.).';

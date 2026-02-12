-- ============================================================================
-- Migration: 00019_gamification
-- Purpose: Gamification system — badges, XP events, streaks, leaderboard
-- Rollback: DROP TABLE IF EXISTS streaks CASCADE;
--           DROP TABLE IF EXISTS xp_events CASCADE;
--           DROP TABLE IF EXISTS user_badges CASCADE;
--           DROP TABLE IF EXISTS badges CASCADE;
--           DROP TYPE IF EXISTS xp_event_type;
--           DROP TYPE IF EXISTS badge_rarity;
-- ============================================================================

SET search_path = vit;

CREATE TYPE badge_rarity AS ENUM ('common', 'uncommon', 'rare', 'epic', 'legendary');
CREATE TYPE xp_event_type AS ENUM (
    'lesson_complete', 'course_complete', 'quiz_pass', 'quiz_perfect',
    'assignment_submit', 'first_post', 'helpful_reply', 'streak_milestone',
    'badge_earned', 'path_complete', 'login_streak'
);

-- ============================================================================
-- Badges (definitions — what badges exist for an org)
-- ============================================================================
CREATE TABLE badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,  -- emoji or icon name
    rarity badge_rarity NOT NULL DEFAULT 'common',
    xp_reward INTEGER NOT NULL DEFAULT 0,
    criteria JSONB NOT NULL,  -- {type: 'lessons_completed', threshold: 10} etc.
    organization_id UUID NOT NULL REFERENCES organizations(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_badges_org ON badges(organization_id);

-- ============================================================================
-- User Badges (which users have earned which badges)
-- ============================================================================
CREATE TABLE user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, badge_id)
);

CREATE INDEX idx_user_badges_user ON user_badges(user_id);

-- ============================================================================
-- XP Events (every XP-earning action is logged)
-- ============================================================================
CREATE TABLE xp_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    event_type xp_event_type NOT NULL,
    xp_amount INTEGER NOT NULL,
    source_id UUID,  -- ID of the lesson/quiz/assignment that triggered it
    source_type TEXT,  -- 'lesson', 'quiz', 'assignment', 'discussion', etc.
    description TEXT,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_xp_events_user ON xp_events(user_id);
CREATE INDEX idx_xp_events_org ON xp_events(organization_id);
CREATE INDEX idx_xp_events_created ON xp_events(created_at);

-- ============================================================================
-- Streaks (daily activity tracking per user per org)
-- ============================================================================
CREATE TABLE streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    last_activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, organization_id)
);

CREATE INDEX idx_streaks_user ON streaks(user_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;

-- Badges: any org member can read; admins can manage
CREATE POLICY badges_read ON badges FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY badges_admin ON badges FOR ALL USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- User Badges: users see own; admins see all in org
CREATE POLICY user_badges_own ON user_badges FOR SELECT USING (user_id = auth.uid());
CREATE POLICY user_badges_admin ON user_badges FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- XP Events: users see own; admins see all in org
CREATE POLICY xp_events_own ON xp_events FOR SELECT USING (user_id = auth.uid());
CREATE POLICY xp_events_admin ON xp_events FOR ALL USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Streaks: users manage own; admins can read all in org
CREATE POLICY streaks_own ON streaks FOR ALL USING (user_id = auth.uid());
CREATE POLICY streaks_admin ON streaks FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE badges IS 'Badge definitions for an organization. Criteria stored as JSONB for flexible badge unlock conditions.';
COMMENT ON TABLE user_badges IS 'Junction table tracking which badges each user has earned.';
COMMENT ON TABLE xp_events IS 'Append-only log of every XP-earning event. Summing xp_amount per user gives total XP.';
COMMENT ON TABLE streaks IS 'Daily activity streak tracking per user per organization.';

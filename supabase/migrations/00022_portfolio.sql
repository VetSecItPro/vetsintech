-- ============================================================================
-- Migration: 00022_portfolio
-- Purpose: Student portfolio/profile — public-facing portfolio with projects,
--          skills, military info, and social links for job-seeking veterans.
-- Rollback: ALTER TABLE profiles DROP COLUMN IF EXISTS username;
--           ALTER TABLE profiles DROP COLUMN IF EXISTS headline;
--           ALTER TABLE profiles DROP COLUMN IF EXISTS portfolio_public;
--           ALTER TABLE profiles DROP COLUMN IF EXISTS linkedin_url;
--           ALTER TABLE profiles DROP COLUMN IF EXISTS github_url;
--           ALTER TABLE profiles DROP COLUMN IF EXISTS website_url;
--           ALTER TABLE profiles DROP COLUMN IF EXISTS skills;
--           ALTER TABLE profiles DROP COLUMN IF EXISTS military_branch;
--           ALTER TABLE profiles DROP COLUMN IF EXISTS military_mos;
--           DROP TABLE IF EXISTS portfolio_items CASCADE;
-- ============================================================================

SET search_path = vit;

-- Add portfolio fields to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS headline TEXT;  -- "Cybersecurity Analyst | U.S. Army Veteran"
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS portfolio_public BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS github_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS military_branch TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS military_mos TEXT;  -- Military Occupational Specialty

-- Portfolio items (projects, achievements, work samples)
CREATE TABLE portfolio_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    item_type TEXT NOT NULL DEFAULT 'project',  -- 'project', 'achievement', 'work_sample', 'certification'
    url TEXT,  -- link to project, GitHub repo, etc.
    image_url TEXT,  -- screenshot or thumbnail
    skills_used TEXT[] DEFAULT '{}',
    visible BOOLEAN NOT NULL DEFAULT true,
    position INTEGER NOT NULL DEFAULT 0,  -- display order
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_portfolio_items_user ON portfolio_items(user_id);
CREATE INDEX idx_portfolio_items_position ON portfolio_items(user_id, position);
CREATE INDEX idx_profiles_username ON profiles(username);

-- Auto-update trigger for portfolio_items
CREATE TRIGGER trg_portfolio_items_updated_at
    BEFORE UPDATE ON portfolio_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;

-- Owner can do everything with their own items
CREATE POLICY pi_own ON portfolio_items FOR ALL USING (user_id = auth.uid());

-- Public can read visible items from public portfolios
CREATE POLICY pi_public_read ON portfolio_items FOR SELECT USING (
    visible = true AND user_id IN (SELECT id FROM profiles WHERE portfolio_public = true)
);

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON COLUMN profiles.username IS 'Unique URL-safe username for public portfolio (e.g., /portfolio/john-doe)';
COMMENT ON COLUMN profiles.headline IS 'Professional headline displayed on public portfolio (e.g., "Cybersecurity Analyst | U.S. Army Veteran")';
COMMENT ON COLUMN profiles.portfolio_public IS 'Whether the portfolio is publicly visible';
COMMENT ON COLUMN profiles.skills IS 'Array of skill tags for the portfolio skills section';
COMMENT ON COLUMN profiles.military_branch IS 'Military branch of service';
COMMENT ON COLUMN profiles.military_mos IS 'Military Occupational Specialty code/title';
COMMENT ON TABLE portfolio_items IS 'User-managed portfolio items — projects, achievements, work samples displayed on public portfolio.';

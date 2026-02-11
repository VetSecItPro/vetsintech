-- ============================================================================
-- Migration: 00007_discussions
-- Purpose: Community discussion boards with threaded replies and reactions
-- Rollback: DROP TRIGGER IF EXISTS trg_update_discussion_reply_count ON discussion_posts;
--           DROP FUNCTION IF EXISTS update_discussion_reply_count();
--           DROP TABLE IF EXISTS post_reactions CASCADE;
--           DROP TABLE IF EXISTS discussion_posts CASCADE;
--           DROP TABLE IF EXISTS discussions CASCADE;
-- ============================================================================

-- ============================================================================
-- Discussions (threads — can be per-cohort or org-wide)
-- ============================================================================
CREATE TABLE discussions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    cohort_id UUID REFERENCES cohorts(id) ON DELETE CASCADE,  -- NULL = org-wide
    title TEXT NOT NULL,
    body JSONB,                                  -- Tiptap JSON for rich text
    author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    is_locked BOOLEAN NOT NULL DEFAULT false,
    reply_count INTEGER NOT NULL DEFAULT 0,
    last_reply_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_discussions_org ON discussions(organization_id);
CREATE INDEX idx_discussions_cohort ON discussions(cohort_id);
CREATE INDEX idx_discussions_author ON discussions(author_id);
CREATE INDEX idx_discussions_pinned ON discussions(organization_id, is_pinned DESC, last_reply_at DESC NULLS LAST);

CREATE TRIGGER trg_discussions_updated_at
    BEFORE UPDATE ON discussions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Discussion Posts (replies, supports nesting via parent_post_id)
-- ============================================================================
CREATE TABLE discussion_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discussion_id UUID NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
    parent_post_id UUID REFERENCES discussion_posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    body JSONB NOT NULL,                         -- Tiptap JSON
    upvote_count INTEGER NOT NULL DEFAULT 0,
    is_answer BOOLEAN NOT NULL DEFAULT false,    -- Marked as accepted answer
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_discussion_posts_discussion ON discussion_posts(discussion_id);
CREATE INDEX idx_discussion_posts_parent ON discussion_posts(parent_post_id);
CREATE INDEX idx_discussion_posts_author ON discussion_posts(author_id);

CREATE TRIGGER trg_discussion_posts_updated_at
    BEFORE UPDATE ON discussion_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Post Reactions (upvotes, etc.)
-- ============================================================================
CREATE TABLE post_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES discussion_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reaction_type TEXT NOT NULL DEFAULT 'upvote',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(post_id, user_id, reaction_type)
);

CREATE INDEX idx_post_reactions_post ON post_reactions(post_id);
CREATE INDEX idx_post_reactions_user ON post_reactions(user_id);

-- ============================================================================
-- Trigger: Auto-update reply_count and last_reply_at on discussions
-- ============================================================================
CREATE OR REPLACE FUNCTION update_discussion_reply_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE discussions
    SET reply_count = (
            SELECT COUNT(*) FROM discussion_posts WHERE discussion_id = NEW.discussion_id
        ),
        last_reply_at = now()
    WHERE id = NEW.discussion_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_update_discussion_reply_count
    AFTER INSERT ON discussion_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_discussion_reply_count();

-- ============================================================================
-- Trigger: Auto-update upvote_count on discussion_posts
-- ============================================================================
CREATE OR REPLACE FUNCTION update_post_upvote_count()
RETURNS TRIGGER AS $$
DECLARE
    _post_id UUID;
BEGIN
    _post_id := COALESCE(NEW.post_id, OLD.post_id);
    UPDATE discussion_posts
    SET upvote_count = (
        SELECT COUNT(*) FROM post_reactions
        WHERE post_id = _post_id AND reaction_type = 'upvote'
    )
    WHERE id = _post_id;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_update_post_upvote_count
    AFTER INSERT OR DELETE ON post_reactions
    FOR EACH ROW
    EXECUTE FUNCTION update_post_upvote_count();

COMMENT ON TABLE discussions IS 'Discussion threads. Can be scoped to a cohort or org-wide (cohort_id = NULL).';
COMMENT ON TABLE discussion_posts IS 'Replies within a discussion. Supports nesting via parent_post_id.';
COMMENT ON TABLE post_reactions IS 'Reactions on posts. Unique per user per post per reaction type.';

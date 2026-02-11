-- ============================================================================
-- VetsInTech EdTech Platform — Isolated Schema Setup
-- ============================================================================
-- Target: Supabase project kczalkwswjehvkauvpwm (actnow-education)
-- Schema: vit (completely isolated from public schema)
--
-- PREREQUISITES:
--   1. Run this SQL in the Supabase SQL Editor
--   2. After running, go to Settings → API → "Exposed schemas" → add "vit"
--   3. Grant PostgREST access (done automatically in this script via GRANT)
--
-- ROLLBACK:
--   DROP SCHEMA IF EXISTS vit CASCADE;
-- ============================================================================

-- ============================================================================
-- 1. CREATE SCHEMA
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS vit;

-- Grant usage to PostgREST roles (anon + authenticated)
GRANT USAGE ON SCHEMA vit TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA vit TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA vit TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA vit TO anon, authenticated, service_role;

-- Ensure future objects get the same grants
ALTER DEFAULT PRIVILEGES IN SCHEMA vit
    GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA vit
    GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA vit
    GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- ============================================================================
-- 2. ENUMS (created in vit schema to avoid conflicts with public enums)
-- ============================================================================
CREATE TYPE vit.user_role AS ENUM ('admin', 'instructor', 'student');
CREATE TYPE vit.course_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE vit.lesson_type AS ENUM ('text', 'video', 'quiz', 'assignment', 'resource');
CREATE TYPE vit.cohort_status AS ENUM ('active', 'completed', 'archived');
CREATE TYPE vit.enrollment_status AS ENUM ('active', 'completed', 'dropped', 'suspended');
CREATE TYPE vit.question_type AS ENUM ('multiple_choice', 'true_false', 'short_answer');
CREATE TYPE vit.notification_type AS ENUM (
    'announcement', 'discussion_reply', 'quiz_graded', 'enrollment',
    'course_completed', 'certificate_issued', 'mention', 'cohort_update'
);
CREATE TYPE vit.external_platform AS ENUM ('coursera', 'pluralsight', 'udemy');
CREATE TYPE vit.sync_status AS ENUM ('idle', 'syncing', 'success', 'error');

-- ============================================================================
-- 3. HELPER FUNCTIONS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION vit.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Check if user has a role in an organization
CREATE OR REPLACE FUNCTION vit.user_has_role(
    _user_id UUID,
    _organization_id UUID,
    _role vit.user_role
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM vit.user_roles
        WHERE user_id = _user_id
          AND organization_id = _organization_id
          AND role = _role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = vit;

-- Get user's organization_id
CREATE OR REPLACE FUNCTION vit.get_user_organization_id(_user_id UUID)
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT organization_id FROM vit.profiles WHERE id = _user_id LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = vit;

-- ============================================================================
-- 4. TABLES
-- ============================================================================

-- 4.1 Organizations (multi-tenant root)
CREATE TABLE vit.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vit_organizations_slug ON vit.organizations(slug);

CREATE TRIGGER trg_vit_organizations_updated_at
    BEFORE UPDATE ON vit.organizations
    FOR EACH ROW EXECUTE FUNCTION vit.update_updated_at_column();

-- 4.2 Profiles (extends auth.users)
CREATE TABLE vit.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES vit.organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    phone TEXT,
    timezone TEXT NOT NULL DEFAULT 'America/New_York',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vit_profiles_organization ON vit.profiles(organization_id);
CREATE INDEX idx_vit_profiles_email ON vit.profiles(email);
CREATE INDEX idx_vit_profiles_active ON vit.profiles(organization_id, is_active);

CREATE TRIGGER trg_vit_profiles_updated_at
    BEFORE UPDATE ON vit.profiles
    FOR EACH ROW EXECUTE FUNCTION vit.update_updated_at_column();

-- 4.3 User Roles
CREATE TABLE vit.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES vit.profiles(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES vit.organizations(id) ON DELETE CASCADE,
    role vit.user_role NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, organization_id, role)
);

CREATE INDEX idx_vit_user_roles_user ON vit.user_roles(user_id);
CREATE INDEX idx_vit_user_roles_org_role ON vit.user_roles(organization_id, role);

-- 4.4 Courses
CREATE TABLE vit.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES vit.organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    category TEXT,
    tags JSONB DEFAULT '[]',
    prerequisites JSONB DEFAULT '[]',
    status vit.course_status NOT NULL DEFAULT 'draft',
    created_by UUID REFERENCES vit.profiles(id) ON DELETE SET NULL,
    estimated_duration_minutes INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, slug)
);

CREATE INDEX idx_vit_courses_org ON vit.courses(organization_id);
CREATE INDEX idx_vit_courses_status ON vit.courses(organization_id, status);
CREATE INDEX idx_vit_courses_slug ON vit.courses(organization_id, slug);
CREATE INDEX idx_vit_courses_category ON vit.courses(organization_id, category);

CREATE TRIGGER trg_vit_courses_updated_at
    BEFORE UPDATE ON vit.courses
    FOR EACH ROW EXECUTE FUNCTION vit.update_updated_at_column();

-- 4.5 Modules
CREATE TABLE vit.modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES vit.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_required BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vit_modules_course ON vit.modules(course_id);
CREATE INDEX idx_vit_modules_order ON vit.modules(course_id, sort_order);

CREATE TRIGGER trg_vit_modules_updated_at
    BEFORE UPDATE ON vit.modules
    FOR EACH ROW EXECUTE FUNCTION vit.update_updated_at_column();

-- 4.6 Lessons
CREATE TABLE vit.lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES vit.modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    lesson_type vit.lesson_type NOT NULL DEFAULT 'text',
    content JSONB,
    video_url TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    estimated_duration_minutes INTEGER,
    is_required BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vit_lessons_module ON vit.lessons(module_id);
CREATE INDEX idx_vit_lessons_order ON vit.lessons(module_id, sort_order);
CREATE INDEX idx_vit_lessons_type ON vit.lessons(lesson_type);

CREATE TRIGGER trg_vit_lessons_updated_at
    BEFORE UPDATE ON vit.lessons
    FOR EACH ROW EXECUTE FUNCTION vit.update_updated_at_column();

-- 4.7 Cohorts
CREATE TABLE vit.cohorts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES vit.organizations(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES vit.courses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status vit.cohort_status NOT NULL DEFAULT 'active',
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    max_students INTEGER,
    cloned_from UUID REFERENCES vit.cohorts(id) ON DELETE SET NULL,
    created_by UUID REFERENCES vit.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vit_cohorts_org ON vit.cohorts(organization_id);
CREATE INDEX idx_vit_cohorts_course ON vit.cohorts(course_id);
CREATE INDEX idx_vit_cohorts_status ON vit.cohorts(organization_id, status);

CREATE TRIGGER trg_vit_cohorts_updated_at
    BEFORE UPDATE ON vit.cohorts
    FOR EACH ROW EXECUTE FUNCTION vit.update_updated_at_column();

-- 4.8 Enrollments
CREATE TABLE vit.enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cohort_id UUID NOT NULL REFERENCES vit.cohorts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES vit.profiles(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    enrolled_by UUID REFERENCES vit.profiles(id) ON DELETE SET NULL,
    status vit.enrollment_status NOT NULL DEFAULT 'active',
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(cohort_id, user_id)
);

CREATE INDEX idx_vit_enrollments_cohort ON vit.enrollments(cohort_id);
CREATE INDEX idx_vit_enrollments_user ON vit.enrollments(user_id);
CREATE INDEX idx_vit_enrollments_status ON vit.enrollments(cohort_id, status);

-- 4.9 Lesson Completions
CREATE TABLE vit.lesson_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES vit.profiles(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES vit.lessons(id) ON DELETE CASCADE,
    cohort_id UUID NOT NULL REFERENCES vit.cohorts(id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    time_spent_seconds INTEGER DEFAULT 0,
    UNIQUE(user_id, lesson_id, cohort_id)
);

CREATE INDEX idx_vit_lesson_completions_user_cohort ON vit.lesson_completions(user_id, cohort_id);
CREATE INDEX idx_vit_lesson_completions_lesson ON vit.lesson_completions(lesson_id);

-- 4.10 Course Progress (aggregate)
CREATE TABLE vit.course_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES vit.profiles(id) ON DELETE CASCADE,
    cohort_id UUID NOT NULL REFERENCES vit.cohorts(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES vit.courses(id) ON DELETE CASCADE,
    total_lessons INTEGER NOT NULL DEFAULT 0,
    completed_lessons INTEGER NOT NULL DEFAULT 0,
    progress_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    last_lesson_id UUID REFERENCES vit.lessons(id) ON DELETE SET NULL,
    last_activity_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, cohort_id)
);

CREATE INDEX idx_vit_course_progress_user ON vit.course_progress(user_id);
CREATE INDEX idx_vit_course_progress_cohort ON vit.course_progress(cohort_id);
CREATE INDEX idx_vit_course_progress_course ON vit.course_progress(course_id);

-- 4.11 Quizzes
CREATE TABLE vit.quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES vit.lessons(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    passing_score DECIMAL(5,2) NOT NULL DEFAULT 70.00,
    max_attempts INTEGER DEFAULT 3,
    time_limit_minutes INTEGER,
    shuffle_questions BOOLEAN NOT NULL DEFAULT false,
    show_correct_answers BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vit_quizzes_lesson ON vit.quizzes(lesson_id);

CREATE TRIGGER trg_vit_quizzes_updated_at
    BEFORE UPDATE ON vit.quizzes
    FOR EACH ROW EXECUTE FUNCTION vit.update_updated_at_column();

-- 4.12 Quiz Questions
CREATE TABLE vit.quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES vit.quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type vit.question_type NOT NULL,
    points DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    sort_order INTEGER NOT NULL DEFAULT 0,
    explanation TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vit_quiz_questions_quiz ON vit.quiz_questions(quiz_id);
CREATE INDEX idx_vit_quiz_questions_order ON vit.quiz_questions(quiz_id, sort_order);

-- 4.13 Quiz Options
CREATE TABLE vit.quiz_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES vit.quiz_questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_vit_quiz_options_question ON vit.quiz_options(question_id);

-- 4.14 Quiz Attempts
CREATE TABLE vit.quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES vit.quizzes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES vit.profiles(id) ON DELETE CASCADE,
    cohort_id UUID NOT NULL REFERENCES vit.cohorts(id) ON DELETE CASCADE,
    score DECIMAL(5,2),
    passed BOOLEAN,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    time_spent_seconds INTEGER
);

CREATE INDEX idx_vit_quiz_attempts_quiz ON vit.quiz_attempts(quiz_id);
CREATE INDEX idx_vit_quiz_attempts_user ON vit.quiz_attempts(user_id);
CREATE INDEX idx_vit_quiz_attempts_user_quiz ON vit.quiz_attempts(user_id, quiz_id, cohort_id);

-- 4.15 Quiz Answers
CREATE TABLE vit.quiz_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES vit.quiz_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES vit.quiz_questions(id) ON DELETE CASCADE,
    selected_option_id UUID REFERENCES vit.quiz_options(id) ON DELETE SET NULL,
    text_answer TEXT,
    is_correct BOOLEAN,
    points_earned DECIMAL(5,2) NOT NULL DEFAULT 0
);

CREATE INDEX idx_vit_quiz_answers_attempt ON vit.quiz_answers(attempt_id);

-- 4.16 Discussions
CREATE TABLE vit.discussions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES vit.organizations(id) ON DELETE CASCADE,
    cohort_id UUID REFERENCES vit.cohorts(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body JSONB,
    author_id UUID NOT NULL REFERENCES vit.profiles(id) ON DELETE CASCADE,
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    is_locked BOOLEAN NOT NULL DEFAULT false,
    reply_count INTEGER NOT NULL DEFAULT 0,
    last_reply_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vit_discussions_org ON vit.discussions(organization_id);
CREATE INDEX idx_vit_discussions_cohort ON vit.discussions(cohort_id);
CREATE INDEX idx_vit_discussions_author ON vit.discussions(author_id);
CREATE INDEX idx_vit_discussions_pinned ON vit.discussions(organization_id, is_pinned DESC, last_reply_at DESC NULLS LAST);

CREATE TRIGGER trg_vit_discussions_updated_at
    BEFORE UPDATE ON vit.discussions
    FOR EACH ROW EXECUTE FUNCTION vit.update_updated_at_column();

-- 4.17 Discussion Posts
CREATE TABLE vit.discussion_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discussion_id UUID NOT NULL REFERENCES vit.discussions(id) ON DELETE CASCADE,
    parent_post_id UUID REFERENCES vit.discussion_posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES vit.profiles(id) ON DELETE CASCADE,
    body JSONB NOT NULL,
    upvote_count INTEGER NOT NULL DEFAULT 0,
    is_answer BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vit_discussion_posts_discussion ON vit.discussion_posts(discussion_id);
CREATE INDEX idx_vit_discussion_posts_parent ON vit.discussion_posts(parent_post_id);
CREATE INDEX idx_vit_discussion_posts_author ON vit.discussion_posts(author_id);

CREATE TRIGGER trg_vit_discussion_posts_updated_at
    BEFORE UPDATE ON vit.discussion_posts
    FOR EACH ROW EXECUTE FUNCTION vit.update_updated_at_column();

-- 4.18 Post Reactions
CREATE TABLE vit.post_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES vit.discussion_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES vit.profiles(id) ON DELETE CASCADE,
    reaction_type TEXT NOT NULL DEFAULT 'upvote',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(post_id, user_id, reaction_type)
);

CREATE INDEX idx_vit_post_reactions_post ON vit.post_reactions(post_id);
CREATE INDEX idx_vit_post_reactions_user ON vit.post_reactions(user_id);

-- 4.19 Announcements
CREATE TABLE vit.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES vit.organizations(id) ON DELETE CASCADE,
    cohort_id UUID REFERENCES vit.cohorts(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body JSONB NOT NULL,
    author_id UUID NOT NULL REFERENCES vit.profiles(id) ON DELETE CASCADE,
    is_published BOOLEAN NOT NULL DEFAULT false,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vit_announcements_org ON vit.announcements(organization_id);
CREATE INDEX idx_vit_announcements_cohort ON vit.announcements(cohort_id);
CREATE INDEX idx_vit_announcements_published ON vit.announcements(organization_id, is_published, published_at DESC);

CREATE TRIGGER trg_vit_announcements_updated_at
    BEFORE UPDATE ON vit.announcements
    FOR EACH ROW EXECUTE FUNCTION vit.update_updated_at_column();

-- 4.20 Notifications
CREATE TABLE vit.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES vit.profiles(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES vit.organizations(id) ON DELETE CASCADE,
    type vit.notification_type NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    link TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vit_notifications_user ON vit.notifications(user_id);
CREATE INDEX idx_vit_notifications_unread ON vit.notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_vit_notifications_type ON vit.notifications(user_id, type);

-- 4.21 Certificates
CREATE TABLE vit.certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES vit.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES vit.profiles(id) ON DELETE CASCADE,
    cohort_id UUID NOT NULL REFERENCES vit.cohorts(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES vit.courses(id) ON DELETE CASCADE,
    certificate_number TEXT NOT NULL UNIQUE,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    pdf_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vit_certificates_user ON vit.certificates(user_id);
CREATE INDEX idx_vit_certificates_org ON vit.certificates(organization_id);
CREATE INDEX idx_vit_certificates_number ON vit.certificates(certificate_number);
CREATE INDEX idx_vit_certificates_course ON vit.certificates(course_id);

-- 4.22 External Platform Configs
CREATE TABLE vit.external_platform_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES vit.organizations(id) ON DELETE CASCADE,
    platform vit.external_platform NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT false,
    credentials JSONB NOT NULL DEFAULT '{}',
    sync_frequency_minutes INTEGER NOT NULL DEFAULT 1440,
    last_synced_at TIMESTAMPTZ,
    sync_status vit.sync_status NOT NULL DEFAULT 'idle',
    sync_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, platform)
);

CREATE INDEX idx_vit_ext_configs_org ON vit.external_platform_configs(organization_id);

CREATE TRIGGER trg_vit_ext_configs_updated_at
    BEFORE UPDATE ON vit.external_platform_configs
    FOR EACH ROW EXECUTE FUNCTION vit.update_updated_at_column();

-- 4.23 External Enrollments
CREATE TABLE vit.external_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES vit.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES vit.profiles(id) ON DELETE CASCADE,
    platform vit.external_platform NOT NULL,
    external_course_id TEXT NOT NULL,
    external_course_title TEXT NOT NULL,
    enrolled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, platform, external_course_id)
);

CREATE INDEX idx_vit_ext_enrollments_org ON vit.external_enrollments(organization_id);
CREATE INDEX idx_vit_ext_enrollments_user ON vit.external_enrollments(user_id);
CREATE INDEX idx_vit_ext_enrollments_platform ON vit.external_enrollments(platform);

CREATE TRIGGER trg_vit_ext_enrollments_updated_at
    BEFORE UPDATE ON vit.external_enrollments
    FOR EACH ROW EXECUTE FUNCTION vit.update_updated_at_column();

-- 4.24 External Progress
CREATE TABLE vit.external_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_enrollment_id UUID NOT NULL REFERENCES vit.external_enrollments(id) ON DELETE CASCADE,
    progress_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'in_progress',
    completed_at TIMESTAMPTZ,
    time_spent_minutes INTEGER,
    last_activity_at TIMESTAMPTZ,
    raw_data JSONB DEFAULT '{}',
    synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vit_ext_progress_enrollment ON vit.external_progress(external_enrollment_id);

CREATE TRIGGER trg_vit_ext_progress_updated_at
    BEFORE UPDATE ON vit.external_progress
    FOR EACH ROW EXECUTE FUNCTION vit.update_updated_at_column();

-- 4.25 Course Files
CREATE TABLE vit.course_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES vit.organizations(id) ON DELETE CASCADE,
    course_id UUID REFERENCES vit.courses(id) ON DELETE SET NULL,
    uploaded_by UUID NOT NULL REFERENCES vit.profiles(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    storage_path TEXT NOT NULL,
    thumbnail_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vit_course_files_org ON vit.course_files(organization_id);
CREATE INDEX idx_vit_course_files_course ON vit.course_files(course_id);
CREATE INDEX idx_vit_course_files_uploaded_by ON vit.course_files(uploaded_by);

-- ============================================================================
-- 5. TRIGGER FUNCTIONS
-- ============================================================================

-- Auto-update course_progress when a lesson is completed
CREATE OR REPLACE FUNCTION vit.update_course_progress()
RETURNS TRIGGER AS $$
DECLARE
    _course_id UUID;
    _total INTEGER;
    _completed INTEGER;
    _pct DECIMAL(5,2);
BEGIN
    SELECT c.id INTO _course_id
    FROM vit.lessons l
    JOIN vit.modules m ON l.module_id = m.id
    JOIN vit.courses c ON m.course_id = c.id
    WHERE l.id = NEW.lesson_id;

    SELECT COUNT(*) INTO _total
    FROM vit.lessons l
    JOIN vit.modules m ON l.module_id = m.id
    WHERE m.course_id = _course_id AND l.is_required = true;

    SELECT COUNT(*) INTO _completed
    FROM vit.lesson_completions lc
    JOIN vit.lessons l ON lc.lesson_id = l.id
    JOIN vit.modules m ON l.module_id = m.id
    WHERE lc.user_id = NEW.user_id
      AND lc.cohort_id = NEW.cohort_id
      AND m.course_id = _course_id
      AND l.is_required = true;

    _pct := CASE WHEN _total > 0 THEN ROUND((_completed::DECIMAL / _total) * 100, 2) ELSE 0 END;

    INSERT INTO vit.course_progress (
        user_id, cohort_id, course_id,
        total_lessons, completed_lessons, progress_percentage,
        last_lesson_id, last_activity_at, started_at, completed_at
    ) VALUES (
        NEW.user_id, NEW.cohort_id, _course_id,
        _total, _completed, _pct,
        NEW.lesson_id, now(),
        CASE WHEN _completed = 1 THEN now() ELSE NULL END,
        CASE WHEN _pct >= 100 THEN now() ELSE NULL END
    )
    ON CONFLICT (user_id, cohort_id)
    DO UPDATE SET
        total_lessons = _total,
        completed_lessons = _completed,
        progress_percentage = _pct,
        last_lesson_id = NEW.lesson_id,
        last_activity_at = now(),
        started_at = COALESCE(vit.course_progress.started_at, now()),
        completed_at = CASE WHEN _pct >= 100 THEN COALESCE(vit.course_progress.completed_at, now()) ELSE NULL END,
        updated_at = now();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = vit;

CREATE TRIGGER trg_vit_update_course_progress
    AFTER INSERT ON vit.lesson_completions
    FOR EACH ROW EXECUTE FUNCTION vit.update_course_progress();

-- Auto-update reply count on discussions
CREATE OR REPLACE FUNCTION vit.update_discussion_reply_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE vit.discussions
    SET reply_count = (
            SELECT COUNT(*) FROM vit.discussion_posts WHERE discussion_id = NEW.discussion_id
        ),
        last_reply_at = now()
    WHERE id = NEW.discussion_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = vit;

CREATE TRIGGER trg_vit_update_discussion_reply_count
    AFTER INSERT ON vit.discussion_posts
    FOR EACH ROW EXECUTE FUNCTION vit.update_discussion_reply_count();

-- Auto-update upvote count on posts
CREATE OR REPLACE FUNCTION vit.update_post_upvote_count()
RETURNS TRIGGER AS $$
DECLARE
    _post_id UUID;
BEGIN
    _post_id := COALESCE(NEW.post_id, OLD.post_id);
    UPDATE vit.discussion_posts
    SET upvote_count = (
        SELECT COUNT(*) FROM vit.post_reactions
        WHERE post_id = _post_id AND reaction_type = 'upvote'
    )
    WHERE id = _post_id;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = vit;

CREATE TRIGGER trg_vit_update_post_upvote_count
    AFTER INSERT OR DELETE ON vit.post_reactions
    FOR EACH ROW EXECUTE FUNCTION vit.update_post_upvote_count();

-- Generate certificate number
CREATE OR REPLACE FUNCTION vit.generate_certificate_number()
RETURNS TEXT AS $$
DECLARE
    _date_part TEXT;
    _random_part TEXT;
    _number TEXT;
    _exists BOOLEAN;
BEGIN
    LOOP
        _date_part := to_char(now(), 'YYYYMMDD');
        _random_part := upper(substr(md5(random()::text), 1, 5));
        _number := 'VIT-' || _date_part || '-' || _random_part;
        SELECT EXISTS(SELECT 1 FROM vit.certificates WHERE certificate_number = _number) INTO _exists;
        IF NOT _exists THEN
            RETURN _number;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SET search_path = vit;

-- ============================================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE vit.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE vit.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vit.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vit.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE vit.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE vit.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE vit.cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vit.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE vit.lesson_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vit.course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE vit.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vit.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vit.quiz_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE vit.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vit.quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vit.discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vit.discussion_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vit.post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vit.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE vit.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE vit.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE vit.external_platform_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vit.external_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE vit.external_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE vit.course_files ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6.1 ORGANIZATIONS
-- ============================================================================
CREATE POLICY "vit_Users can view own organization"
    ON vit.organizations FOR SELECT
    USING (id = vit.get_user_organization_id(auth.uid()));

CREATE POLICY "vit_Admins can update own organization"
    ON vit.organizations FOR UPDATE
    USING (id = vit.get_user_organization_id(auth.uid())
           AND vit.user_has_role(auth.uid(), id, 'admin'));

-- ============================================================================
-- 6.2 PROFILES
-- ============================================================================
CREATE POLICY "vit_Users can view profiles in own org"
    ON vit.profiles FOR SELECT
    USING (organization_id = vit.get_user_organization_id(auth.uid()));

CREATE POLICY "vit_Users can update own profile"
    ON vit.profiles FOR UPDATE
    USING (id = auth.uid());

CREATE POLICY "vit_Admins can update profiles in own org"
    ON vit.profiles FOR UPDATE
    USING (organization_id = vit.get_user_organization_id(auth.uid())
           AND vit.user_has_role(auth.uid(), organization_id, 'admin'));

-- ============================================================================
-- 6.3 USER_ROLES
-- ============================================================================
CREATE POLICY "vit_Users can view roles in own org"
    ON vit.user_roles FOR SELECT
    USING (organization_id = vit.get_user_organization_id(auth.uid()));

CREATE POLICY "vit_Admins can manage roles in own org"
    ON vit.user_roles FOR ALL
    USING (organization_id = vit.get_user_organization_id(auth.uid())
           AND vit.user_has_role(auth.uid(), organization_id, 'admin'));

-- ============================================================================
-- 6.4 COURSES
-- ============================================================================
CREATE POLICY "vit_Users can view published courses in own org"
    ON vit.courses FOR SELECT
    USING (organization_id = vit.get_user_organization_id(auth.uid())
           AND (status = 'published'
                OR vit.user_has_role(auth.uid(), organization_id, 'admin')
                OR vit.user_has_role(auth.uid(), organization_id, 'instructor')));

CREATE POLICY "vit_Admins and instructors can create courses"
    ON vit.courses FOR INSERT
    WITH CHECK (organization_id = vit.get_user_organization_id(auth.uid())
                AND (vit.user_has_role(auth.uid(), organization_id, 'admin')
                     OR vit.user_has_role(auth.uid(), organization_id, 'instructor')));

CREATE POLICY "vit_Admins and instructors can update courses"
    ON vit.courses FOR UPDATE
    USING (organization_id = vit.get_user_organization_id(auth.uid())
           AND (vit.user_has_role(auth.uid(), organization_id, 'admin')
                OR vit.user_has_role(auth.uid(), organization_id, 'instructor')));

CREATE POLICY "vit_Admins can delete courses"
    ON vit.courses FOR DELETE
    USING (organization_id = vit.get_user_organization_id(auth.uid())
           AND vit.user_has_role(auth.uid(), organization_id, 'admin'));

-- ============================================================================
-- 6.5 MODULES
-- ============================================================================
CREATE POLICY "vit_Users can view modules of accessible courses"
    ON vit.modules FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM vit.courses c
        WHERE c.id = modules.course_id
          AND c.organization_id = vit.get_user_organization_id(auth.uid())
          AND (c.status = 'published'
               OR vit.user_has_role(auth.uid(), c.organization_id, 'admin')
               OR vit.user_has_role(auth.uid(), c.organization_id, 'instructor'))
    ));

CREATE POLICY "vit_Admins and instructors can manage modules"
    ON vit.modules FOR ALL
    USING (EXISTS (
        SELECT 1 FROM vit.courses c
        WHERE c.id = modules.course_id
          AND c.organization_id = vit.get_user_organization_id(auth.uid())
          AND (vit.user_has_role(auth.uid(), c.organization_id, 'admin')
               OR vit.user_has_role(auth.uid(), c.organization_id, 'instructor'))
    ));

-- ============================================================================
-- 6.6 LESSONS
-- ============================================================================
CREATE POLICY "vit_Users can view lessons of accessible courses"
    ON vit.lessons FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM vit.modules m
        JOIN vit.courses c ON m.course_id = c.id
        WHERE m.id = lessons.module_id
          AND c.organization_id = vit.get_user_organization_id(auth.uid())
          AND (c.status = 'published'
               OR vit.user_has_role(auth.uid(), c.organization_id, 'admin')
               OR vit.user_has_role(auth.uid(), c.organization_id, 'instructor'))
    ));

CREATE POLICY "vit_Admins and instructors can manage lessons"
    ON vit.lessons FOR ALL
    USING (EXISTS (
        SELECT 1 FROM vit.modules m
        JOIN vit.courses c ON m.course_id = c.id
        WHERE m.id = lessons.module_id
          AND c.organization_id = vit.get_user_organization_id(auth.uid())
          AND (vit.user_has_role(auth.uid(), c.organization_id, 'admin')
               OR vit.user_has_role(auth.uid(), c.organization_id, 'instructor'))
    ));

-- ============================================================================
-- 6.7 COHORTS
-- ============================================================================
CREATE POLICY "vit_Users can view cohorts in own org"
    ON vit.cohorts FOR SELECT
    USING (organization_id = vit.get_user_organization_id(auth.uid()));

CREATE POLICY "vit_Admins and instructors can manage cohorts"
    ON vit.cohorts FOR ALL
    USING (organization_id = vit.get_user_organization_id(auth.uid())
           AND (vit.user_has_role(auth.uid(), organization_id, 'admin')
                OR vit.user_has_role(auth.uid(), organization_id, 'instructor')));

-- ============================================================================
-- 6.8 ENROLLMENTS
-- ============================================================================
CREATE POLICY "vit_Students can view own enrollments"
    ON vit.enrollments FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "vit_Admins can view all enrollments in org"
    ON vit.enrollments FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM vit.cohorts ch
        WHERE ch.id = enrollments.cohort_id
          AND ch.organization_id = vit.get_user_organization_id(auth.uid())
          AND (vit.user_has_role(auth.uid(), ch.organization_id, 'admin')
               OR vit.user_has_role(auth.uid(), ch.organization_id, 'instructor'))
    ));

CREATE POLICY "vit_Admins can manage enrollments"
    ON vit.enrollments FOR ALL
    USING (EXISTS (
        SELECT 1 FROM vit.cohorts ch
        WHERE ch.id = enrollments.cohort_id
          AND ch.organization_id = vit.get_user_organization_id(auth.uid())
          AND vit.user_has_role(auth.uid(), ch.organization_id, 'admin')
    ));

-- ============================================================================
-- 6.9 LESSON_COMPLETIONS
-- ============================================================================
CREATE POLICY "vit_Students can view own completions"
    ON vit.lesson_completions FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "vit_Students can insert own completions"
    ON vit.lesson_completions FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "vit_Admins can view all completions in org"
    ON vit.lesson_completions FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM vit.cohorts ch
        WHERE ch.id = lesson_completions.cohort_id
          AND ch.organization_id = vit.get_user_organization_id(auth.uid())
          AND (vit.user_has_role(auth.uid(), ch.organization_id, 'admin')
               OR vit.user_has_role(auth.uid(), ch.organization_id, 'instructor'))
    ));

-- ============================================================================
-- 6.10 COURSE_PROGRESS
-- ============================================================================
CREATE POLICY "vit_Students can view own progress"
    ON vit.course_progress FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "vit_Students can insert own progress"
    ON vit.course_progress FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "vit_Students can update own progress"
    ON vit.course_progress FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "vit_Admins can view all progress in org"
    ON vit.course_progress FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM vit.cohorts ch
        WHERE ch.id = course_progress.cohort_id
          AND ch.organization_id = vit.get_user_organization_id(auth.uid())
          AND (vit.user_has_role(auth.uid(), ch.organization_id, 'admin')
               OR vit.user_has_role(auth.uid(), ch.organization_id, 'instructor'))
    ));

-- ============================================================================
-- 6.11 QUIZZES, QUESTIONS, OPTIONS
-- ============================================================================
CREATE POLICY "vit_Users can view quizzes of accessible lessons"
    ON vit.quizzes FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM vit.lessons l
        JOIN vit.modules m ON l.module_id = m.id
        JOIN vit.courses c ON m.course_id = c.id
        WHERE l.id = quizzes.lesson_id
          AND c.organization_id = vit.get_user_organization_id(auth.uid())
    ));

CREATE POLICY "vit_Admins and instructors can manage quizzes"
    ON vit.quizzes FOR ALL
    USING (EXISTS (
        SELECT 1 FROM vit.lessons l
        JOIN vit.modules m ON l.module_id = m.id
        JOIN vit.courses c ON m.course_id = c.id
        WHERE l.id = quizzes.lesson_id
          AND c.organization_id = vit.get_user_organization_id(auth.uid())
          AND (vit.user_has_role(auth.uid(), c.organization_id, 'admin')
               OR vit.user_has_role(auth.uid(), c.organization_id, 'instructor'))
    ));

CREATE POLICY "vit_Users can view quiz questions"
    ON vit.quiz_questions FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM vit.quizzes q
        JOIN vit.lessons l ON q.lesson_id = l.id
        JOIN vit.modules m ON l.module_id = m.id
        JOIN vit.courses c ON m.course_id = c.id
        WHERE q.id = quiz_questions.quiz_id
          AND c.organization_id = vit.get_user_organization_id(auth.uid())
    ));

CREATE POLICY "vit_Admins and instructors can manage quiz questions"
    ON vit.quiz_questions FOR ALL
    USING (EXISTS (
        SELECT 1 FROM vit.quizzes q
        JOIN vit.lessons l ON q.lesson_id = l.id
        JOIN vit.modules m ON l.module_id = m.id
        JOIN vit.courses c ON m.course_id = c.id
        WHERE q.id = quiz_questions.quiz_id
          AND c.organization_id = vit.get_user_organization_id(auth.uid())
          AND (vit.user_has_role(auth.uid(), c.organization_id, 'admin')
               OR vit.user_has_role(auth.uid(), c.organization_id, 'instructor'))
    ));

CREATE POLICY "vit_Users can view quiz options"
    ON vit.quiz_options FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM vit.quiz_questions qq
        JOIN vit.quizzes q ON qq.quiz_id = q.id
        JOIN vit.lessons l ON q.lesson_id = l.id
        JOIN vit.modules m ON l.module_id = m.id
        JOIN vit.courses c ON m.course_id = c.id
        WHERE qq.id = quiz_options.question_id
          AND c.organization_id = vit.get_user_organization_id(auth.uid())
    ));

CREATE POLICY "vit_Admins and instructors can manage quiz options"
    ON vit.quiz_options FOR ALL
    USING (EXISTS (
        SELECT 1 FROM vit.quiz_questions qq
        JOIN vit.quizzes q ON qq.quiz_id = q.id
        JOIN vit.lessons l ON q.lesson_id = l.id
        JOIN vit.modules m ON l.module_id = m.id
        JOIN vit.courses c ON m.course_id = c.id
        WHERE qq.id = quiz_options.question_id
          AND c.organization_id = vit.get_user_organization_id(auth.uid())
          AND (vit.user_has_role(auth.uid(), c.organization_id, 'admin')
               OR vit.user_has_role(auth.uid(), c.organization_id, 'instructor'))
    ));

-- ============================================================================
-- 6.12 QUIZ ATTEMPTS & ANSWERS
-- ============================================================================
CREATE POLICY "vit_Students can view own quiz attempts"
    ON vit.quiz_attempts FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "vit_Students can insert own quiz attempts"
    ON vit.quiz_attempts FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "vit_Students can update own quiz attempts"
    ON vit.quiz_attempts FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "vit_Admins can view all quiz attempts in org"
    ON vit.quiz_attempts FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM vit.cohorts ch
        WHERE ch.id = quiz_attempts.cohort_id
          AND ch.organization_id = vit.get_user_organization_id(auth.uid())
          AND (vit.user_has_role(auth.uid(), ch.organization_id, 'admin')
               OR vit.user_has_role(auth.uid(), ch.organization_id, 'instructor'))
    ));

CREATE POLICY "vit_Students can view own quiz answers"
    ON vit.quiz_answers FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM vit.quiz_attempts qa
        WHERE qa.id = quiz_answers.attempt_id AND qa.user_id = auth.uid()
    ));

CREATE POLICY "vit_Students can insert own quiz answers"
    ON vit.quiz_answers FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM vit.quiz_attempts qa
        WHERE qa.id = quiz_answers.attempt_id AND qa.user_id = auth.uid()
    ));

-- ============================================================================
-- 6.13 DISCUSSIONS
-- ============================================================================
CREATE POLICY "vit_Users can view discussions in own org"
    ON vit.discussions FOR SELECT
    USING (organization_id = vit.get_user_organization_id(auth.uid()));

CREATE POLICY "vit_Users can create discussions in own org"
    ON vit.discussions FOR INSERT
    WITH CHECK (organization_id = vit.get_user_organization_id(auth.uid()));

CREATE POLICY "vit_Authors can update own discussions"
    ON vit.discussions FOR UPDATE
    USING (author_id = auth.uid());

CREATE POLICY "vit_Admins can manage all discussions"
    ON vit.discussions FOR ALL
    USING (organization_id = vit.get_user_organization_id(auth.uid())
           AND vit.user_has_role(auth.uid(), organization_id, 'admin'));

-- ============================================================================
-- 6.14 DISCUSSION POSTS
-- ============================================================================
CREATE POLICY "vit_Users can view posts in accessible discussions"
    ON vit.discussion_posts FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM vit.discussions d
        WHERE d.id = discussion_posts.discussion_id
          AND d.organization_id = vit.get_user_organization_id(auth.uid())
    ));

CREATE POLICY "vit_Users can create posts in non-locked discussions"
    ON vit.discussion_posts FOR INSERT
    WITH CHECK (
        author_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM vit.discussions d
            WHERE d.id = discussion_posts.discussion_id
              AND d.organization_id = vit.get_user_organization_id(auth.uid())
              AND d.is_locked = false
        )
    );

CREATE POLICY "vit_Authors can update own posts"
    ON vit.discussion_posts FOR UPDATE
    USING (author_id = auth.uid());

-- ============================================================================
-- 6.15 POST REACTIONS
-- ============================================================================
CREATE POLICY "vit_Users can view reactions"
    ON vit.post_reactions FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM vit.discussion_posts dp
        JOIN vit.discussions d ON dp.discussion_id = d.id
        WHERE dp.id = post_reactions.post_id
          AND d.organization_id = vit.get_user_organization_id(auth.uid())
    ));

CREATE POLICY "vit_Users can manage own reactions"
    ON vit.post_reactions FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "vit_Users can delete own reactions"
    ON vit.post_reactions FOR DELETE
    USING (user_id = auth.uid());

-- ============================================================================
-- 6.16 ANNOUNCEMENTS
-- ============================================================================
CREATE POLICY "vit_Users can view published announcements in own org"
    ON vit.announcements FOR SELECT
    USING (organization_id = vit.get_user_organization_id(auth.uid())
           AND (is_published = true
                OR vit.user_has_role(auth.uid(), organization_id, 'admin')
                OR vit.user_has_role(auth.uid(), organization_id, 'instructor')));

CREATE POLICY "vit_Admins and instructors can manage announcements"
    ON vit.announcements FOR ALL
    USING (organization_id = vit.get_user_organization_id(auth.uid())
           AND (vit.user_has_role(auth.uid(), organization_id, 'admin')
                OR vit.user_has_role(auth.uid(), organization_id, 'instructor')));

-- ============================================================================
-- 6.17 NOTIFICATIONS
-- ============================================================================
CREATE POLICY "vit_Users can view own notifications"
    ON vit.notifications FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "vit_Users can update own notifications"
    ON vit.notifications FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "vit_Users can delete own notifications"
    ON vit.notifications FOR DELETE
    USING (user_id = auth.uid());

CREATE POLICY "vit_Admins can create notifications in org"
    ON vit.notifications FOR INSERT
    WITH CHECK (
        organization_id = vit.get_user_organization_id(auth.uid())
        AND (vit.user_has_role(auth.uid(), organization_id, 'admin')
             OR vit.user_has_role(auth.uid(), organization_id, 'instructor'))
    );

-- ============================================================================
-- 6.18 CERTIFICATES
-- ============================================================================
CREATE POLICY "vit_Students can view own certificates"
    ON vit.certificates FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "vit_Admins can view all certificates in org"
    ON vit.certificates FOR SELECT
    USING (organization_id = vit.get_user_organization_id(auth.uid())
           AND (vit.user_has_role(auth.uid(), organization_id, 'admin')
                OR vit.user_has_role(auth.uid(), organization_id, 'instructor')));

CREATE POLICY "vit_Admins can issue certificates"
    ON vit.certificates FOR INSERT
    WITH CHECK (
        organization_id = vit.get_user_organization_id(auth.uid())
        AND vit.user_has_role(auth.uid(), organization_id, 'admin')
    );

CREATE POLICY "vit_Admins can revoke certificates"
    ON vit.certificates FOR DELETE
    USING (
        organization_id = vit.get_user_organization_id(auth.uid())
        AND vit.user_has_role(auth.uid(), organization_id, 'admin')
    );

-- ============================================================================
-- 6.19 EXTERNAL PLATFORM CONFIGS
-- ============================================================================
CREATE POLICY "vit_Admins can manage external platform configs"
    ON vit.external_platform_configs FOR ALL
    USING (organization_id = vit.get_user_organization_id(auth.uid())
           AND vit.user_has_role(auth.uid(), organization_id, 'admin'));

-- ============================================================================
-- 6.20 EXTERNAL ENROLLMENTS
-- ============================================================================
CREATE POLICY "vit_Students can view own external enrollments"
    ON vit.external_enrollments FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "vit_Admins can view all external enrollments in org"
    ON vit.external_enrollments FOR SELECT
    USING (organization_id = vit.get_user_organization_id(auth.uid())
           AND vit.user_has_role(auth.uid(), organization_id, 'admin'));

CREATE POLICY "vit_Admins can manage external enrollments in org"
    ON vit.external_enrollments FOR ALL
    USING (
        organization_id = vit.get_user_organization_id(auth.uid())
        AND vit.user_has_role(auth.uid(), organization_id, 'admin')
    );

-- ============================================================================
-- 6.21 EXTERNAL PROGRESS
-- ============================================================================
CREATE POLICY "vit_Students can view own external progress"
    ON vit.external_progress FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM vit.external_enrollments ee
        WHERE ee.id = external_progress.external_enrollment_id
          AND ee.user_id = auth.uid()
    ));

CREATE POLICY "vit_Admins can view all external progress in org"
    ON vit.external_progress FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM vit.external_enrollments ee
        WHERE ee.id = external_progress.external_enrollment_id
          AND ee.organization_id = vit.get_user_organization_id(auth.uid())
          AND vit.user_has_role(auth.uid(), ee.organization_id, 'admin')
    ));

CREATE POLICY "vit_Admins can manage external progress in org"
    ON vit.external_progress FOR ALL
    USING (EXISTS (
        SELECT 1 FROM vit.external_enrollments ee
        WHERE ee.id = external_progress.external_enrollment_id
          AND ee.organization_id = vit.get_user_organization_id(auth.uid())
          AND vit.user_has_role(auth.uid(), ee.organization_id, 'admin')
    ));

-- ============================================================================
-- 6.22 COURSE FILES
-- ============================================================================
CREATE POLICY "vit_Users can view files in own org"
    ON vit.course_files FOR SELECT
    USING (organization_id = vit.get_user_organization_id(auth.uid()));

CREATE POLICY "vit_Admins and instructors can manage files"
    ON vit.course_files FOR ALL
    USING (organization_id = vit.get_user_organization_id(auth.uid())
           AND (vit.user_has_role(auth.uid(), organization_id, 'admin')
                OR vit.user_has_role(auth.uid(), organization_id, 'instructor')));

-- ============================================================================
-- 7. SEED DATA (Demo content for POC)
-- ============================================================================

-- Organization
INSERT INTO vit.organizations (id, name, slug, settings)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'VetsInTech Education',
    'vetsintech',
    '{"allow_self_registration": true, "default_timezone": "America/New_York"}'
);

-- Course: Introduction to Cybersecurity
INSERT INTO vit.courses (id, organization_id, title, slug, description, category, status, estimated_duration_minutes)
VALUES (
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000001',
    'Introduction to Cybersecurity',
    'intro-to-cybersecurity',
    'A foundational course covering the core concepts of cybersecurity, threat landscapes, and defense strategies.',
    'Cybersecurity',
    'published',
    480
);

-- Module 1: Security Fundamentals
INSERT INTO vit.modules (id, course_id, title, description, sort_order)
VALUES (
    '00000000-0000-0000-0000-000000000100',
    '00000000-0000-0000-0000-000000000010',
    'Security Fundamentals',
    'Core concepts of information security — CIA triad, threat models, and risk management.',
    1
);

-- Lessons for Module 1
INSERT INTO vit.lessons (id, module_id, title, lesson_type, sort_order, estimated_duration_minutes, content)
VALUES
    ('00000000-0000-0000-0000-000000001001', '00000000-0000-0000-0000-000000000100',
     'What is Cybersecurity?', 'text', 1, 15,
     '{"type": "doc", "content": [{"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "What is Cybersecurity?"}]}, {"type": "paragraph", "content": [{"type": "text", "text": "Cybersecurity is the practice of protecting systems, networks, and programs from digital attacks. This lesson introduces the fundamental concepts you need to understand."}]}]}'),
    ('00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000000100',
     'The CIA Triad', 'text', 2, 20,
     '{"type": "doc", "content": [{"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Confidentiality, Integrity, Availability"}]}, {"type": "paragraph", "content": [{"type": "text", "text": "The CIA triad is the foundation of information security. Every security decision maps back to protecting one or more of these three properties."}]}]}'),
    ('00000000-0000-0000-0000-000000001003', '00000000-0000-0000-0000-000000000100',
     'Threat Landscape Overview', 'video', 3, 25, NULL);

UPDATE vit.lessons SET video_url = 'https://www.youtube.com/embed/dQw4w9WgXcQ'
WHERE id = '00000000-0000-0000-0000-000000001003';

-- Module 2: Network Security
INSERT INTO vit.modules (id, course_id, title, description, sort_order)
VALUES (
    '00000000-0000-0000-0000-000000000200',
    '00000000-0000-0000-0000-000000000010',
    'Network Security',
    'Understanding network protocols, firewalls, intrusion detection, and secure architecture.',
    2
);

INSERT INTO vit.lessons (id, module_id, title, lesson_type, sort_order, estimated_duration_minutes, content)
VALUES
    ('00000000-0000-0000-0000-000000002001', '00000000-0000-0000-0000-000000000200',
     'Network Protocols and Ports', 'text', 1, 20,
     '{"type": "doc", "content": [{"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Understanding Network Protocols"}]}, {"type": "paragraph", "content": [{"type": "text", "text": "Every network communication relies on protocols. Understanding TCP/IP, HTTP, DNS, and other core protocols is essential for identifying and mitigating network-based attacks."}]}]}'),
    ('00000000-0000-0000-0000-000000002002', '00000000-0000-0000-0000-000000000200',
     'Firewalls and IDS/IPS', 'text', 2, 25,
     '{"type": "doc", "content": [{"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Firewalls and Intrusion Detection"}]}, {"type": "paragraph", "content": [{"type": "text", "text": "Firewalls and intrusion detection systems form the first line of defense in network security. Learn how they work and how to configure them effectively."}]}]}');

-- Cohort
INSERT INTO vit.cohorts (id, organization_id, course_id, name, description, status, starts_at)
VALUES (
    '00000000-0000-0000-0000-000000000500',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000010',
    'Spring 2026 Cohort',
    'First cohort for the Introduction to Cybersecurity course.',
    'active',
    '2026-03-01T00:00:00Z'
);

-- ============================================================================
-- SETUP COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Go to Supabase Dashboard → Settings → API → "Exposed schemas" → add "vit"
-- 2. Copy the anon key and service role key to .env.local
-- 3. Create a demo admin user:
--    a. Register via the app UI or create via Supabase Auth admin API
--    b. Then run:
--       INSERT INTO vit.profiles (id, organization_id, email, full_name)
--       VALUES ('<user-id>', '00000000-0000-0000-0000-000000000001', '<email>', '<name>');
--       INSERT INTO vit.user_roles (user_id, organization_id, role)
--       VALUES ('<user-id>', '00000000-0000-0000-0000-000000000001', 'admin');
-- ============================================================================

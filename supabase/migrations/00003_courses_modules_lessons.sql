-- ============================================================================
-- Migration: 00003_courses_modules_lessons
-- Purpose: Course content hierarchy — Course > Module > Lesson
-- Rollback: DROP TABLE IF EXISTS lessons CASCADE;
--           DROP TABLE IF EXISTS modules CASCADE;
--           DROP TABLE IF EXISTS courses CASCADE;
--           DROP TYPE IF EXISTS lesson_type;
--           DROP TYPE IF EXISTS course_status;
-- ============================================================================

-- Course status enum
CREATE TYPE course_status AS ENUM ('draft', 'published', 'archived');

-- Lesson type enum
CREATE TYPE lesson_type AS ENUM ('text', 'video', 'quiz', 'assignment', 'resource');

-- ============================================================================
-- Courses
-- ============================================================================
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    category TEXT,
    tags JSONB DEFAULT '[]',
    prerequisites JSONB DEFAULT '[]',
    status course_status NOT NULL DEFAULT 'draft',
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    estimated_duration_minutes INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, slug)
);

CREATE INDEX idx_courses_org ON courses(organization_id);
CREATE INDEX idx_courses_status ON courses(organization_id, status);
CREATE INDEX idx_courses_slug ON courses(organization_id, slug);
CREATE INDEX idx_courses_category ON courses(organization_id, category);

CREATE TRIGGER trg_courses_updated_at
    BEFORE UPDATE ON courses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Modules (ordered sections within a course)
-- ============================================================================
CREATE TABLE modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_required BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_modules_course ON modules(course_id);
CREATE INDEX idx_modules_order ON modules(course_id, sort_order);

CREATE TRIGGER trg_modules_updated_at
    BEFORE UPDATE ON modules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Lessons (content pages within a module)
-- ============================================================================
CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    lesson_type lesson_type NOT NULL DEFAULT 'text',
    content JSONB,                    -- Tiptap ProseMirror JSON
    video_url TEXT,                   -- YouTube/Vimeo embed URL
    sort_order INTEGER NOT NULL DEFAULT 0,
    estimated_duration_minutes INTEGER,
    is_required BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lessons_module ON lessons(module_id);
CREATE INDEX idx_lessons_order ON lessons(module_id, sort_order);
CREATE INDEX idx_lessons_type ON lessons(lesson_type);

CREATE TRIGGER trg_lessons_updated_at
    BEFORE UPDATE ON lessons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE courses IS 'Course templates. Published courses can be instantiated as cohorts.';
COMMENT ON TABLE modules IS 'Ordered sections within a course. Students progress through modules sequentially.';
COMMENT ON TABLE lessons IS 'Content pages within a module. Tiptap JSON stored in content column.';
COMMENT ON COLUMN lessons.content IS 'Tiptap/ProseMirror JSON document. Render via Tiptap React renderer — never use dangerouslySetInnerHTML.';

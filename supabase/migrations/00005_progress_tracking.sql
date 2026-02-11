-- ============================================================================
-- Migration: 00005_progress_tracking
-- Purpose: Track lesson completions + aggregate course progress per student
-- Rollback: DROP TRIGGER IF EXISTS trg_update_course_progress ON lesson_completions;
--           DROP FUNCTION IF EXISTS update_course_progress();
--           DROP TABLE IF EXISTS course_progress CASCADE;
--           DROP TABLE IF EXISTS lesson_completions CASCADE;
-- ============================================================================

-- ============================================================================
-- Lesson Completions (granular: one row per lesson per student per cohort)
-- ============================================================================
CREATE TABLE lesson_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    cohort_id UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    time_spent_seconds INTEGER DEFAULT 0,
    UNIQUE(user_id, lesson_id, cohort_id)
);

CREATE INDEX idx_lesson_completions_user_cohort ON lesson_completions(user_id, cohort_id);
CREATE INDEX idx_lesson_completions_lesson ON lesson_completions(lesson_id);

-- ============================================================================
-- Course Progress (aggregate: one row per student per cohort)
-- Updated automatically via trigger when lesson_completions change
-- ============================================================================
CREATE TABLE course_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    cohort_id UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    total_lessons INTEGER NOT NULL DEFAULT 0,
    completed_lessons INTEGER NOT NULL DEFAULT 0,
    progress_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    last_lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
    last_activity_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, cohort_id)
);

CREATE INDEX idx_course_progress_user ON course_progress(user_id);
CREATE INDEX idx_course_progress_cohort ON course_progress(cohort_id);
CREATE INDEX idx_course_progress_course ON course_progress(course_id);

-- ============================================================================
-- Trigger: Auto-update course_progress when a lesson is completed
-- ============================================================================
CREATE OR REPLACE FUNCTION update_course_progress()
RETURNS TRIGGER AS $$
DECLARE
    _course_id UUID;
    _total INTEGER;
    _completed INTEGER;
    _pct DECIMAL(5,2);
BEGIN
    -- Get the course_id from the lesson's module's course
    SELECT c.id INTO _course_id
    FROM lessons l
    JOIN modules m ON l.module_id = m.id
    JOIN courses c ON m.course_id = c.id
    WHERE l.id = NEW.lesson_id;

    -- Count total required lessons in the course
    SELECT COUNT(*) INTO _total
    FROM lessons l
    JOIN modules m ON l.module_id = m.id
    WHERE m.course_id = _course_id
      AND l.is_required = true;

    -- Count completed required lessons for this user in this cohort
    SELECT COUNT(*) INTO _completed
    FROM lesson_completions lc
    JOIN lessons l ON lc.lesson_id = l.id
    JOIN modules m ON l.module_id = m.id
    WHERE lc.user_id = NEW.user_id
      AND lc.cohort_id = NEW.cohort_id
      AND m.course_id = _course_id
      AND l.is_required = true;

    -- Calculate percentage
    _pct := CASE WHEN _total > 0 THEN ROUND((_completed::DECIMAL / _total) * 100, 2) ELSE 0 END;

    -- Upsert course_progress
    INSERT INTO course_progress (
        user_id, cohort_id, course_id,
        total_lessons, completed_lessons, progress_percentage,
        last_lesson_id, last_activity_at, started_at, completed_at
    )
    VALUES (
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
        started_at = COALESCE(course_progress.started_at, now()),
        completed_at = CASE WHEN _pct >= 100 THEN COALESCE(course_progress.completed_at, now()) ELSE NULL END,
        updated_at = now();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_update_course_progress
    AFTER INSERT ON lesson_completions
    FOR EACH ROW
    EXECUTE FUNCTION update_course_progress();

COMMENT ON TABLE lesson_completions IS 'Granular lesson completion tracking. One row per student per lesson per cohort.';
COMMENT ON TABLE course_progress IS 'Aggregate progress per student per cohort. Auto-updated via trigger on lesson_completions.';

-- ============================================================================
-- Migration: 00006_quizzes
-- Purpose: Quiz/assessment system — questions, options, attempts, answers
-- Rollback: DROP TABLE IF EXISTS quiz_answers CASCADE;
--           DROP TABLE IF EXISTS quiz_attempts CASCADE;
--           DROP TABLE IF EXISTS quiz_options CASCADE;
--           DROP TABLE IF EXISTS quiz_questions CASCADE;
--           DROP TABLE IF EXISTS quizzes CASCADE;
--           DROP TYPE IF EXISTS question_type;
-- ============================================================================

CREATE TYPE question_type AS ENUM ('multiple_choice', 'true_false', 'short_answer');

-- ============================================================================
-- Quizzes (attached to a lesson of type 'quiz')
-- ============================================================================
CREATE TABLE quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    passing_score DECIMAL(5,2) NOT NULL DEFAULT 70.00,
    max_attempts INTEGER DEFAULT 3,              -- NULL = unlimited
    time_limit_minutes INTEGER,                  -- NULL = no limit
    shuffle_questions BOOLEAN NOT NULL DEFAULT false,
    show_correct_answers BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_quizzes_lesson ON quizzes(lesson_id);

CREATE TRIGGER trg_quizzes_updated_at
    BEFORE UPDATE ON quizzes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Quiz Questions
-- ============================================================================
CREATE TABLE quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type question_type NOT NULL,
    points DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    sort_order INTEGER NOT NULL DEFAULT 0,
    explanation TEXT,                             -- Shown after answering
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_quiz_questions_quiz ON quiz_questions(quiz_id);
CREATE INDEX idx_quiz_questions_order ON quiz_questions(quiz_id, sort_order);

-- ============================================================================
-- Quiz Options (answer choices for multiple_choice and true_false)
-- ============================================================================
CREATE TABLE quiz_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_quiz_options_question ON quiz_options(question_id);

-- ============================================================================
-- Quiz Attempts (one per student per quiz per try)
-- ============================================================================
CREATE TABLE quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    cohort_id UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
    score DECIMAL(5,2),
    passed BOOLEAN,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    time_spent_seconds INTEGER
);

CREATE INDEX idx_quiz_attempts_quiz ON quiz_attempts(quiz_id);
CREATE INDEX idx_quiz_attempts_user ON quiz_attempts(user_id);
CREATE INDEX idx_quiz_attempts_user_quiz ON quiz_attempts(user_id, quiz_id, cohort_id);

-- ============================================================================
-- Quiz Answers (individual answers per attempt)
-- ============================================================================
CREATE TABLE quiz_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
    selected_option_id UUID REFERENCES quiz_options(id) ON DELETE SET NULL,
    text_answer TEXT,                            -- For short_answer type
    is_correct BOOLEAN,
    points_earned DECIMAL(5,2) NOT NULL DEFAULT 0
);

CREATE INDEX idx_quiz_answers_attempt ON quiz_answers(attempt_id);

COMMENT ON TABLE quizzes IS 'Quiz definitions attached to lessons. Supports max attempts, time limits, and shuffling.';
COMMENT ON TABLE quiz_questions IS 'Questions within a quiz. Supports multiple choice, true/false, and short answer.';
COMMENT ON TABLE quiz_options IS 'Answer options for multiple_choice and true_false questions.';
COMMENT ON TABLE quiz_attempts IS 'Records each quiz attempt by a student. Tracks score, pass/fail, and timing.';
COMMENT ON TABLE quiz_answers IS 'Individual answer submissions per attempt. Links to selected option or text answer.';

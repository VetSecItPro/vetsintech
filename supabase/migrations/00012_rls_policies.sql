-- ============================================================================
-- Migration: 00012_rls_policies
-- Purpose: Row Level Security on ALL tables — tenant isolation + role-based access
-- Rollback: See individual DROP POLICY statements below each section
-- ============================================================================

-- ============================================================================
-- Enable RLS on every table
-- ============================================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_platform_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_files ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ORGANIZATIONS
-- Users can only see their own organization
-- ============================================================================
CREATE POLICY "Users can view own organization"
    ON organizations FOR SELECT
    USING (id = get_user_organization_id(auth.uid()));

-- Admins can update their organization
CREATE POLICY "Admins can update own organization"
    ON organizations FOR UPDATE
    USING (id = get_user_organization_id(auth.uid())
           AND user_has_role(auth.uid(), id, 'admin'));

-- ============================================================================
-- PROFILES
-- Users can see profiles in their org; can only update their own
-- ============================================================================
CREATE POLICY "Users can view profiles in own org"
    ON profiles FOR SELECT
    USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (id = auth.uid());

CREATE POLICY "Admins can update profiles in own org"
    ON profiles FOR UPDATE
    USING (organization_id = get_user_organization_id(auth.uid())
           AND user_has_role(auth.uid(), organization_id, 'admin'));

-- ============================================================================
-- USER_ROLES
-- Users can see roles in their org; only admins can modify
-- ============================================================================
CREATE POLICY "Users can view roles in own org"
    ON user_roles FOR SELECT
    USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Admins can manage roles in own org"
    ON user_roles FOR ALL
    USING (organization_id = get_user_organization_id(auth.uid())
           AND user_has_role(auth.uid(), organization_id, 'admin'));

-- ============================================================================
-- COURSES
-- Published courses visible to all in org; drafts only to admin/instructor
-- ============================================================================
CREATE POLICY "Users can view published courses in own org"
    ON courses FOR SELECT
    USING (organization_id = get_user_organization_id(auth.uid())
           AND (status = 'published'
                OR user_has_role(auth.uid(), organization_id, 'admin')
                OR user_has_role(auth.uid(), organization_id, 'instructor')));

CREATE POLICY "Admins and instructors can create courses"
    ON courses FOR INSERT
    WITH CHECK (organization_id = get_user_organization_id(auth.uid())
                AND (user_has_role(auth.uid(), organization_id, 'admin')
                     OR user_has_role(auth.uid(), organization_id, 'instructor')));

CREATE POLICY "Admins and instructors can update courses"
    ON courses FOR UPDATE
    USING (organization_id = get_user_organization_id(auth.uid())
           AND (user_has_role(auth.uid(), organization_id, 'admin')
                OR user_has_role(auth.uid(), organization_id, 'instructor')));

CREATE POLICY "Admins can delete courses"
    ON courses FOR DELETE
    USING (organization_id = get_user_organization_id(auth.uid())
           AND user_has_role(auth.uid(), organization_id, 'admin'));

-- ============================================================================
-- MODULES
-- Inherit access from parent course via join
-- ============================================================================
CREATE POLICY "Users can view modules of accessible courses"
    ON modules FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM courses c
        WHERE c.id = modules.course_id
          AND c.organization_id = get_user_organization_id(auth.uid())
          AND (c.status = 'published'
               OR user_has_role(auth.uid(), c.organization_id, 'admin')
               OR user_has_role(auth.uid(), c.organization_id, 'instructor'))
    ));

CREATE POLICY "Admins and instructors can manage modules"
    ON modules FOR ALL
    USING (EXISTS (
        SELECT 1 FROM courses c
        WHERE c.id = modules.course_id
          AND c.organization_id = get_user_organization_id(auth.uid())
          AND (user_has_role(auth.uid(), c.organization_id, 'admin')
               OR user_has_role(auth.uid(), c.organization_id, 'instructor'))
    ));

-- ============================================================================
-- LESSONS
-- Inherit access from parent module → course
-- ============================================================================
CREATE POLICY "Users can view lessons of accessible courses"
    ON lessons FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM modules m
        JOIN courses c ON m.course_id = c.id
        WHERE m.id = lessons.module_id
          AND c.organization_id = get_user_organization_id(auth.uid())
          AND (c.status = 'published'
               OR user_has_role(auth.uid(), c.organization_id, 'admin')
               OR user_has_role(auth.uid(), c.organization_id, 'instructor'))
    ));

CREATE POLICY "Admins and instructors can manage lessons"
    ON lessons FOR ALL
    USING (EXISTS (
        SELECT 1 FROM modules m
        JOIN courses c ON m.course_id = c.id
        WHERE m.id = lessons.module_id
          AND c.organization_id = get_user_organization_id(auth.uid())
          AND (user_has_role(auth.uid(), c.organization_id, 'admin')
               OR user_has_role(auth.uid(), c.organization_id, 'instructor'))
    ));

-- ============================================================================
-- COHORTS
-- Visible within own org; manageable by admin/instructor
-- ============================================================================
CREATE POLICY "Users can view cohorts in own org"
    ON cohorts FOR SELECT
    USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Admins and instructors can manage cohorts"
    ON cohorts FOR ALL
    USING (organization_id = get_user_organization_id(auth.uid())
           AND (user_has_role(auth.uid(), organization_id, 'admin')
                OR user_has_role(auth.uid(), organization_id, 'instructor')));

-- ============================================================================
-- ENROLLMENTS
-- Students see own; admin/instructor see all in org
-- ============================================================================
CREATE POLICY "Students can view own enrollments"
    ON enrollments FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Admins can view all enrollments in org"
    ON enrollments FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM cohorts ch
        WHERE ch.id = enrollments.cohort_id
          AND ch.organization_id = get_user_organization_id(auth.uid())
          AND (user_has_role(auth.uid(), ch.organization_id, 'admin')
               OR user_has_role(auth.uid(), ch.organization_id, 'instructor'))
    ));

CREATE POLICY "Admins can manage enrollments"
    ON enrollments FOR ALL
    USING (EXISTS (
        SELECT 1 FROM cohorts ch
        WHERE ch.id = enrollments.cohort_id
          AND ch.organization_id = get_user_organization_id(auth.uid())
          AND user_has_role(auth.uid(), ch.organization_id, 'admin')
    ));

-- ============================================================================
-- LESSON_COMPLETIONS
-- Students see own; admin/instructor see all in org
-- ============================================================================
CREATE POLICY "Students can view own completions"
    ON lesson_completions FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Students can insert own completions"
    ON lesson_completions FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all completions in org"
    ON lesson_completions FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM cohorts ch
        WHERE ch.id = lesson_completions.cohort_id
          AND ch.organization_id = get_user_organization_id(auth.uid())
          AND (user_has_role(auth.uid(), ch.organization_id, 'admin')
               OR user_has_role(auth.uid(), ch.organization_id, 'instructor'))
    ));

-- ============================================================================
-- COURSE_PROGRESS
-- Students see own; admin/instructor see all in org
-- ============================================================================
CREATE POLICY "Students can view own progress"
    ON course_progress FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Admins can view all progress in org"
    ON course_progress FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM cohorts ch
        WHERE ch.id = course_progress.cohort_id
          AND ch.organization_id = get_user_organization_id(auth.uid())
          AND (user_has_role(auth.uid(), ch.organization_id, 'admin')
               OR user_has_role(auth.uid(), ch.organization_id, 'instructor'))
    ));

-- ============================================================================
-- QUIZZES, QUIZ_QUESTIONS, QUIZ_OPTIONS
-- Inherit access from parent lesson → module → course
-- ============================================================================
CREATE POLICY "Users can view quizzes of accessible lessons"
    ON quizzes FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM lessons l
        JOIN modules m ON l.module_id = m.id
        JOIN courses c ON m.course_id = c.id
        WHERE l.id = quizzes.lesson_id
          AND c.organization_id = get_user_organization_id(auth.uid())
    ));

CREATE POLICY "Admins and instructors can manage quizzes"
    ON quizzes FOR ALL
    USING (EXISTS (
        SELECT 1 FROM lessons l
        JOIN modules m ON l.module_id = m.id
        JOIN courses c ON m.course_id = c.id
        WHERE l.id = quizzes.lesson_id
          AND c.organization_id = get_user_organization_id(auth.uid())
          AND (user_has_role(auth.uid(), c.organization_id, 'admin')
               OR user_has_role(auth.uid(), c.organization_id, 'instructor'))
    ));

CREATE POLICY "Users can view quiz questions"
    ON quiz_questions FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM quizzes q
        JOIN lessons l ON q.lesson_id = l.id
        JOIN modules m ON l.module_id = m.id
        JOIN courses c ON m.course_id = c.id
        WHERE q.id = quiz_questions.quiz_id
          AND c.organization_id = get_user_organization_id(auth.uid())
    ));

CREATE POLICY "Admins and instructors can manage quiz questions"
    ON quiz_questions FOR ALL
    USING (EXISTS (
        SELECT 1 FROM quizzes q
        JOIN lessons l ON q.lesson_id = l.id
        JOIN modules m ON l.module_id = m.id
        JOIN courses c ON m.course_id = c.id
        WHERE q.id = quiz_questions.quiz_id
          AND c.organization_id = get_user_organization_id(auth.uid())
          AND (user_has_role(auth.uid(), c.organization_id, 'admin')
               OR user_has_role(auth.uid(), c.organization_id, 'instructor'))
    ));

CREATE POLICY "Users can view quiz options"
    ON quiz_options FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM quiz_questions qq
        JOIN quizzes q ON qq.quiz_id = q.id
        JOIN lessons l ON q.lesson_id = l.id
        JOIN modules m ON l.module_id = m.id
        JOIN courses c ON m.course_id = c.id
        WHERE qq.id = quiz_options.question_id
          AND c.organization_id = get_user_organization_id(auth.uid())
    ));

CREATE POLICY "Admins and instructors can manage quiz options"
    ON quiz_options FOR ALL
    USING (EXISTS (
        SELECT 1 FROM quiz_questions qq
        JOIN quizzes q ON qq.quiz_id = q.id
        JOIN lessons l ON q.lesson_id = l.id
        JOIN modules m ON l.module_id = m.id
        JOIN courses c ON m.course_id = c.id
        WHERE qq.id = quiz_options.question_id
          AND c.organization_id = get_user_organization_id(auth.uid())
          AND (user_has_role(auth.uid(), c.organization_id, 'admin')
               OR user_has_role(auth.uid(), c.organization_id, 'instructor'))
    ));

-- ============================================================================
-- QUIZ_ATTEMPTS & QUIZ_ANSWERS
-- Students see own; admin/instructor see all in org
-- ============================================================================
CREATE POLICY "Students can view own quiz attempts"
    ON quiz_attempts FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Students can insert own quiz attempts"
    ON quiz_attempts FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Students can update own quiz attempts"
    ON quiz_attempts FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Admins can view all quiz attempts in org"
    ON quiz_attempts FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM cohorts ch
        WHERE ch.id = quiz_attempts.cohort_id
          AND ch.organization_id = get_user_organization_id(auth.uid())
          AND (user_has_role(auth.uid(), ch.organization_id, 'admin')
               OR user_has_role(auth.uid(), ch.organization_id, 'instructor'))
    ));

CREATE POLICY "Students can view own quiz answers"
    ON quiz_answers FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM quiz_attempts qa WHERE qa.id = quiz_answers.attempt_id AND qa.user_id = auth.uid()
    ));

CREATE POLICY "Students can insert own quiz answers"
    ON quiz_answers FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM quiz_attempts qa WHERE qa.id = quiz_answers.attempt_id AND qa.user_id = auth.uid()
    ));

-- ============================================================================
-- DISCUSSIONS
-- Visible within own org (scoped by cohort or org-wide)
-- ============================================================================
CREATE POLICY "Users can view discussions in own org"
    ON discussions FOR SELECT
    USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Users can create discussions in own org"
    ON discussions FOR INSERT
    WITH CHECK (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Authors can update own discussions"
    ON discussions FOR UPDATE
    USING (author_id = auth.uid());

CREATE POLICY "Admins can manage all discussions"
    ON discussions FOR ALL
    USING (organization_id = get_user_organization_id(auth.uid())
           AND user_has_role(auth.uid(), organization_id, 'admin'));

-- ============================================================================
-- DISCUSSION_POSTS
-- Visible if parent discussion is visible
-- ============================================================================
CREATE POLICY "Users can view posts in accessible discussions"
    ON discussion_posts FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM discussions d
        WHERE d.id = discussion_posts.discussion_id
          AND d.organization_id = get_user_organization_id(auth.uid())
    ));

CREATE POLICY "Users can create posts in non-locked discussions"
    ON discussion_posts FOR INSERT
    WITH CHECK (
        author_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM discussions d
            WHERE d.id = discussion_posts.discussion_id
              AND d.organization_id = get_user_organization_id(auth.uid())
              AND d.is_locked = false
        )
    );

CREATE POLICY "Authors can update own posts"
    ON discussion_posts FOR UPDATE
    USING (author_id = auth.uid());

-- ============================================================================
-- POST_REACTIONS
-- Users can manage own reactions
-- ============================================================================
CREATE POLICY "Users can view reactions"
    ON post_reactions FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM discussion_posts dp
        JOIN discussions d ON dp.discussion_id = d.id
        WHERE dp.id = post_reactions.post_id
          AND d.organization_id = get_user_organization_id(auth.uid())
    ));

CREATE POLICY "Users can manage own reactions"
    ON post_reactions FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own reactions"
    ON post_reactions FOR DELETE
    USING (user_id = auth.uid());

-- ============================================================================
-- ANNOUNCEMENTS
-- Published visible to all in org; draft only to admin/instructor
-- ============================================================================
CREATE POLICY "Users can view published announcements in own org"
    ON announcements FOR SELECT
    USING (organization_id = get_user_organization_id(auth.uid())
           AND (is_published = true
                OR user_has_role(auth.uid(), organization_id, 'admin')
                OR user_has_role(auth.uid(), organization_id, 'instructor')));

CREATE POLICY "Admins and instructors can manage announcements"
    ON announcements FOR ALL
    USING (organization_id = get_user_organization_id(auth.uid())
           AND (user_has_role(auth.uid(), organization_id, 'admin')
                OR user_has_role(auth.uid(), organization_id, 'instructor')));

-- ============================================================================
-- NOTIFICATIONS
-- Users can only see and manage own notifications
-- ============================================================================
CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    USING (user_id = auth.uid());

-- ============================================================================
-- CERTIFICATES
-- Students see own; admin/instructor see all in org
-- ============================================================================
CREATE POLICY "Students can view own certificates"
    ON certificates FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Admins can view all certificates in org"
    ON certificates FOR SELECT
    USING (organization_id = get_user_organization_id(auth.uid())
           AND (user_has_role(auth.uid(), organization_id, 'admin')
                OR user_has_role(auth.uid(), organization_id, 'instructor')));

-- ============================================================================
-- EXTERNAL_PLATFORM_CONFIGS
-- Admin only
-- ============================================================================
CREATE POLICY "Admins can manage external platform configs"
    ON external_platform_configs FOR ALL
    USING (organization_id = get_user_organization_id(auth.uid())
           AND user_has_role(auth.uid(), organization_id, 'admin'));

-- ============================================================================
-- EXTERNAL_ENROLLMENTS
-- Students see own; admin sees all in org
-- ============================================================================
CREATE POLICY "Students can view own external enrollments"
    ON external_enrollments FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Admins can view all external enrollments in org"
    ON external_enrollments FOR SELECT
    USING (organization_id = get_user_organization_id(auth.uid())
           AND user_has_role(auth.uid(), organization_id, 'admin'));

-- ============================================================================
-- EXTERNAL_PROGRESS
-- Students see own; admin sees all in org
-- ============================================================================
CREATE POLICY "Students can view own external progress"
    ON external_progress FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM external_enrollments ee
        WHERE ee.id = external_progress.external_enrollment_id
          AND ee.user_id = auth.uid()
    ));

CREATE POLICY "Admins can view all external progress in org"
    ON external_progress FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM external_enrollments ee
        WHERE ee.id = external_progress.external_enrollment_id
          AND ee.organization_id = get_user_organization_id(auth.uid())
          AND user_has_role(auth.uid(), ee.organization_id, 'admin')
    ));

-- ============================================================================
-- COURSE_FILES
-- Visible within own org; upload by admin/instructor only
-- ============================================================================
CREATE POLICY "Users can view files in own org"
    ON course_files FOR SELECT
    USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Admins and instructors can manage files"
    ON course_files FOR ALL
    USING (organization_id = get_user_organization_id(auth.uid())
           AND (user_has_role(auth.uid(), organization_id, 'admin')
                OR user_has_role(auth.uid(), organization_id, 'instructor')));

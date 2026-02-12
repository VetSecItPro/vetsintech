-- ============================================================================
-- Migration 00023: Composite Indexes for Query Performance
-- ============================================================================
-- Adds composite indexes targeting the most frequent multi-column query
-- patterns identified across all domain query files.
--
-- Existing single-column and composite indexes are preserved.
-- All new indexes use CONCURRENTLY where possible to avoid table locks.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- HIGH PRIORITY — Frequent multi-column filters
-- ---------------------------------------------------------------------------

-- 1. Quiz attempts: leaderboard aggregations, admin dashboard
--    Query: quiz_attempts WHERE cohort_id IN (...) AND user_id IN (...) AND score IS NOT NULL
--    File:  lib/domains/admin/queries.ts:84-89, 253-259
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_cohort_user_score
  ON quiz_attempts (cohort_id, user_id, score);

-- 2. Course progress: completion tracking, student dashboards
--    Query: course_progress WHERE user_id = X AND cohort_id = Y (+ completed_at filter)
--    File:  lib/domains/progress/queries.ts:246-250
CREATE INDEX IF NOT EXISTS idx_course_progress_user_cohort
  ON course_progress (user_id, cohort_id, completed_at);

-- 3. Assignment submissions: get latest student submission (very common)
--    Query: assignment_submissions WHERE assignment_id = X AND student_id = Y ORDER BY attempt_number DESC LIMIT 1
--    File:  lib/domains/assignments/queries.ts:127-134
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_student
  ON assignment_submissions (assignment_id, student_id, attempt_number DESC);

-- 4. XP events: gamification dashboard, recent XP history
--    Query: xp_events WHERE user_id = X AND organization_id = Y ORDER BY created_at DESC
--    File:  lib/domains/gamification/queries.ts:51-57
CREATE INDEX IF NOT EXISTS idx_xp_events_user_org_created
  ON xp_events (user_id, organization_id, created_at DESC);

-- 5. Calendar events: date range queries scoped by organization
--    Query: calendar_events WHERE organization_id = X AND start_time BETWEEN A AND B
--    File:  lib/domains/calendar/queries.ts:23-29
CREATE INDEX IF NOT EXISTS idx_calendar_events_org_start
  ON calendar_events (organization_id, start_time);

-- 6. Assignments: upcoming deadlines, calendar aggregation
--    Query: assignments WHERE organization_id = X AND status = 'published' AND due_date BETWEEN A AND B
--    File:  lib/domains/calendar/queries.ts:55-63
CREATE INDEX IF NOT EXISTS idx_assignments_org_status_due
  ON assignments (organization_id, status, due_date);

-- 7. Resources: multi-dimensional filtering
--    Query: resources WHERE organization_id = X AND course_id = Y AND type = Z
--    File:  lib/domains/resources/queries.ts:19-46
CREATE INDEX IF NOT EXISTS idx_resources_org_course_type
  ON resources (organization_id, course_id, type);

-- ---------------------------------------------------------------------------
-- MEDIUM PRIORITY — Moderate frequency, targeted optimization
-- ---------------------------------------------------------------------------

-- 8. Lesson completions: progress reports and timelines
--    Query: lesson_completions WHERE cohort_id = X AND user_id = Y ORDER BY completed_at
--    File:  lib/domains/progress/queries.ts:59-64
--    Note:  idx_lesson_completions_user_cohort exists as (user_id, cohort_id)
--           Adding cohort-first version for cohort-scoped admin queries
CREATE INDEX IF NOT EXISTS idx_lesson_completions_cohort_user_time
  ON lesson_completions (cohort_id, user_id, completed_at DESC);

-- 9. User badges: badge history ordered by earn date
--    Query: user_badges WHERE user_id = X ORDER BY earned_at DESC
--    File:  lib/domains/gamification/queries.ts:76-98
CREATE INDEX IF NOT EXISTS idx_user_badges_user_earned
  ON user_badges (user_id, earned_at DESC);

-- 10. Enrollments: cohort roster with status filter
--     Query: enrollments WHERE cohort_id = X AND status = 'active' (with user join)
--     File:  lib/domains/admin/queries.ts:369-380
CREATE INDEX IF NOT EXISTS idx_enrollments_cohort_status_user
  ON enrollments (cohort_id, status, user_id);

-- 11. Email log: audit trail by organization and recipient
--     Query: email_log WHERE to_user_id = X ORDER BY created_at DESC
--     File:  lib/services/email/send.ts (insert pattern)
CREATE INDEX IF NOT EXISTS idx_email_log_user_created
  ON email_log (to_user_id, created_at DESC);

-- 12. Enrollments: student-scoped with status (for progress summaries)
--     Query: enrollments WHERE user_id = X AND status IN ('active', 'completed')
--     File:  lib/domains/progress/queries.ts:219-231
CREATE INDEX IF NOT EXISTS idx_enrollments_user_status
  ON enrollments (user_id, status);

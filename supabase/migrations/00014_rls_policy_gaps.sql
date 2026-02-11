-- ============================================================================
-- Migration: 00014_rls_policy_gaps
-- Purpose: Fill RLS policy gaps identified in security audit
-- Adds missing INSERT/UPDATE/DELETE policies for tables where mutations
-- use the user-scoped Supabase client (subject to RLS)
-- ============================================================================

-- ============================================================================
-- COURSE_PROGRESS — Students must be able to upsert their own progress
-- Used by: updateLastAccessed(), markLessonComplete() progress rollup
-- ============================================================================
CREATE POLICY "Students can insert own progress"
    ON course_progress FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Students can update own progress"
    ON course_progress FOR UPDATE
    USING (user_id = auth.uid());

-- ============================================================================
-- NOTIFICATIONS — Users must be able to delete their own notifications
-- Used by: deleteNotification()
-- ============================================================================
CREATE POLICY "Users can delete own notifications"
    ON notifications FOR DELETE
    USING (user_id = auth.uid());

-- ============================================================================
-- CERTIFICATES — Admins must be able to issue and revoke certificates
-- Used by: issueCertificate(), revokeCertificate()
-- ============================================================================
CREATE POLICY "Admins can issue certificates"
    ON certificates FOR INSERT
    WITH CHECK (
        organization_id = get_user_organization_id(auth.uid())
        AND user_has_role(auth.uid(), organization_id, 'admin')
    );

CREATE POLICY "Admins can revoke certificates"
    ON certificates FOR DELETE
    USING (
        organization_id = get_user_organization_id(auth.uid())
        AND user_has_role(auth.uid(), organization_id, 'admin')
    );

-- ============================================================================
-- EXTERNAL_ENROLLMENTS — Admins must be able to sync external enrollments
-- Used by: integration sync engine
-- ============================================================================
CREATE POLICY "Admins can manage external enrollments in org"
    ON external_enrollments FOR ALL
    USING (
        organization_id = get_user_organization_id(auth.uid())
        AND user_has_role(auth.uid(), organization_id, 'admin')
    );

-- ============================================================================
-- EXTERNAL_PROGRESS — Admins must be able to sync external progress
-- Used by: integration sync engine
-- ============================================================================
CREATE POLICY "Admins can manage external progress in org"
    ON external_progress FOR ALL
    USING (EXISTS (
        SELECT 1 FROM external_enrollments ee
        WHERE ee.id = external_progress.external_enrollment_id
          AND ee.organization_id = get_user_organization_id(auth.uid())
          AND user_has_role(auth.uid(), ee.organization_id, 'admin')
    ));

-- ============================================================================
-- NOTIFICATIONS — System/admin must be able to create notifications
-- Used by: createNotification(), createBulkNotifications()
-- Note: These mutations run with the user-scoped client, so admins need
-- INSERT capability for notification creation during announcements, etc.
-- ============================================================================
CREATE POLICY "Admins can create notifications in org"
    ON notifications FOR INSERT
    WITH CHECK (
        organization_id = get_user_organization_id(auth.uid())
        AND (user_has_role(auth.uid(), organization_id, 'admin')
             OR user_has_role(auth.uid(), organization_id, 'instructor'))
    );

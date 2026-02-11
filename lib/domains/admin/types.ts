// ============================================================================
// Admin Domain Types
// Aggregated analytics types for the admin dashboard
// Related: profiles, enrollments, course_progress, quiz_attempts, courses, cohorts
// ============================================================================

// ---------- Dashboard Overview ----------

/** Top-level stats shown in the admin dashboard stat cards */
export interface DashboardStats {
  totalStudents: number;
  activeEnrollments: number;
  completionRate: number;
  activeCourses: number;
  totalCohorts: number;
  avgQuizScore: number;
}

// ---------- Enrollment Trends ----------

/** A single data point for enrollment-over-time charts */
export interface EnrollmentTrend {
  date: string;
  count: number;
}

// ---------- Course-Level Analytics ----------

/** Per-course aggregate metrics for the course analytics table */
export interface CourseAnalytics {
  courseId: string;
  courseTitle: string;
  totalEnrolled: number;
  completionRate: number;
  avgProgress: number;
  avgQuizScore: number;
  dropOffLesson: string | null;
}

// ---------- Student Progress Table ----------

/** A single row in the paginated student progress table */
export interface StudentProgressRow {
  userId: string;
  fullName: string;
  email: string;
  cohortName: string;
  courseTitle: string;
  progressPercentage: number;
  lastActivityAt: string | null;
  quizAvg: number;
}

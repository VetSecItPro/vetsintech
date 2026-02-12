import type { SubmissionStatus, Assignment, AssignmentSubmission } from "./types";

// ============================================================================
// Late Penalty Utilities
// ============================================================================

/**
 * Calculate the late penalty as a percentage.
 * Penalty = late_penalty_percent * number_of_days_late.
 * Capped at 100%.
 */
export function calculateLatePenalty(
  dueDate: string,
  latePenaltyPercent: number
): number {
  if (latePenaltyPercent <= 0) return 0;

  const due = new Date(dueDate).getTime();
  const now = Date.now();

  if (now <= due) return 0;

  const msLate = now - due;
  const daysLate = Math.ceil(msLate / (1000 * 60 * 60 * 24));
  const totalPenalty = daysLate * latePenaltyPercent;

  return Math.min(totalPenalty, 100);
}

/**
 * Check if an assignment is past its due date.
 */
export function isOverdue(dueDate: string): boolean {
  return new Date(dueDate).getTime() < Date.now();
}

// ============================================================================
// Status Utilities
// ============================================================================

/**
 * Get a human-readable label for a submission status.
 */
export function getSubmissionStatusLabel(status: SubmissionStatus): string {
  const labels: Record<SubmissionStatus, string> = {
    not_started: "Not Started",
    draft: "Draft",
    submitted: "Submitted",
    graded: "Graded",
    returned: "Returned",
  };
  return labels[status];
}

/**
 * Get the CSS color class for a submission status badge.
 */
export function getSubmissionStatusColor(status: SubmissionStatus): string {
  const colors: Record<SubmissionStatus, string> = {
    not_started: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    draft: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    submitted: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    graded: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    returned: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  };
  return colors[status];
}

// ============================================================================
// Eligibility Utilities
// ============================================================================

/**
 * Check if a student can submit to an assignment.
 * Returns { allowed, reason } similar to the quiz pattern.
 */
export function canSubmit(
  assignment: Assignment,
  previousAttempts: AssignmentSubmission[]
): { allowed: boolean; reason?: string } {
  // Check if assignment is published
  if (assignment.status !== "published") {
    return { allowed: false, reason: "Assignment is not available" };
  }

  // Count completed attempts
  const completedAttempts = previousAttempts.filter(
    (a) =>
      a.status === "submitted" ||
      a.status === "graded" ||
      a.status === "returned"
  );

  // Check max attempts
  if (
    assignment.max_attempts !== null &&
    completedAttempts.length >= assignment.max_attempts
  ) {
    return {
      allowed: false,
      reason: `Maximum attempts reached (${assignment.max_attempts})`,
    };
  }

  // Check due date
  if (assignment.due_date && isOverdue(assignment.due_date)) {
    if (!assignment.allow_late_submissions) {
      return {
        allowed: false,
        reason: "Assignment is past due and does not accept late submissions",
      };
    }
  }

  return { allowed: true };
}

/**
 * Calculate the number of remaining attempts for a student.
 * Returns null if unlimited.
 */
export function getRemainingAttempts(
  assignment: Assignment,
  previousAttempts: AssignmentSubmission[]
): number | null {
  if (assignment.max_attempts === null) return null;

  const completedAttempts = previousAttempts.filter(
    (a) =>
      a.status === "submitted" ||
      a.status === "graded" ||
      a.status === "returned"
  );

  return Math.max(0, assignment.max_attempts - completedAttempts.length);
}

// ============================================================================
// Formatting Utilities
// ============================================================================

/**
 * Format a score with late penalty information.
 */
export function formatScore(
  score: number | null,
  maxScore: number,
  latePenaltyApplied: number
): string {
  if (score === null) return "Not graded";

  const base = `${score}/${maxScore}`;
  if (latePenaltyApplied > 0) {
    return `${base} (${latePenaltyApplied}% late penalty applied)`;
  }
  return base;
}

/**
 * Format a due date relative to now.
 */
export function formatDueDate(dueDate: string | null): string {
  if (!dueDate) return "No due date";

  const due = new Date(dueDate);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? "s" : ""}`;
  }
  if (diffDays === 0) {
    return "Due today";
  }
  if (diffDays === 1) {
    return "Due tomorrow";
  }
  return `Due in ${diffDays} days`;
}

// ============================================================================
// Gradebook Domain Queries
// Read-only Supabase queries for grade aggregation
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import type {
  GradeConfig,
  GradeOverride,
  GradeCategory,
  GradeItem,
  CategoryGradeSummary,
  StudentGradeSummary,
  CourseGradebook,
} from "./types";
import {
  calculateCategoryGrade,
  calculateOverallGrade,
  gradeToLetter,
} from "./utils";

// ============================================================================
// Grade Configurations
// ============================================================================

/**
 * Get grade weight configurations for a course.
 * Returns an array of { category, weight, drop_lowest } settings.
 */
export async function getGradeConfigs(
  courseId: string
): Promise<GradeConfig[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("grade_configs")
    .select("*")
    .eq("course_id", courseId)
    .order("category", { ascending: true });

  if (error) throw error;
  return data || [];
}

// ============================================================================
// Grade Overrides
// ============================================================================

/**
 * Get manual grade overrides for a course.
 * Optionally filter by student.
 */
export async function getGradeOverrides(
  courseId: string,
  studentId?: string
): Promise<GradeOverride[]> {
  const supabase = await createClient();

  let query = supabase
    .from("grade_overrides")
    .select("*")
    .eq("course_id", courseId)
    .order("created_at", { ascending: true });

  if (studentId) {
    query = query.eq("student_id", studentId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

// ============================================================================
// Student Grades (single student)
// ============================================================================

/**
 * Aggregate all quiz attempts + assignment submissions + overrides
 * for a single student in a course. Builds a full StudentGradeSummary.
 */
export async function getStudentGrades(
  courseId: string,
  studentId: string
): Promise<StudentGradeSummary> {
  const supabase = await createClient();

  // 1. Get grade configs (weights) for this course
  const configs = await getGradeConfigs(courseId);

  // Build a weight map with defaults
  const defaultWeights: Record<GradeCategory, number> = {
    quiz: 25,
    assignment: 25,
    participation: 25,
    extra_credit: 25,
  };
  const weightMap = new Map<GradeCategory, { weight: number; dropLowest: number }>();
  for (const config of configs) {
    weightMap.set(config.category, {
      weight: config.weight,
      dropLowest: config.drop_lowest,
    });
  }

  // 2. Get student name
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", studentId)
    .single();

  const studentName = profile?.full_name || "Unknown";

  // 3. Fetch quiz grades
  // quizzes -> lessons -> modules -> courses
  // quiz_attempts has user_id, quiz_id, score (percentage), completed_at
  const quizItems = await getQuizGradeItems(supabase, courseId, studentId);

  // 4. Fetch assignment grades
  const assignmentItems = await getAssignmentGradeItems(supabase, courseId, studentId);

  // 5. Fetch manual overrides
  const overrides = await getGradeOverrides(courseId, studentId);
  const participationItems: GradeItem[] = [];
  const extraCreditItems: GradeItem[] = [];

  for (const o of overrides) {
    const item: GradeItem = {
      type: "override",
      id: o.id,
      label: o.label,
      score: o.score,
      max_score: o.max_score,
      date: o.created_at,
      notes: o.notes,
    };
    if (o.category === "participation") {
      participationItems.push(item);
    } else if (o.category === "extra_credit") {
      extraCreditItems.push(item);
    } else if (o.category === "quiz") {
      quizItems.push(item);
    } else if (o.category === "assignment") {
      assignmentItems.push(item);
    }
  }

  // 6. Build category summaries
  const categories: CategoryGradeSummary[] = [];

  const buildCategory = (
    category: GradeCategory,
    items: GradeItem[]
  ): CategoryGradeSummary => {
    const config = weightMap.get(category);
    const weight = config?.weight ?? (defaultWeights[category] || 0);
    const dropLowest = config?.dropLowest ?? 0;
    const { earnedPoints, maxPoints, percentage } = calculateCategoryGrade(
      items,
      dropLowest
    );
    return { category, weight, earnedPoints, maxPoints, percentage, items };
  };

  categories.push(buildCategory("quiz", quizItems));
  categories.push(buildCategory("assignment", assignmentItems));
  categories.push(buildCategory("participation", participationItems));
  categories.push(buildCategory("extra_credit", extraCreditItems));

  // 7. Calculate overall grade
  const overallPercentage = calculateOverallGrade(categories);
  const letterGrade = gradeToLetter(overallPercentage);

  return {
    studentId,
    studentName,
    categories,
    overallPercentage,
    letterGrade,
  };
}

// ============================================================================
// Course Gradebook (all students — admin view)
// ============================================================================

/**
 * Build the full gradebook for a course: all enrolled students + their grades.
 */
export async function getCourseGradebook(
  courseId: string
): Promise<CourseGradebook> {
  const supabase = await createClient();

  // 1. Get grade configs
  const configs = await getGradeConfigs(courseId);

  // 2. Get all enrolled students for this course (via cohorts)
  const { data: cohorts, error: cohortError } = await supabase
    .from("cohorts")
    .select("id")
    .eq("course_id", courseId);

  if (cohortError) throw cohortError;

  if (!cohorts || cohorts.length === 0) {
    return { courseId, configs, students: [] };
  }

  const cohortIds = cohorts.map((c) => c.id);

  const { data: enrollments, error: enrollError } = await supabase
    .from("enrollments")
    .select("user_id")
    .in("cohort_id", cohortIds)
    .in("status", ["active", "completed"]);

  if (enrollError) throw enrollError;

  if (!enrollments || enrollments.length === 0) {
    return { courseId, configs, students: [] };
  }

  // Deduplicate student IDs (a student could be in multiple cohorts)
  const studentIds = [...new Set(enrollments.map((e) => e.user_id))];

  // 3. Build grades for each student
  const students: StudentGradeSummary[] = [];
  for (const studentId of studentIds) {
    const summary = await getStudentGrades(courseId, studentId);
    students.push(summary);
  }

  // Sort by name
  students.sort((a, b) => a.studentName.localeCompare(b.studentName));

  return { courseId, configs, students };
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Fetch quiz grade items for a student in a course.
 * Path: course -> modules -> lessons -> quizzes -> quiz_attempts
 * Takes the best (highest score) completed attempt per quiz.
 */
async function getQuizGradeItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  courseId: string,
  studentId: string
): Promise<GradeItem[]> {
  // Get all quizzes for this course through the lesson/module chain
  const { data: quizzes, error: quizError } = await supabase
    .from("quizzes")
    .select(
      `
      id,
      title,
      lesson:lessons!inner(
        id,
        module:modules!inner(
          id,
          course_id
        )
      )
    `
    )
    .eq("lesson.module.course_id", courseId);

  if (quizError) throw quizError;
  if (!quizzes || quizzes.length === 0) return [];

  const quizIds = quizzes.map((q) => q.id);

  // Get all completed attempts for this student on these quizzes
  const { data: attempts, error: attemptError } = await supabase
    .from("quiz_attempts")
    .select("id, quiz_id, score, completed_at")
    .eq("user_id", studentId)
    .in("quiz_id", quizIds)
    .not("completed_at", "is", null)
    .not("score", "is", null);

  if (attemptError) throw attemptError;

  // For each quiz, get the sum of question points (max_score)
  const { data: questionPoints, error: qpError } = await supabase
    .from("quiz_questions")
    .select("quiz_id, points")
    .in("quiz_id", quizIds);

  if (qpError) throw qpError;

  // Sum points per quiz
  const maxScoreByQuiz = new Map<string, number>();
  for (const qp of questionPoints || []) {
    const current = maxScoreByQuiz.get(qp.quiz_id) || 0;
    maxScoreByQuiz.set(qp.quiz_id, current + qp.points);
  }

  // Build a map of quiz_id -> quiz title
  const quizTitleMap = new Map<string, string>();
  for (const q of quizzes) {
    quizTitleMap.set(q.id, q.title);
  }

  // Take the best attempt per quiz
  const bestAttemptByQuiz = new Map<
    string,
    { score: number; completed_at: string }
  >();
  for (const attempt of attempts || []) {
    const existing = bestAttemptByQuiz.get(attempt.quiz_id);
    if (!existing || (attempt.score ?? 0) > existing.score) {
      bestAttemptByQuiz.set(attempt.quiz_id, {
        score: attempt.score ?? 0,
        completed_at: attempt.completed_at!,
      });
    }
  }

  // Build grade items
  const items: GradeItem[] = [];
  for (const quiz of quizzes) {
    const best = bestAttemptByQuiz.get(quiz.id);
    if (!best) continue; // Student hasn't completed this quiz

    const maxScore = maxScoreByQuiz.get(quiz.id) || 100;
    // quiz_attempts.score is a percentage (0-100)
    // Convert to points: earnedPoints = (score / 100) * maxScore
    const earnedPoints = (best.score / 100) * maxScore;

    items.push({
      type: "quiz",
      id: quiz.id,
      label: quizTitleMap.get(quiz.id) || "Quiz",
      score: Math.round(earnedPoints * 100) / 100,
      max_score: maxScore,
      date: best.completed_at,
    });
  }

  return items;
}

/**
 * Fetch assignment grade items for a student in a course.
 * Takes the best (highest score) graded submission per assignment.
 */
async function getAssignmentGradeItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  courseId: string,
  studentId: string
): Promise<GradeItem[]> {
  // Get all published assignments for this course
  const { data: assignments, error: assignError } = await supabase
    .from("assignments")
    .select("id, title, max_score")
    .eq("course_id", courseId)
    .eq("status", "published");

  if (assignError) throw assignError;
  if (!assignments || assignments.length === 0) return [];

  const assignmentIds = assignments.map((a) => a.id);

  // Get all graded submissions for this student
  const { data: submissions, error: subError } = await supabase
    .from("assignment_submissions")
    .select("id, assignment_id, score, graded_at, late_penalty_applied")
    .eq("student_id", studentId)
    .in("assignment_id", assignmentIds)
    .eq("status", "graded")
    .not("score", "is", null);

  if (subError) throw subError;

  // Build assignment title/max_score map
  const assignmentMap = new Map(
    assignments.map((a) => [a.id, { title: a.title, max_score: a.max_score }])
  );

  // Take the best submission per assignment
  const bestByAssignment = new Map<
    string,
    { score: number; graded_at: string }
  >();
  for (const sub of submissions || []) {
    const existing = bestByAssignment.get(sub.assignment_id);
    if (!existing || (sub.score ?? 0) > existing.score) {
      bestByAssignment.set(sub.assignment_id, {
        score: sub.score ?? 0,
        graded_at: sub.graded_at || sub.graded_at || new Date().toISOString(),
      });
    }
  }

  // Build grade items
  const items: GradeItem[] = [];
  for (const assignment of assignments) {
    const best = bestByAssignment.get(assignment.id);
    if (!best) continue; // Student hasn't been graded on this assignment

    const info = assignmentMap.get(assignment.id)!;
    items.push({
      type: "assignment",
      id: assignment.id,
      label: info.title,
      score: best.score,
      max_score: info.max_score,
      date: best.graded_at,
    });
  }

  return items;
}

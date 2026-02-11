import { createClient } from "@/lib/supabase/server";
import type {
  Quiz,
  QuizWithQuestions,
  QuestionWithOptions,
  QuizAttempt,
  AttemptWithAnswers,
} from "./types";

// ============================================================================
// Quiz Queries
// ============================================================================

export async function getQuizByLessonId(
  lessonId: string
): Promise<QuizWithQuestions | null> {
  const supabase = await createClient();

  const { data: quiz, error } = await supabase
    .from("quizzes")
    .select("*")
    .eq("lesson_id", lessonId)
    .maybeSingle();

  if (error) throw error;
  if (!quiz) return null;

  return attachQuestions(quiz);
}

export async function getQuizById(
  quizId: string
): Promise<QuizWithQuestions | null> {
  const supabase = await createClient();

  const { data: quiz, error } = await supabase
    .from("quizzes")
    .select("*")
    .eq("id", quizId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return attachQuestions(quiz);
}

// ============================================================================
// Quiz Attempt Queries
// ============================================================================

export async function getQuizAttempts(
  userId: string,
  quizId: string,
  cohortId: string
): Promise<QuizAttempt[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("quiz_attempts")
    .select("*")
    .eq("user_id", userId)
    .eq("quiz_id", quizId)
    .eq("cohort_id", cohortId)
    .order("started_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getLatestAttempt(
  userId: string,
  quizId: string,
  cohortId: string
): Promise<QuizAttempt | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("quiz_attempts")
    .select("*")
    .eq("user_id", userId)
    .eq("quiz_id", quizId)
    .eq("cohort_id", cohortId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getAttemptWithAnswers(
  attemptId: string
): Promise<AttemptWithAnswers | null> {
  const supabase = await createClient();

  const { data: attempt, error: attemptError } = await supabase
    .from("quiz_attempts")
    .select("*")
    .eq("id", attemptId)
    .single();

  if (attemptError) {
    if (attemptError.code === "PGRST116") return null;
    throw attemptError;
  }

  const { data: answers, error: answersError } = await supabase
    .from("quiz_answers")
    .select("*")
    .eq("attempt_id", attemptId);

  if (answersError) throw answersError;

  return {
    ...attempt,
    answers: answers || [],
  };
}

/**
 * Check if a user can attempt a quiz.
 * Verifies max_attempts has not been exceeded.
 */
export async function canAttemptQuiz(
  userId: string,
  quizId: string,
  cohortId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const supabase = await createClient();

  // Get quiz to check max_attempts
  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .select("max_attempts")
    .eq("id", quizId)
    .single();

  if (quizError) {
    if (quizError.code === "PGRST116") {
      return { allowed: false, reason: "Quiz not found" };
    }
    throw quizError;
  }

  // Unlimited attempts if max_attempts is null
  if (quiz.max_attempts === null) {
    return { allowed: true };
  }

  // Count completed attempts for this user/quiz/cohort
  const { count, error: countError } = await supabase
    .from("quiz_attempts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("quiz_id", quizId)
    .eq("cohort_id", cohortId)
    .not("completed_at", "is", null);

  if (countError) throw countError;

  if ((count || 0) >= quiz.max_attempts) {
    return {
      allowed: false,
      reason: `Maximum attempts reached (${quiz.max_attempts})`,
    };
  }

  return { allowed: true };
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Fetch questions + options for a quiz and attach them.
 */
async function attachQuestions(quiz: Quiz): Promise<QuizWithQuestions> {
  const supabase = await createClient();

  const { data: questions, error: questionsError } = await supabase
    .from("quiz_questions")
    .select("*")
    .eq("quiz_id", quiz.id)
    .order("sort_order", { ascending: true });

  if (questionsError) throw questionsError;

  if (!questions || questions.length === 0) {
    return { ...quiz, questions: [] };
  }

  const questionIds = questions.map((q) => q.id);

  const { data: options, error: optionsError } = await supabase
    .from("quiz_options")
    .select("*")
    .in("question_id", questionIds)
    .order("sort_order", { ascending: true });

  if (optionsError) throw optionsError;

  // Group options by question_id
  const optionsByQuestion = new Map<string, typeof options>();
  for (const opt of options || []) {
    const existing = optionsByQuestion.get(opt.question_id) || [];
    existing.push(opt);
    optionsByQuestion.set(opt.question_id, existing);
  }

  const questionsWithOptions: QuestionWithOptions[] = questions.map((q) => ({
    ...q,
    options: optionsByQuestion.get(q.id) || [],
  }));

  return { ...quiz, questions: questionsWithOptions };
}

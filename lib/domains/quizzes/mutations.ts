import { createClient } from "@/lib/supabase/server";
import type {
  Quiz,
  QuizQuestion,
  QuizOption,
  QuizAttempt,
  QuizResult,
  CreateQuizInput,
  UpdateQuizInput,
  CreateQuestionInput,
  UpdateQuestionInput,
  CreateOptionInput,
  UpdateOptionInput,
  SubmitQuizInput,
} from "./types";
import { getQuizById, canAttemptQuiz } from "./queries";
import { gradeQuiz, isQuizTimedOut } from "./utils";

// ============================================================================
// Quiz Mutations
// ============================================================================

export async function createQuiz(input: CreateQuizInput): Promise<Quiz> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("quizzes")
    .insert({
      lesson_id: input.lesson_id,
      title: input.title,
      description: input.description || null,
      passing_score: input.passing_score ?? 70,
      max_attempts: input.max_attempts ?? 3,
      time_limit_minutes: input.time_limit_minutes ?? null,
      shuffle_questions: input.shuffle_questions ?? false,
      show_correct_answers: input.show_correct_answers ?? true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateQuiz(
  quizId: string,
  input: UpdateQuizInput
): Promise<Quiz> {
  const supabase = await createClient();

  const payload: Record<string, unknown> = {};
  if (input.title !== undefined) payload.title = input.title;
  if (input.description !== undefined) payload.description = input.description;
  if (input.passing_score !== undefined)
    payload.passing_score = input.passing_score;
  if (input.max_attempts !== undefined)
    payload.max_attempts = input.max_attempts;
  if (input.time_limit_minutes !== undefined)
    payload.time_limit_minutes = input.time_limit_minutes;
  if (input.shuffle_questions !== undefined)
    payload.shuffle_questions = input.shuffle_questions;
  if (input.show_correct_answers !== undefined)
    payload.show_correct_answers = input.show_correct_answers;

  const { data, error } = await supabase
    .from("quizzes")
    .update(payload)
    .eq("id", quizId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteQuiz(quizId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("quizzes")
    .delete()
    .eq("id", quizId);

  if (error) throw error;
}

// ============================================================================
// Question Mutations
// ============================================================================

export async function addQuestion(
  input: CreateQuestionInput
): Promise<QuizQuestion> {
  const supabase = await createClient();

  // Get the next sort_order for this quiz
  const { data: lastQuestion } = await supabase
    .from("quiz_questions")
    .select("sort_order")
    .eq("quiz_id", input.quiz_id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (lastQuestion?.sort_order ?? -1) + 1;

  const { data: question, error } = await supabase
    .from("quiz_questions")
    .insert({
      quiz_id: input.quiz_id,
      question_text: input.question_text,
      question_type: input.question_type,
      points: input.points ?? 1,
      sort_order: nextOrder,
      explanation: input.explanation || null,
    })
    .select()
    .single();

  if (error) throw error;

  // Insert options if provided
  if (input.options && input.options.length > 0) {
    await addOptionsToQuestion(question.id, input.options);
  }

  return question;
}

export async function updateQuestion(
  questionId: string,
  input: UpdateQuestionInput
): Promise<QuizQuestion> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("quiz_questions")
    .update(input)
    .eq("id", questionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteQuestion(questionId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("quiz_questions")
    .delete()
    .eq("id", questionId);

  if (error) throw error;
}

export async function reorderQuestions(
  quizId: string,
  questionIds: string[]
): Promise<void> {
  const supabase = await createClient();

  const updates = questionIds.map((id, index) =>
    supabase
      .from("quiz_questions")
      .update({ sort_order: index })
      .eq("id", id)
      .eq("quiz_id", quizId)
  );

  const results = await Promise.all(updates);
  const firstError = results.find((r) => r.error);
  if (firstError?.error) throw firstError.error;
}

// ============================================================================
// Option Mutations
// ============================================================================

export async function addOptionsToQuestion(
  questionId: string,
  options: CreateOptionInput[]
): Promise<QuizOption[]> {
  const supabase = await createClient();

  const rows = options.map((opt, index) => ({
    question_id: questionId,
    option_text: opt.option_text,
    is_correct: opt.is_correct,
    sort_order: opt.sort_order ?? index,
  }));

  const { data, error } = await supabase
    .from("quiz_options")
    .insert(rows)
    .select();

  if (error) throw error;
  return data || [];
}

export async function updateOption(
  optionId: string,
  input: UpdateOptionInput
): Promise<QuizOption> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("quiz_options")
    .update(input)
    .eq("id", optionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteOption(optionId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("quiz_options")
    .delete()
    .eq("id", optionId);

  if (error) throw error;
}

// ============================================================================
// Quiz Submission
// ============================================================================

/**
 * Submit and grade a quiz attempt.
 *
 * 1. Verify the user can still attempt this quiz (max_attempts check)
 * 2. Verify time limit has not been exceeded (if applicable)
 * 3. Load quiz questions + options for grading
 * 4. Auto-grade multiple_choice and true_false; skip short_answer
 * 5. Calculate score as (earned points / total points) * 100
 * 6. Determine passed based on passing_score threshold
 * 7. Insert quiz_attempts and quiz_answers records
 * 8. Return the full QuizResult
 */
export async function submitQuizAttempt(
  input: SubmitQuizInput
): Promise<QuizResult> {
  const supabase = await createClient();

  // 1. Check if user can attempt
  const eligibility = await canAttemptQuiz(
    input.user_id,
    input.quiz_id,
    input.cohort_id
  );
  if (!eligibility.allowed) {
    throw new Error(eligibility.reason || "Cannot attempt this quiz");
  }

  // 2. Load quiz with questions and options
  const quiz = await getQuizById(input.quiz_id);
  if (!quiz) {
    throw new Error("Quiz not found");
  }

  // 3. Grade the attempt
  const { totalPoints, earnedPoints, results } = gradeQuiz(
    quiz.questions,
    input.answers
  );

  const percentage = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
  const passed = percentage >= Number(quiz.passing_score);

  // 4. Insert the attempt record
  const now = new Date().toISOString();
  const { data: attempt, error: attemptError } = await supabase
    .from("quiz_attempts")
    .insert({
      quiz_id: input.quiz_id,
      user_id: input.user_id,
      cohort_id: input.cohort_id,
      score: Math.round(percentage * 100) / 100,
      passed,
      started_at: now,
      completed_at: now,
    })
    .select()
    .single();

  if (attemptError) throw attemptError;

  // 5. Insert individual answer records
  if (input.answers.length > 0) {
    const answerRows = input.answers.map((ans) => {
      const result = results.find((r) => r.question_id === ans.question_id);
      return {
        attempt_id: attempt.id,
        question_id: ans.question_id,
        selected_option_id: ans.selected_option_id || null,
        text_answer: ans.text_answer || null,
        is_correct: result?.is_correct ?? null,
        points_earned: result?.points_earned ?? 0,
      };
    });

    const { error: answersError } = await supabase
      .from("quiz_answers")
      .insert(answerRows);

    if (answersError) throw answersError;
  }

  return {
    attempt,
    total_points: totalPoints,
    earned_points: earnedPoints,
    percentage: Math.round(percentage * 100) / 100,
    passed,
    question_results: results,
  };
}

/**
 * Start a quiz attempt (for timed quizzes).
 * Creates an incomplete attempt record to track the start time.
 */
export async function startQuizAttempt(
  quizId: string,
  userId: string,
  cohortId: string
): Promise<QuizAttempt> {
  const supabase = await createClient();

  // Check eligibility
  const eligibility = await canAttemptQuiz(userId, quizId, cohortId);
  if (!eligibility.allowed) {
    throw new Error(eligibility.reason || "Cannot attempt this quiz");
  }

  const { data, error } = await supabase
    .from("quiz_attempts")
    .insert({
      quiz_id: quizId,
      user_id: userId,
      cohort_id: cohortId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Complete an existing (timed) attempt by submitting answers.
 * Checks time limit and grades the submission.
 */
export async function completeQuizAttempt(
  attemptId: string,
  input: SubmitQuizInput
): Promise<QuizResult> {
  const supabase = await createClient();

  // Load the existing attempt
  const { data: attempt, error: attemptError } = await supabase
    .from("quiz_attempts")
    .select("*")
    .eq("id", attemptId)
    .single();

  if (attemptError) throw attemptError;

  if (attempt.completed_at) {
    throw new Error("This attempt has already been completed");
  }

  // Load quiz
  const quiz = await getQuizById(attempt.quiz_id);
  if (!quiz) {
    throw new Error("Quiz not found");
  }

  // Check time limit
  if (quiz.time_limit_minutes) {
    if (isQuizTimedOut(attempt.started_at, quiz.time_limit_minutes)) {
      throw new Error("Quiz time limit has been exceeded");
    }
  }

  // Grade
  const { totalPoints, earnedPoints, results } = gradeQuiz(
    quiz.questions,
    input.answers
  );

  const percentage = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
  const passed = percentage >= Number(quiz.passing_score);

  const now = new Date().toISOString();
  const startTime = new Date(attempt.started_at).getTime();
  const timeSpentSeconds = Math.round((Date.now() - startTime) / 1000);

  // Update the attempt
  const { data: updated, error: updateError } = await supabase
    .from("quiz_attempts")
    .update({
      score: Math.round(percentage * 100) / 100,
      passed,
      completed_at: now,
      time_spent_seconds: timeSpentSeconds,
    })
    .eq("id", attemptId)
    .select()
    .single();

  if (updateError) throw updateError;

  // Insert answers
  if (input.answers.length > 0) {
    const answerRows = input.answers.map((ans) => {
      const result = results.find((r) => r.question_id === ans.question_id);
      return {
        attempt_id: attemptId,
        question_id: ans.question_id,
        selected_option_id: ans.selected_option_id || null,
        text_answer: ans.text_answer || null,
        is_correct: result?.is_correct ?? null,
        points_earned: result?.points_earned ?? 0,
      };
    });

    const { error: answersError } = await supabase
      .from("quiz_answers")
      .insert(answerRows);

    if (answersError) throw answersError;
  }

  return {
    attempt: updated,
    total_points: totalPoints,
    earned_points: earnedPoints,
    percentage: Math.round(percentage * 100) / 100,
    passed,
    question_results: results,
  };
}

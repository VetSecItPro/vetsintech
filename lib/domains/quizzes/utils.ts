import type {
  QuestionWithOptions,
  SubmitAnswerInput,
  QuestionResult,
} from "./types";

// ============================================================================
// Grading Utilities
// ============================================================================

/**
 * Grade a multiple_choice question by checking if the selected option is correct.
 */
export function gradeMultipleChoice(
  selectedOptionId: string | null,
  options: { id: string; is_correct: boolean }[]
): boolean {
  if (!selectedOptionId) return false;
  const selected = options.find((o) => o.id === selectedOptionId);
  return selected?.is_correct ?? false;
}

/**
 * Grade a true_false question by checking if the selected option is correct.
 * True/false questions use the same options structure as multiple choice.
 */
export function gradeTrueFalse(
  selectedOptionId: string | null,
  options: { id: string; is_correct: boolean }[]
): boolean {
  if (!selectedOptionId) return false;
  const selected = options.find((o) => o.id === selectedOptionId);
  return selected?.is_correct ?? false;
}

/**
 * Grade an entire quiz attempt.
 *
 * Auto-grades multiple_choice and true_false questions.
 * Short answer questions are left ungraded (is_correct = null, points_earned = 0).
 *
 * Returns total points, earned points, and per-question results.
 */
export function gradeQuiz(
  questions: QuestionWithOptions[],
  answers: SubmitAnswerInput[]
): { totalPoints: number; earnedPoints: number; results: QuestionResult[] } {
  const answerMap = new Map<string, SubmitAnswerInput>();
  for (const answer of answers) {
    answerMap.set(answer.question_id, answer);
  }

  let totalPoints = 0;
  let earnedPoints = 0;
  const results: QuestionResult[] = [];

  for (const question of questions) {
    const answer = answerMap.get(question.id);
    const points = Number(question.points);
    totalPoints += points;

    // Find the correct option text for result display
    const correctOption = question.options.find((o) => o.is_correct);
    const correctAnswerText = correctOption?.option_text ?? null;

    if (question.question_type === "short_answer") {
      // Short answer cannot be auto-graded
      results.push({
        question_id: question.id,
        question_text: question.question_text,
        correct_answer: null,
        student_answer: answer?.text_answer ?? null,
        is_correct: false,
        points_earned: 0,
        explanation: question.explanation,
      });
      continue;
    }

    const selectedOptionId = answer?.selected_option_id ?? null;
    let isCorrect = false;

    if (question.question_type === "multiple_choice") {
      isCorrect = gradeMultipleChoice(selectedOptionId, question.options);
    } else if (question.question_type === "true_false") {
      isCorrect = gradeTrueFalse(selectedOptionId, question.options);
    }

    const pointsEarned = isCorrect ? points : 0;
    earnedPoints += pointsEarned;

    // Find the text of the selected option
    const selectedOption = selectedOptionId
      ? question.options.find((o) => o.id === selectedOptionId)
      : null;

    results.push({
      question_id: question.id,
      question_text: question.question_text,
      correct_answer: correctAnswerText,
      student_answer: selectedOption?.option_text ?? null,
      is_correct: isCorrect,
      points_earned: pointsEarned,
      explanation: question.explanation,
    });
  }

  return { totalPoints, earnedPoints, results };
}

// ============================================================================
// Array Utilities
// ============================================================================

/**
 * Fisher-Yates shuffle — returns a new array with elements in random order.
 * Used for shuffling quiz questions when shuffle_questions is enabled.
 */
export function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ============================================================================
// Formatting Utilities
// ============================================================================

/**
 * Format a duration in minutes to a human-readable string.
 * Examples: 15 -> "15 min", 60 -> "1 hr", 90 -> "1 hr 30 min"
 */
export function formatQuizDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${remainingMinutes} min`;
}

/**
 * Check if a timed quiz attempt has exceeded its time limit.
 */
export function isQuizTimedOut(
  startedAt: string,
  timeLimitMinutes: number
): boolean {
  const start = new Date(startedAt).getTime();
  const now = Date.now();
  const elapsed = now - start;
  const limitMs = timeLimitMinutes * 60 * 1000;

  return elapsed > limitMs;
}

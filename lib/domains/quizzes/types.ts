// ============================================================================
// Quiz Domain Types
// Maps to: quizzes, quiz_questions, quiz_options, quiz_attempts, quiz_answers
// ============================================================================

// ---------- Enums (match DB enums) ----------

export type QuestionType = "multiple_choice" | "true_false" | "short_answer";

// ---------- Core Entities ----------

export interface Quiz {
  id: string;
  lesson_id: string;
  title: string;
  description: string | null;
  passing_score: number;
  max_attempts: number | null;
  time_limit_minutes: number | null;
  shuffle_questions: boolean;
  show_correct_answers: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: QuestionType;
  points: number;
  sort_order: number;
  explanation: string | null;
  created_at: string;
}

export interface QuizOption {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  sort_order: number;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  user_id: string;
  cohort_id: string;
  score: number | null;
  passed: boolean | null;
  started_at: string;
  completed_at: string | null;
  time_spent_seconds: number | null;
}

export interface QuizAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  selected_option_id: string | null;
  text_answer: string | null;
  is_correct: boolean | null;
  points_earned: number;
}

// ---------- Joined / Extended Types ----------

export interface QuestionWithOptions extends QuizQuestion {
  options: QuizOption[];
}

export interface QuizWithQuestions extends Quiz {
  questions: QuestionWithOptions[];
}

export interface AttemptWithAnswers extends QuizAttempt {
  answers: QuizAnswer[];
}

// ---------- Input Types (for create/update) ----------

export interface CreateQuizInput {
  lesson_id: string;
  title: string;
  description?: string;
  passing_score?: number;
  max_attempts?: number | null;
  time_limit_minutes?: number | null;
  shuffle_questions?: boolean;
  show_correct_answers?: boolean;
}

export interface UpdateQuizInput {
  title?: string;
  description?: string;
  passing_score?: number;
  max_attempts?: number | null;
  time_limit_minutes?: number | null;
  shuffle_questions?: boolean;
  show_correct_answers?: boolean;
}

export interface CreateQuestionInput {
  quiz_id: string;
  question_text: string;
  question_type: QuestionType;
  points?: number;
  explanation?: string;
  options?: CreateOptionInput[];
}

export interface UpdateQuestionInput {
  question_text?: string;
  question_type?: QuestionType;
  points?: number;
  sort_order?: number;
  explanation?: string;
}

export interface CreateOptionInput {
  option_text: string;
  is_correct: boolean;
  sort_order?: number;
}

export interface UpdateOptionInput {
  option_text?: string;
  is_correct?: boolean;
  sort_order?: number;
}

// ---------- Quiz Submission Types ----------

export interface SubmitQuizInput {
  quiz_id: string;
  user_id: string;
  cohort_id: string;
  answers: SubmitAnswerInput[];
}

export interface SubmitAnswerInput {
  question_id: string;
  selected_option_id?: string | null;
  text_answer?: string | null;
}

// ---------- Quiz Result Types ----------

export interface QuizResult {
  attempt: QuizAttempt;
  total_points: number;
  earned_points: number;
  percentage: number;
  passed: boolean;
  question_results: QuestionResult[];
}

export interface QuestionResult {
  question_id: string;
  question_text: string;
  correct_answer: string | null;
  student_answer: string | null;
  is_correct: boolean;
  points_earned: number;
  explanation: string | null;
}

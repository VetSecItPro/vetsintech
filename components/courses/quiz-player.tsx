"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle, Clock, Loader2 } from "lucide-react";
import type { QuizWithQuestions, QuizResult } from "@/lib/domains/quizzes/types";

interface QuizPlayerProps {
  quiz: QuizWithQuestions;
  cohortId: string;
  previousAttempts: number;
  onComplete?: (result: QuizResult) => void;
}

export function QuizPlayer({
  quiz,
  cohortId,
  previousAttempts,
  onComplete,
}: QuizPlayerProps) {
  const [answers, setAnswers] = useState<
    Record<string, string | null>
  >({});
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const questions = quiz.questions;
  const maxAttemptsReached =
    quiz.max_attempts !== null && previousAttempts >= quiz.max_attempts;

  function selectOption(questionId: string, optionId: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  }

  function setTextAnswer(questionId: string, text: string) {
    setTextAnswers((prev) => ({ ...prev, [questionId]: text }));
  }

  function handleSubmit() {
    setError(null);

    startTransition(async () => {
      try {
        const submissionAnswers = questions.map((q) => ({
          question_id: q.id,
          selected_option_id: answers[q.id] || null,
          text_answer: textAnswers[q.id] || null,
        }));

        const res = await fetch(`/api/quizzes/${quiz.id}/attempt`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cohort_id: cohortId,
            answers: submissionAnswers,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to submit quiz");
        }

        const { data } = await res.json();
        setResult(data);
        onComplete?.(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  // Show results after submission
  if (result) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-2">
            {result.passed ? (
              <CheckCircle className="h-12 w-12 text-green-500" />
            ) : (
              <AlertCircle className="h-12 w-12 text-amber-500" />
            )}
          </div>
          <CardTitle>
            {result.passed ? "Congratulations!" : "Quiz Complete"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center gap-8 text-center">
            <div>
              <p className="text-3xl font-bold">
                {Math.round(result.percentage)}%
              </p>
              <p className="text-sm text-slate-500">Score</p>
            </div>
            <div>
              <p className="text-3xl font-bold">
                {result.earned_points}/{result.total_points}
              </p>
              <p className="text-sm text-slate-500">Points</p>
            </div>
          </div>

          {!result.passed && (
            <p className="text-center text-sm text-slate-500">
              You need {quiz.passing_score}% to pass.
              {quiz.max_attempts &&
                ` You have ${quiz.max_attempts - previousAttempts - 1} attempt(s) remaining.`}
            </p>
          )}

          {/* Show answers if quiz allows it */}
          {quiz.show_correct_answers && result.question_results.length > 0 && (
            <div className="mt-6 space-y-3">
              <h3 className="font-semibold">Review Answers</h3>
              {result.question_results.map((qr, idx) => (
                <div
                  key={qr.question_id}
                  className={cn(
                    "rounded-lg border p-3",
                    qr.is_correct
                      ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
                      : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"
                  )}
                >
                  <p className="text-sm font-medium">
                    {idx + 1}. {qr.question_text}
                  </p>
                  <p className="mt-1 text-xs">
                    Your answer:{" "}
                    <span className="font-medium">
                      {qr.student_answer || "No answer"}
                    </span>
                  </p>
                  {!qr.is_correct && qr.correct_answer && (
                    <p className="text-xs text-green-700 dark:text-green-400">
                      Correct: {qr.correct_answer}
                    </p>
                  )}
                  {qr.explanation && (
                    <p className="mt-1 text-xs italic text-slate-500">
                      {qr.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (maxAttemptsReached) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-slate-400" />
          <p className="mt-3 font-medium">Maximum attempts reached</p>
          <p className="text-sm text-slate-500">
            You have used all {quiz.max_attempts} attempt(s) for this quiz.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{quiz.title}</CardTitle>
        {quiz.description && (
          <p className="text-sm text-slate-500">{quiz.description}</p>
        )}
        <div className="flex flex-wrap gap-3 text-xs text-slate-400">
          <span>{questions.length} question{questions.length !== 1 ? "s" : ""}</span>
          <span>Pass: {quiz.passing_score}%</span>
          {quiz.time_limit_minutes && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {quiz.time_limit_minutes} min
            </span>
          )}
          {quiz.max_attempts && (
            <span>
              Attempt {previousAttempts + 1}/{quiz.max_attempts}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {questions.map((question, qIdx) => (
          <div key={question.id} className="space-y-2">
            <p className="font-medium">
              {qIdx + 1}. {question.question_text}
              {question.points > 1 && (
                <span className="ml-2 text-xs text-slate-400">
                  ({question.points} pts)
                </span>
              )}
            </p>

            {/* Multiple choice / True-false options */}
            {(question.question_type === "multiple_choice" ||
              question.question_type === "true_false") &&
              question.options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => selectOption(question.id, opt.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border px-4 py-2.5 text-left text-sm transition-colors",
                    answers[question.id] === opt.id
                      ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950 dark:text-blue-300"
                      : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs",
                      answers[question.id] === opt.id
                        ? "border-blue-500 bg-blue-500 text-white"
                        : "border-slate-300"
                    )}
                  >
                    {answers[question.id] === opt.id && "✓"}
                  </span>
                  {opt.option_text}
                </button>
              ))}

            {/* Short answer */}
            {question.question_type === "short_answer" && (
              <textarea
                value={textAnswers[question.id] || ""}
                onChange={(e) => setTextAnswer(question.id, e.target.value)}
                placeholder="Type your answer..."
                className="w-full rounded-lg border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                rows={3}
              />
            )}
          </div>
        ))}

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <Button
          onClick={handleSubmit}
          disabled={isPending}
          className="w-full"
          size="lg"
        >
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Submit Quiz
        </Button>
      </CardContent>
    </Card>
  );
}

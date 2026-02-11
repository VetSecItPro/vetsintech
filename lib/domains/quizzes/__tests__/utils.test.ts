import {
  gradeMultipleChoice,
  gradeTrueFalse,
  gradeQuiz,
  shuffleArray,
  formatQuizDuration,
  isQuizTimedOut,
} from "@/lib/domains/quizzes/utils";
import type {
  QuestionWithOptions,
  QuizOption,
  SubmitAnswerInput,
} from "@/lib/domains/quizzes/types";

// ============================================================================
// Test Fixture Helpers
// ============================================================================

function makeOption(overrides: Partial<QuizOption> = {}): QuizOption {
  return {
    id: "opt-1",
    question_id: "q-1",
    option_text: "Option A",
    is_correct: false,
    sort_order: 0,
    ...overrides,
  };
}

function makeQuestion(
  overrides: Partial<QuestionWithOptions> = {}
): QuestionWithOptions {
  return {
    id: "q-1",
    quiz_id: "quiz-1",
    question_text: "Sample question?",
    question_type: "multiple_choice",
    points: 10,
    sort_order: 0,
    explanation: null,
    created_at: "2025-01-01T00:00:00Z",
    options: [
      makeOption({ id: "opt-a", option_text: "A", is_correct: false }),
      makeOption({ id: "opt-b", option_text: "B", is_correct: true }),
      makeOption({ id: "opt-c", option_text: "C", is_correct: false }),
    ],
    ...overrides,
  };
}

function makeAnswer(overrides: Partial<SubmitAnswerInput> = {}): SubmitAnswerInput {
  return {
    question_id: "q-1",
    selected_option_id: null,
    text_answer: null,
    ...overrides,
  };
}

// ============================================================================
// gradeMultipleChoice
// ============================================================================

describe("gradeMultipleChoice", () => {
  const options = [
    { id: "opt-a", is_correct: false },
    { id: "opt-b", is_correct: true },
    { id: "opt-c", is_correct: false },
  ];

  it("returns true when the selected option is correct", () => {
    expect(gradeMultipleChoice("opt-b", options)).toBe(true);
  });

  it("returns false when the selected option is incorrect", () => {
    expect(gradeMultipleChoice("opt-a", options)).toBe(false);
    expect(gradeMultipleChoice("opt-c", options)).toBe(false);
  });

  it("returns false when selectedOptionId is null", () => {
    expect(gradeMultipleChoice(null, options)).toBe(false);
  });

  it("returns false when selectedOptionId is not found in options", () => {
    expect(gradeMultipleChoice("opt-nonexistent", options)).toBe(false);
  });

  it("returns false when options array is empty", () => {
    expect(gradeMultipleChoice("opt-a", [])).toBe(false);
  });

  it("handles multiple correct options by returning true for any correct one", () => {
    const multiCorrect = [
      { id: "opt-a", is_correct: true },
      { id: "opt-b", is_correct: true },
      { id: "opt-c", is_correct: false },
    ];
    expect(gradeMultipleChoice("opt-a", multiCorrect)).toBe(true);
    expect(gradeMultipleChoice("opt-b", multiCorrect)).toBe(true);
    expect(gradeMultipleChoice("opt-c", multiCorrect)).toBe(false);
  });
});

// ============================================================================
// gradeTrueFalse
// ============================================================================

describe("gradeTrueFalse", () => {
  const options = [
    { id: "opt-true", is_correct: true },
    { id: "opt-false", is_correct: false },
  ];

  it("returns true when the correct option (True) is selected", () => {
    expect(gradeTrueFalse("opt-true", options)).toBe(true);
  });

  it("returns false when the incorrect option (False) is selected", () => {
    expect(gradeTrueFalse("opt-false", options)).toBe(false);
  });

  it("returns false when selectedOptionId is null", () => {
    expect(gradeTrueFalse(null, options)).toBe(false);
  });

  it("returns false when selectedOptionId does not match any option", () => {
    expect(gradeTrueFalse("opt-missing", options)).toBe(false);
  });
});

// ============================================================================
// gradeQuiz
// ============================================================================

describe("gradeQuiz", () => {
  describe("all correct answers", () => {
    it("awards full points for all correct multiple choice answers", () => {
      const questions: QuestionWithOptions[] = [
        makeQuestion({
          id: "q-1",
          points: 10,
          options: [
            makeOption({ id: "q1-a", option_text: "Wrong", is_correct: false }),
            makeOption({ id: "q1-b", option_text: "Right", is_correct: true }),
          ],
        }),
        makeQuestion({
          id: "q-2",
          points: 5,
          options: [
            makeOption({ id: "q2-a", option_text: "Right", is_correct: true }),
            makeOption({ id: "q2-b", option_text: "Wrong", is_correct: false }),
          ],
        }),
      ];

      const answers: SubmitAnswerInput[] = [
        makeAnswer({ question_id: "q-1", selected_option_id: "q1-b" }),
        makeAnswer({ question_id: "q-2", selected_option_id: "q2-a" }),
      ];

      const result = gradeQuiz(questions, answers);

      expect(result.totalPoints).toBe(15);
      expect(result.earnedPoints).toBe(15);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].is_correct).toBe(true);
      expect(result.results[0].points_earned).toBe(10);
      expect(result.results[1].is_correct).toBe(true);
      expect(result.results[1].points_earned).toBe(5);
    });
  });

  describe("all wrong answers", () => {
    it("awards zero points for all wrong answers", () => {
      const questions: QuestionWithOptions[] = [
        makeQuestion({
          id: "q-1",
          points: 10,
          options: [
            makeOption({ id: "q1-a", option_text: "Wrong", is_correct: false }),
            makeOption({ id: "q1-b", option_text: "Right", is_correct: true }),
          ],
        }),
        makeQuestion({
          id: "q-2",
          points: 5,
          options: [
            makeOption({ id: "q2-a", option_text: "Right", is_correct: true }),
            makeOption({ id: "q2-b", option_text: "Wrong", is_correct: false }),
          ],
        }),
      ];

      const answers: SubmitAnswerInput[] = [
        makeAnswer({ question_id: "q-1", selected_option_id: "q1-a" }),
        makeAnswer({ question_id: "q-2", selected_option_id: "q2-b" }),
      ];

      const result = gradeQuiz(questions, answers);

      expect(result.totalPoints).toBe(15);
      expect(result.earnedPoints).toBe(0);
      expect(result.results[0].is_correct).toBe(false);
      expect(result.results[0].points_earned).toBe(0);
      expect(result.results[1].is_correct).toBe(false);
      expect(result.results[1].points_earned).toBe(0);
    });
  });

  describe("mixed answers", () => {
    it("awards partial points for a mix of correct and wrong answers", () => {
      const questions: QuestionWithOptions[] = [
        makeQuestion({
          id: "q-1",
          points: 10,
          question_type: "multiple_choice",
          options: [
            makeOption({ id: "q1-a", option_text: "Wrong", is_correct: false }),
            makeOption({ id: "q1-b", option_text: "Right", is_correct: true }),
          ],
        }),
        makeQuestion({
          id: "q-2",
          points: 5,
          question_type: "true_false",
          options: [
            makeOption({ id: "q2-true", option_text: "True", is_correct: true }),
            makeOption({ id: "q2-false", option_text: "False", is_correct: false }),
          ],
        }),
        makeQuestion({
          id: "q-3",
          points: 20,
          question_type: "multiple_choice",
          options: [
            makeOption({ id: "q3-a", option_text: "A", is_correct: false }),
            makeOption({ id: "q3-b", option_text: "B", is_correct: true }),
          ],
        }),
      ];

      const answers: SubmitAnswerInput[] = [
        makeAnswer({ question_id: "q-1", selected_option_id: "q1-b" }), // correct
        makeAnswer({ question_id: "q-2", selected_option_id: "q2-false" }), // wrong
        makeAnswer({ question_id: "q-3", selected_option_id: "q3-a" }), // wrong
      ];

      const result = gradeQuiz(questions, answers);

      expect(result.totalPoints).toBe(35);
      expect(result.earnedPoints).toBe(10);
      expect(result.results[0].is_correct).toBe(true);
      expect(result.results[0].points_earned).toBe(10);
      expect(result.results[1].is_correct).toBe(false);
      expect(result.results[1].points_earned).toBe(0);
      expect(result.results[2].is_correct).toBe(false);
      expect(result.results[2].points_earned).toBe(0);
    });
  });

  describe("short_answer questions", () => {
    it("marks short_answer as is_correct=false and points_earned=0 (cannot auto-grade)", () => {
      const questions: QuestionWithOptions[] = [
        makeQuestion({
          id: "q-sa",
          points: 15,
          question_type: "short_answer",
          question_text: "Explain the concept.",
          explanation: "A good explanation covers X, Y, Z.",
          options: [],
        }),
      ];

      const answers: SubmitAnswerInput[] = [
        makeAnswer({
          question_id: "q-sa",
          selected_option_id: null,
          text_answer: "My short answer here.",
        }),
      ];

      const result = gradeQuiz(questions, answers);

      expect(result.totalPoints).toBe(15);
      expect(result.earnedPoints).toBe(0);
      expect(result.results).toHaveLength(1);

      const saResult = result.results[0];
      expect(saResult.is_correct).toBe(false);
      expect(saResult.points_earned).toBe(0);
      expect(saResult.correct_answer).toBeNull();
      expect(saResult.student_answer).toBe("My short answer here.");
      expect(saResult.explanation).toBe("A good explanation covers X, Y, Z.");
    });

    it("handles short_answer with no text answer provided", () => {
      const questions: QuestionWithOptions[] = [
        makeQuestion({
          id: "q-sa",
          points: 10,
          question_type: "short_answer",
          options: [],
        }),
      ];

      const answers: SubmitAnswerInput[] = [
        makeAnswer({ question_id: "q-sa" }),
      ];

      const result = gradeQuiz(questions, answers);
      expect(result.results[0].student_answer).toBeNull();
    });
  });

  describe("mixed question types including short_answer", () => {
    it("grades auto-gradable questions and leaves short_answer ungraded", () => {
      const questions: QuestionWithOptions[] = [
        makeQuestion({
          id: "q-mc",
          points: 10,
          question_type: "multiple_choice",
          options: [
            makeOption({ id: "mc-a", option_text: "A", is_correct: true }),
            makeOption({ id: "mc-b", option_text: "B", is_correct: false }),
          ],
        }),
        makeQuestion({
          id: "q-tf",
          points: 5,
          question_type: "true_false",
          options: [
            makeOption({ id: "tf-t", option_text: "True", is_correct: false }),
            makeOption({ id: "tf-f", option_text: "False", is_correct: true }),
          ],
        }),
        makeQuestion({
          id: "q-sa",
          points: 20,
          question_type: "short_answer",
          options: [],
        }),
      ];

      const answers: SubmitAnswerInput[] = [
        makeAnswer({ question_id: "q-mc", selected_option_id: "mc-a" }),
        makeAnswer({ question_id: "q-tf", selected_option_id: "tf-f" }),
        makeAnswer({ question_id: "q-sa", text_answer: "Essay response." }),
      ];

      const result = gradeQuiz(questions, answers);

      expect(result.totalPoints).toBe(35);
      expect(result.earnedPoints).toBe(15); // 10 + 5, short_answer excluded
      expect(result.results[0].is_correct).toBe(true);
      expect(result.results[1].is_correct).toBe(true);
      expect(result.results[2].is_correct).toBe(false);
      expect(result.results[2].points_earned).toBe(0);
    });
  });

  describe("no answers provided for a question", () => {
    it("treats unanswered questions as incorrect", () => {
      const questions: QuestionWithOptions[] = [
        makeQuestion({
          id: "q-1",
          points: 10,
          options: [
            makeOption({ id: "q1-a", option_text: "A", is_correct: true }),
          ],
        }),
      ];

      // Empty answers array -- student skipped all questions
      const result = gradeQuiz(questions, []);

      expect(result.totalPoints).toBe(10);
      expect(result.earnedPoints).toBe(0);
      expect(result.results[0].is_correct).toBe(false);
      expect(result.results[0].points_earned).toBe(0);
      expect(result.results[0].student_answer).toBeNull();
    });
  });

  describe("empty quiz (no questions)", () => {
    it("returns zero totals and empty results", () => {
      const result = gradeQuiz([], []);

      expect(result.totalPoints).toBe(0);
      expect(result.earnedPoints).toBe(0);
      expect(result.results).toHaveLength(0);
    });
  });

  describe("result metadata", () => {
    it("populates question_text, correct_answer, student_answer, and explanation", () => {
      const questions: QuestionWithOptions[] = [
        makeQuestion({
          id: "q-1",
          question_text: "What is 2+2?",
          explanation: "Basic arithmetic.",
          points: 5,
          options: [
            makeOption({ id: "q1-a", option_text: "3", is_correct: false }),
            makeOption({ id: "q1-b", option_text: "4", is_correct: true }),
            makeOption({ id: "q1-c", option_text: "5", is_correct: false }),
          ],
        }),
      ];

      const answers: SubmitAnswerInput[] = [
        makeAnswer({ question_id: "q-1", selected_option_id: "q1-a" }),
      ];

      const result = gradeQuiz(questions, answers);
      const qResult = result.results[0];

      expect(qResult.question_id).toBe("q-1");
      expect(qResult.question_text).toBe("What is 2+2?");
      expect(qResult.correct_answer).toBe("4");
      expect(qResult.student_answer).toBe("3");
      expect(qResult.is_correct).toBe(false);
      expect(qResult.points_earned).toBe(0);
      expect(qResult.explanation).toBe("Basic arithmetic.");
    });

    it("sets correct_answer to null when no option is marked correct", () => {
      const questions: QuestionWithOptions[] = [
        makeQuestion({
          id: "q-1",
          points: 5,
          options: [
            makeOption({ id: "q1-a", option_text: "A", is_correct: false }),
            makeOption({ id: "q1-b", option_text: "B", is_correct: false }),
          ],
        }),
      ];

      const answers: SubmitAnswerInput[] = [
        makeAnswer({ question_id: "q-1", selected_option_id: "q1-a" }),
      ];

      const result = gradeQuiz(questions, answers);
      expect(result.results[0].correct_answer).toBeNull();
    });
  });
});

// ============================================================================
// shuffleArray
// ============================================================================

describe("shuffleArray", () => {
  it("returns a new array with the same length", () => {
    const original = [1, 2, 3, 4, 5];
    const shuffled = shuffleArray(original);

    expect(shuffled).toHaveLength(original.length);
    expect(shuffled).not.toBe(original); // different reference
  });

  it("preserves all elements (same set of items)", () => {
    const original = [10, 20, 30, 40, 50];
    const shuffled = shuffleArray(original);

    expect(shuffled.sort((a, b) => a - b)).toEqual(
      original.sort((a, b) => a - b)
    );
  });

  it("does not modify the original array", () => {
    const original = [1, 2, 3, 4, 5];
    const copy = [...original];
    shuffleArray(original);

    expect(original).toEqual(copy);
  });

  it("handles an empty array", () => {
    const result = shuffleArray([]);

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it("handles a single-element array", () => {
    const result = shuffleArray(["only"]);

    expect(result).toEqual(["only"]);
    expect(result).toHaveLength(1);
  });

  it("handles a two-element array", () => {
    const original = ["a", "b"];
    const result = shuffleArray(original);

    expect(result).toHaveLength(2);
    expect(result).toContain("a");
    expect(result).toContain("b");
  });

  it("works with complex objects", () => {
    const original = [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
      { id: 3, name: "Charlie" },
    ];
    const shuffled = shuffleArray(original);

    expect(shuffled).toHaveLength(3);
    for (const item of original) {
      expect(shuffled).toContainEqual(item);
    }
  });

  it("eventually produces a different order (probabilistic)", () => {
    const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    let differentOrderSeen = false;

    // Run multiple shuffles; at least one should differ from the original
    for (let i = 0; i < 20; i++) {
      const shuffled = shuffleArray(original);
      if (shuffled.some((val, idx) => val !== original[idx])) {
        differentOrderSeen = true;
        break;
      }
    }

    expect(differentOrderSeen).toBe(true);
  });
});

// ============================================================================
// formatQuizDuration
// ============================================================================

describe("formatQuizDuration", () => {
  it('formats minutes under 60 as "<n> min"', () => {
    expect(formatQuizDuration(15)).toBe("15 min");
    expect(formatQuizDuration(1)).toBe("1 min");
    expect(formatQuizDuration(59)).toBe("59 min");
  });

  it('formats exactly 60 minutes as "1 hr"', () => {
    expect(formatQuizDuration(60)).toBe("1 hr");
  });

  it('formats multiples of 60 as "<n> hr"', () => {
    expect(formatQuizDuration(120)).toBe("2 hr");
    expect(formatQuizDuration(180)).toBe("3 hr");
  });

  it('formats minutes over 60 with remainder as "<n> hr <m> min"', () => {
    expect(formatQuizDuration(90)).toBe("1 hr 30 min");
    expect(formatQuizDuration(75)).toBe("1 hr 15 min");
    expect(formatQuizDuration(150)).toBe("2 hr 30 min");
    expect(formatQuizDuration(61)).toBe("1 hr 1 min");
  });

  it('formats 0 minutes as "0 min"', () => {
    expect(formatQuizDuration(0)).toBe("0 min");
  });
});

// ============================================================================
// isQuizTimedOut
// ============================================================================

describe("isQuizTimedOut", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns false when elapsed time is within the time limit", () => {
    const startedAt = "2025-06-01T10:00:00Z";
    // Set "now" to 10 minutes after start
    vi.setSystemTime(new Date("2025-06-01T10:10:00Z"));

    expect(isQuizTimedOut(startedAt, 30)).toBe(false);
  });

  it("returns true when elapsed time exceeds the time limit", () => {
    const startedAt = "2025-06-01T10:00:00Z";
    // Set "now" to 31 minutes after start (limit is 30)
    vi.setSystemTime(new Date("2025-06-01T10:31:00Z"));

    expect(isQuizTimedOut(startedAt, 30)).toBe(true);
  });

  it("returns false when elapsed time is exactly at the limit (not exceeded)", () => {
    const startedAt = "2025-06-01T10:00:00Z";
    // Set "now" to exactly 30 minutes after start
    vi.setSystemTime(new Date("2025-06-01T10:30:00Z"));

    // elapsed === limitMs, and the check is `elapsed > limitMs`, so NOT timed out
    expect(isQuizTimedOut(startedAt, 30)).toBe(false);
  });

  it("returns true one millisecond after the limit", () => {
    const startedAt = "2025-06-01T10:00:00Z";
    // 30 minutes = 1,800,000 ms; set to 1 ms past the limit
    vi.setSystemTime(new Date(new Date("2025-06-01T10:00:00Z").getTime() + 1_800_001));

    expect(isQuizTimedOut(startedAt, 30)).toBe(true);
  });

  it("returns false when time limit is 0 and checked immediately", () => {
    const startedAt = "2025-06-01T10:00:00Z";
    vi.setSystemTime(new Date("2025-06-01T10:00:00Z"));

    // elapsed = 0, limit = 0; 0 > 0 is false
    expect(isQuizTimedOut(startedAt, 0)).toBe(false);
  });

  it("returns true for a 0-minute limit when any time has passed", () => {
    const startedAt = "2025-06-01T10:00:00Z";
    vi.setSystemTime(new Date("2025-06-01T10:00:01Z"));

    // elapsed = 1000ms, limit = 0ms; 1000 > 0 is true
    expect(isQuizTimedOut(startedAt, 0)).toBe(true);
  });

  it("handles large time limits correctly", () => {
    const startedAt = "2025-06-01T10:00:00Z";
    // 3 hours = 180 minutes; check at 2 hours 59 minutes
    vi.setSystemTime(new Date("2025-06-01T12:59:00Z"));

    expect(isQuizTimedOut(startedAt, 180)).toBe(false);

    // Check at 3 hours 1 minute
    vi.setSystemTime(new Date("2025-06-01T13:01:00Z"));
    expect(isQuizTimedOut(startedAt, 180)).toBe(true);
  });
});

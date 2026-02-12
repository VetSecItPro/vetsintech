import type {
  GradeItem,
  CategoryGradeSummary,
  CourseGradebook,
  StudentGradeSummary,
} from "./types";

// ============================================================================
// Grade Calculation
// ============================================================================

/**
 * Calculate the average grade for a category, optionally dropping N lowest scores.
 * Returns { earnedPoints, maxPoints, percentage }.
 */
export function calculateCategoryGrade(
  items: GradeItem[],
  dropLowest: number = 0
): { earnedPoints: number; maxPoints: number; percentage: number } {
  if (items.length === 0) {
    return { earnedPoints: 0, maxPoints: 0, percentage: 0 };
  }

  // Calculate percentage for each item and sort ascending
  const itemsWithPct = items.map((item) => ({
    ...item,
    pct: item.max_score > 0 ? item.score / item.max_score : 0,
  }));

  // Sort by percentage ascending so we can drop the lowest
  itemsWithPct.sort((a, b) => a.pct - b.pct);

  // Drop the N lowest (only if we have more items than we're dropping)
  const effectiveDrop = Math.min(dropLowest, Math.max(0, items.length - 1));
  const kept = itemsWithPct.slice(effectiveDrop);

  const earnedPoints = kept.reduce((sum, item) => sum + item.score, 0);
  const maxPoints = kept.reduce((sum, item) => sum + item.max_score, 0);
  const percentage = maxPoints > 0 ? (earnedPoints / maxPoints) * 100 : 0;

  return { earnedPoints, maxPoints, percentage };
}

/**
 * Calculate the overall weighted grade across all categories.
 * Only categories that have items contribute to the weighted average.
 * If no categories have items, returns 0.
 */
export function calculateOverallGrade(
  categories: CategoryGradeSummary[]
): number {
  // Only include categories that have at least one graded item
  const activeCategories = categories.filter((c) => c.items.length > 0);

  if (activeCategories.length === 0) return 0;

  // Re-normalize weights so active categories sum to 100%
  const totalWeight = activeCategories.reduce((sum, c) => sum + c.weight, 0);

  if (totalWeight === 0) return 0;

  const weightedSum = activeCategories.reduce(
    (sum, c) => sum + c.percentage * (c.weight / totalWeight),
    0
  );

  return weightedSum;
}

// ============================================================================
// Letter Grade Conversion
// ============================================================================

/**
 * Convert a numeric percentage to a letter grade.
 * Standard scale: A (93+), A- (90+), B+ (87+), B (83+), B- (80+),
 * C+ (77+), C (73+), C- (70+), D+ (67+), D (63+), D- (60+), F (<60).
 */
export function gradeToLetter(percentage: number): string {
  if (percentage >= 93) return "A";
  if (percentage >= 90) return "A-";
  if (percentage >= 87) return "B+";
  if (percentage >= 83) return "B";
  if (percentage >= 80) return "B-";
  if (percentage >= 77) return "C+";
  if (percentage >= 73) return "C";
  if (percentage >= 70) return "C-";
  if (percentage >= 67) return "D+";
  if (percentage >= 63) return "D";
  if (percentage >= 60) return "D-";
  return "F";
}

// ============================================================================
// Formatting Utilities
// ============================================================================

/**
 * Format a percentage value for display (e.g., 85.2%).
 */
export function formatGradePercentage(percentage: number): string {
  return `${percentage.toFixed(1)}%`;
}

/**
 * Get Tailwind color classes for a letter grade.
 * A = green, B = blue, C = yellow, D = orange, F = red.
 */
export function getGradeColor(letterGrade: string): string {
  const base = letterGrade.charAt(0);
  switch (base) {
    case "A":
      return "text-green-600 dark:text-green-400";
    case "B":
      return "text-blue-600 dark:text-blue-400";
    case "C":
      return "text-yellow-600 dark:text-yellow-400";
    case "D":
      return "text-orange-600 dark:text-orange-400";
    case "F":
      return "text-red-600 dark:text-red-400";
    default:
      return "text-slate-600 dark:text-slate-400";
  }
}

/**
 * Get Tailwind background color classes for a letter grade badge.
 */
export function getGradeBgColor(letterGrade: string): string {
  const base = letterGrade.charAt(0);
  switch (base) {
    case "A":
      return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
    case "B":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
    case "C":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
    case "D":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300";
    case "F":
      return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
}

/**
 * Get the human-readable label for a grade category.
 */
export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    quiz: "Quizzes",
    assignment: "Assignments",
    participation: "Participation",
    extra_credit: "Extra Credit",
  };
  return labels[category] || category;
}

// ============================================================================
// CSV Export
// ============================================================================

/**
 * Generate a CSV string for a course gradebook export.
 * Columns: Student Name, then each grade item, then Category Averages, Overall Grade, Letter Grade.
 */
export function exportGradebookCSV(gradebook: CourseGradebook): string {
  if (gradebook.students.length === 0) {
    return "No students enrolled";
  }

  // Collect all unique grade items across all students for column headers
  const allItemLabels = new Map<string, string>();
  for (const student of gradebook.students) {
    for (const cat of student.categories) {
      for (const item of cat.items) {
        const key = `${cat.category}:${item.label}`;
        if (!allItemLabels.has(key)) {
          allItemLabels.set(key, `${getCategoryLabel(cat.category)} - ${item.label}`);
        }
      }
    }
  }

  const itemKeys = Array.from(allItemLabels.keys());
  const categoryNames = gradebook.configs.map((c) => getCategoryLabel(c.category));

  // Build header row
  const headers = [
    "Student Name",
    ...itemKeys.map((k) => allItemLabels.get(k)!),
    ...categoryNames.map((n) => `${n} Avg`),
    "Overall %",
    "Letter Grade",
  ];

  // Build data rows
  const rows: string[][] = gradebook.students.map((student) => {
    const itemScores = itemKeys.map((key) => {
      const [cat] = key.split(":");
      const category = student.categories.find((c) => c.category === cat);
      const label = key.substring(key.indexOf(":") + 1);
      const item = category?.items.find((i) => i.label === label);
      return item ? `${item.score}/${item.max_score}` : "";
    });

    const categoryAvgs = gradebook.configs.map((config) => {
      const cat = student.categories.find(
        (c) => c.category === config.category
      );
      return cat && cat.items.length > 0
        ? formatGradePercentage(cat.percentage)
        : "N/A";
    });

    return [
      student.studentName,
      ...itemScores,
      ...categoryAvgs,
      formatGradePercentage(student.overallPercentage),
      student.letterGrade,
    ];
  });

  // Escape CSV fields
  const escapeCSV = (field: string): string => {
    if (field.includes(",") || field.includes('"') || field.includes("\n")) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  };

  const csvLines = [
    headers.map(escapeCSV).join(","),
    ...rows.map((row) => row.map(escapeCSV).join(",")),
  ];

  return csvLines.join("\n");
}

/**
 * Calculate class-level statistics from a gradebook.
 */
export function calculateClassStats(students: StudentGradeSummary[]): {
  classAverage: number;
  highestGrade: number;
  lowestGrade: number;
  gradeDistribution: Record<string, number>;
} {
  if (students.length === 0) {
    return {
      classAverage: 0,
      highestGrade: 0,
      lowestGrade: 0,
      gradeDistribution: {},
    };
  }

  const percentages = students.map((s) => s.overallPercentage);
  const classAverage =
    percentages.reduce((sum, p) => sum + p, 0) / percentages.length;
  const highestGrade = Math.max(...percentages);
  const lowestGrade = Math.min(...percentages);

  const gradeDistribution: Record<string, number> = {};
  for (const student of students) {
    const letter = student.letterGrade;
    gradeDistribution[letter] = (gradeDistribution[letter] || 0) + 1;
  }

  return { classAverage, highestGrade, lowestGrade, gradeDistribution };
}

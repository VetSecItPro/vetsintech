"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Plus,
  Settings,
  Users,
  TrendingUp,
  TrendingDown,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ROUTES } from "@/lib/constants/routes";
import { toast } from "sonner";
import type {
  CourseGradebook,
  GradeConfig,
  GradeCategory,
  StudentGradeSummary,
} from "@/lib/domains/gradebook/types";
import {
  formatGradePercentage,
  getGradeBgColor,
  getCategoryLabel,
  calculateClassStats,
} from "@/lib/domains/gradebook/utils";

const ALL_CATEGORIES: GradeCategory[] = [
  "quiz",
  "assignment",
  "participation",
  "extra_credit",
];

export default function AdminGradebookPage() {
  const params = useParams<{ courseId: string }>();
  const courseId = params.courseId;

  const [gradebook, setGradebook] = useState<CourseGradebook | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [showAddOverride, setShowAddOverride] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Config form state
  const [configWeights, setConfigWeights] = useState<
    Record<GradeCategory, { weight: string; dropLowest: string }>
  >({
    quiz: { weight: "25", dropLowest: "0" },
    assignment: { weight: "25", dropLowest: "0" },
    participation: { weight: "25", dropLowest: "0" },
    extra_credit: { weight: "25", dropLowest: "0" },
  });
  const [savingConfig, setSavingConfig] = useState(false);

  // Override form state
  const [overrideStudentId, setOverrideStudentId] = useState("");
  const [overrideCategory, setOverrideCategory] =
    useState<GradeCategory>("participation");
  const [overrideLabel, setOverrideLabel] = useState("");
  const [overrideScore, setOverrideScore] = useState("");
  const [overrideMaxScore, setOverrideMaxScore] = useState("100");
  const [overrideNotes, setOverrideNotes] = useState("");
  const [savingOverride, setSavingOverride] = useState(false);

  const loadGradebook = useCallback(async () => {
    try {
      const res = await fetch(`/api/gradebook/${courseId}`);
      const json = await res.json();
      if (res.ok) {
        setGradebook(json.data);
        // Populate config weights from existing configs
        if (json.data?.configs) {
          const weights = { ...configWeights };
          for (const config of json.data.configs as GradeConfig[]) {
            weights[config.category] = {
              weight: String(config.weight),
              dropLowest: String(config.drop_lowest),
            };
          }
          setConfigWeights(weights);
        }
      }
    } catch (error) {
      console.error("Error loading gradebook:", error);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  useEffect(() => {
    loadGradebook();
  }, [loadGradebook]);

  const handleSaveConfig = async () => {
    const configs = ALL_CATEGORIES.map((cat) => ({
      category: cat,
      weight: Number(configWeights[cat].weight) || 0,
      drop_lowest: Number(configWeights[cat].dropLowest) || 0,
    }));

    const totalWeight = configs.reduce((sum, c) => sum + c.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      toast.error(`Weights must total 100% (currently ${totalWeight}%)`);
      return;
    }

    setSavingConfig(true);
    try {
      const res = await fetch(`/api/gradebook/${courseId}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configs }),
      });

      if (res.ok) {
        toast.success("Grade configuration saved");
        setShowConfigPanel(false);
        loadGradebook();
      } else {
        const json = await res.json();
        toast.error(json.error || "Failed to save configuration");
      }
    } catch (error) {
      console.error("Error saving config:", error);
      toast.error("Failed to save configuration");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleAddOverride = async () => {
    if (!overrideStudentId || !overrideLabel.trim() || !overrideScore) {
      toast.error("Student, label, and score are required");
      return;
    }

    setSavingOverride(true);
    try {
      const res = await fetch(`/api/gradebook/${courseId}/overrides`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: overrideStudentId,
          category: overrideCategory,
          label: overrideLabel.trim(),
          score: Number(overrideScore),
          max_score: Number(overrideMaxScore) || 100,
          notes: overrideNotes.trim() || null,
        }),
      });

      if (res.ok) {
        toast.success("Grade entry added");
        setShowAddOverride(false);
        resetOverrideForm();
        loadGradebook();
      } else {
        const json = await res.json();
        toast.error(json.error || "Failed to add grade entry");
      }
    } catch (error) {
      console.error("Error adding override:", error);
      toast.error("Failed to add grade entry");
    } finally {
      setSavingOverride(false);
    }
  };

  const resetOverrideForm = () => {
    setOverrideStudentId("");
    setOverrideCategory("participation");
    setOverrideLabel("");
    setOverrideScore("");
    setOverrideMaxScore("100");
    setOverrideNotes("");
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/gradebook/${courseId}/export`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `gradebook-${courseId}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Gradebook exported");
      } else {
        toast.error("Failed to export gradebook");
      }
    } catch (error) {
      console.error("Error exporting:", error);
      toast.error("Failed to export gradebook");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const students = gradebook?.students || [];
  const stats = calculateClassStats(students);

  // Collect all unique grade item labels for column headers
  const allItemColumns: Array<{
    category: GradeCategory;
    label: string;
    key: string;
  }> = [];
  const seen = new Set<string>();
  for (const student of students) {
    for (const cat of student.categories) {
      for (const item of cat.items) {
        const key = `${cat.category}:${item.label}`;
        if (!seen.has(key)) {
          seen.add(key);
          allItemColumns.push({
            category: cat.category as GradeCategory,
            label: item.label,
            key,
          });
        }
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={ROUTES.adminModules(courseId)}
          className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Course
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Gradebook</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage grades and weights for this course
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfigPanel(true)}
            >
              <Settings className="mr-2 h-4 w-4" />
              Configure
            </Button>
            <Button variant="outline" onClick={() => setShowAddOverride(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Grade
            </Button>
            <Button onClick={handleExportCSV} disabled={exporting}>
              <Download className="mr-2 h-4 w-4" />
              {exporting ? "Exporting..." : "Export CSV"}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Students
            </CardTitle>
            <Users className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Class Average
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {students.length > 0
                ? formatGradePercentage(stats.classAverage)
                : "N/A"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Highest Grade
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {students.length > 0
                ? formatGradePercentage(stats.highestGrade)
                : "N/A"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Lowest Grade
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {students.length > 0
                ? formatGradePercentage(stats.lowestGrade)
                : "N/A"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grade Distribution */}
      {Object.keys(stats.gradeDistribution).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Grade Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {Object.entries(stats.gradeDistribution)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([grade, count]) => (
                  <Badge
                    key={grade}
                    className={`text-sm ${getGradeBgColor(grade)}`}
                  >
                    {grade}: {count} student{count !== 1 ? "s" : ""}
                  </Badge>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gradebook Table */}
      {students.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-sm text-slate-500">
              No enrolled students with grades. Grades will appear as students
              complete quizzes and assignments.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 z-10 bg-white dark:bg-slate-950">
                    Student
                  </TableHead>
                  {allItemColumns.map((col) => (
                    <TableHead
                      key={col.key}
                      className="min-w-[100px] text-center"
                    >
                      <div className="text-xs text-slate-400">
                        {getCategoryLabel(col.category)}
                      </div>
                      <div className="truncate">{col.label}</div>
                    </TableHead>
                  ))}
                  {ALL_CATEGORIES.map((cat) => (
                    <TableHead
                      key={`avg-${cat}`}
                      className="min-w-[80px] text-center"
                    >
                      <div className="text-xs font-semibold">
                        {getCategoryLabel(cat)} Avg
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="min-w-[80px] text-center">
                    Overall
                  </TableHead>
                  <TableHead className="min-w-[60px] text-center">
                    Grade
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <GradebookRow
                    key={student.studentId}
                    student={student}
                    itemColumns={allItemColumns}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Grade Configuration Dialog */}
      <Dialog open={showConfigPanel} onOpenChange={setShowConfigPanel}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Grade Configuration</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Set the weight for each grade category. Weights must total 100%.
            </p>
            {ALL_CATEGORIES.map((cat) => (
              <div key={cat} className="space-y-2">
                <Label className="font-medium">{getCategoryLabel(cat)}</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-500">Weight (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={configWeights[cat].weight}
                      onChange={(e) =>
                        setConfigWeights((prev) => ({
                          ...prev,
                          [cat]: { ...prev[cat], weight: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">
                      Drop Lowest
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      max="20"
                      value={configWeights[cat].dropLowest}
                      onChange={(e) =>
                        setConfigWeights((prev) => ({
                          ...prev,
                          [cat]: {
                            ...prev[cat],
                            dropLowest: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Total Weight:</span>
              <span
                className={
                  Math.abs(
                    ALL_CATEGORIES.reduce(
                      (sum, cat) =>
                        sum + (Number(configWeights[cat].weight) || 0),
                      0
                    ) - 100
                  ) < 0.01
                    ? "font-bold text-green-600"
                    : "font-bold text-red-600"
                }
              >
                {ALL_CATEGORIES.reduce(
                  (sum, cat) =>
                    sum + (Number(configWeights[cat].weight) || 0),
                  0
                )}
                %
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfigPanel(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveConfig} disabled={savingConfig}>
              {savingConfig ? "Saving..." : "Save Configuration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Manual Grade Dialog */}
      <Dialog open={showAddOverride} onOpenChange={setShowAddOverride}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Manual Grade</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Student</Label>
              <Select
                value={overrideStudentId}
                onValueChange={setOverrideStudentId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.studentId} value={s.studentId}>
                      {s.studentName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select
                value={overrideCategory}
                onValueChange={(v) =>
                  setOverrideCategory(v as GradeCategory)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {getCategoryLabel(cat)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Label</Label>
              <Input
                value={overrideLabel}
                onChange={(e) => setOverrideLabel(e.target.value)}
                placeholder="e.g., Class Participation Week 1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Score</Label>
                <Input
                  type="number"
                  min="0"
                  value={overrideScore}
                  onChange={(e) => setOverrideScore(e.target.value)}
                />
              </div>
              <div>
                <Label>Max Score</Label>
                <Input
                  type="number"
                  min="1"
                  value={overrideMaxScore}
                  onChange={(e) => setOverrideMaxScore(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Input
                value={overrideNotes}
                onChange={(e) => setOverrideNotes(e.target.value)}
                placeholder="Optional notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddOverride(false);
                resetOverrideForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddOverride} disabled={savingOverride}>
              {savingOverride ? "Adding..." : "Add Grade"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GradebookRow({
  student,
  itemColumns,
}: {
  student: StudentGradeSummary;
  itemColumns: Array<{
    category: GradeCategory;
    label: string;
    key: string;
  }>;
}) {
  return (
    <TableRow>
      <TableCell className="sticky left-0 z-10 bg-white font-medium dark:bg-slate-950">
        {student.studentName}
      </TableCell>
      {itemColumns.map((col) => {
        const cat = student.categories.find(
          (c) => c.category === col.category
        );
        const item = cat?.items.find((i) => i.label === col.label);
        return (
          <TableCell key={col.key} className="text-center text-sm">
            {item ? (
              <span>
                {item.score}/{item.max_score}
              </span>
            ) : (
              <span className="text-slate-300">-</span>
            )}
          </TableCell>
        );
      })}
      {ALL_CATEGORIES.map((catName) => {
        const cat = student.categories.find((c) => c.category === catName);
        const hasItems = cat && cat.items.length > 0;
        return (
          <TableCell
            key={`avg-${catName}`}
            className="text-center text-sm font-medium"
          >
            {hasItems ? formatGradePercentage(cat.percentage) : "-"}
          </TableCell>
        );
      })}
      <TableCell className="text-center font-semibold">
        {formatGradePercentage(student.overallPercentage)}
      </TableCell>
      <TableCell className="text-center">
        <Badge className={getGradeBgColor(student.letterGrade)}>
          {student.letterGrade}
        </Badge>
      </TableCell>
    </TableRow>
  );
}

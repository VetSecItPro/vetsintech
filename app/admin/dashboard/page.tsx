import { redirect } from "next/navigation";
import { Users, GraduationCap, TrendingUp, BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/constants/routes";
import {
  getDashboardStats,
  getCourseAnalytics,
  getStudentProgressTable,
} from "@/lib/domains/admin/queries";
import { formatPercentage, formatCompactNumber } from "@/lib/domains/admin/utils";
import { StatCard } from "@/components/admin/stat-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Authenticate
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(ROUTES.login);
  }

  // Get organization from profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) {
    redirect(ROUTES.login);
  }

  const orgId = profile.organization_id;

  // Fetch all dashboard data in parallel
  const [stats, courseAnalytics, studentProgress] = await Promise.all([
    getDashboardStats(orgId),
    getCourseAnalytics(orgId),
    getStudentProgressTable(orgId, { limit: 10 }),
  ]);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-slate-400">
          Overview of your organization&apos;s learning platform
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Students"
          value={formatCompactNumber(stats.totalStudents)}
          icon={Users}
          description="enrolled in your organization"
        />
        <StatCard
          title="Active Enrollments"
          value={formatCompactNumber(stats.activeEnrollments)}
          icon={GraduationCap}
          description="currently in progress"
        />
        <StatCard
          title="Avg Completion Rate"
          value={formatPercentage(stats.completionRate)}
          icon={TrendingUp}
          description="across all courses"
        />
        <StatCard
          title="Active Courses"
          value={stats.activeCourses}
          icon={BookOpen}
          description="published and available"
        />
      </div>

      {/* Course Analytics Table */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Course Analytics</h2>
        <div className="rounded-lg border border-slate-800 bg-slate-900">
          {courseAnalytics.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <BookOpen className="mb-3 size-10 text-slate-500" />
              <p className="text-slate-400">No published courses yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400">Course</TableHead>
                  <TableHead className="text-center text-slate-400">
                    Enrolled
                  </TableHead>
                  <TableHead className="text-center text-slate-400">
                    Completion
                  </TableHead>
                  <TableHead className="text-center text-slate-400">
                    Avg Progress
                  </TableHead>
                  <TableHead className="text-center text-slate-400">
                    Avg Quiz Score
                  </TableHead>
                  <TableHead className="text-slate-400">
                    Drop-Off Lesson
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courseAnalytics.map((course) => (
                  <TableRow
                    key={course.courseId}
                    className="border-slate-800 hover:bg-slate-800/50"
                  >
                    <TableCell className="font-medium text-white">
                      {course.courseTitle}
                    </TableCell>
                    <TableCell className="text-center text-slate-300">
                      {course.totalEnrolled}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="secondary"
                        className={
                          course.completionRate >= 75
                            ? "bg-green-900 text-green-300"
                            : course.completionRate >= 50
                              ? "bg-amber-900 text-amber-300"
                              : "bg-slate-800 text-slate-300"
                        }
                      >
                        {formatPercentage(course.completionRate)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-slate-300">
                      {formatPercentage(course.avgProgress)}
                    </TableCell>
                    <TableCell className="text-center text-slate-300">
                      {formatPercentage(course.avgQuizScore)}
                    </TableCell>
                    <TableCell className="text-slate-400">
                      {course.dropOffLesson ?? "--"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Student Progress Table */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Student Progress</h2>
        <div className="rounded-lg border border-slate-800 bg-slate-900">
          {studentProgress.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Users className="mb-3 size-10 text-slate-500" />
              <p className="text-slate-400">No student data available</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400">Student</TableHead>
                  <TableHead className="text-slate-400">Course</TableHead>
                  <TableHead className="text-slate-400">Cohort</TableHead>
                  <TableHead className="text-slate-400">Progress</TableHead>
                  <TableHead className="text-center text-slate-400">
                    Quiz Avg
                  </TableHead>
                  <TableHead className="text-slate-400">
                    Last Activity
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentProgress.map((student) => (
                  <TableRow
                    key={`${student.userId}-${student.courseTitle}`}
                    className="border-slate-800 hover:bg-slate-800/50"
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium text-white">
                          {student.fullName}
                        </p>
                        <p className="text-xs text-slate-400">
                          {student.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {student.courseTitle}
                    </TableCell>
                    <TableCell className="text-slate-400">
                      {student.cohortName}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 rounded-full bg-slate-700">
                          <div
                            className="h-full rounded-full bg-blue-500"
                            style={{
                              width: `${Math.min(student.progressPercentage, 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-slate-300">
                          {formatPercentage(student.progressPercentage)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-slate-300">
                      {formatPercentage(student.quizAvg)}
                    </TableCell>
                    <TableCell className="text-slate-400">
                      {student.lastActivityAt
                        ? new Date(student.lastActivityAt).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )
                        : "--"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}

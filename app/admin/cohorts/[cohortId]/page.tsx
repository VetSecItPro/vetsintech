import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, Calendar, BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCohortWithEnrollments } from "@/lib/domains/courses/queries";
import { ROUTES } from "@/lib/constants/routes";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AddStudentButton,
  RemoveEnrollmentButton,
} from "./enrollment-actions";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  completed: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  dropped: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  suspended: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
};

export default async function CohortDetailPage({
  params,
}: {
  params: Promise<{ cohortId: string }>;
}) {
  const { cohortId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();
  if (!profile) notFound();

  const cohort = await getCohortWithEnrollments(
    cohortId,
    profile.organization_id
  );
  if (!cohort) notFound();

  return (
    <div className="space-y-6">
      <Link
        href={ROUTES.adminCohorts}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Cohorts
      </Link>

      {/* Cohort info */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{cohort.name}</h1>
          <Badge className={STATUS_COLORS[cohort.status]}>{cohort.status}</Badge>
        </div>
        {cohort.description && (
          <p className="mt-1 text-sm text-slate-500">{cohort.description}</p>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Course</CardDescription>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              {cohort.course.title}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Students</CardDescription>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              {cohort.enrollments.length}
              {cohort.max_students ? ` / ${cohort.max_students}` : ""}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Duration</CardDescription>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {cohort.starts_at
                ? `${new Date(cohort.starts_at).toLocaleDateString()} — ${
                    cohort.ends_at
                      ? new Date(cohort.ends_at).toLocaleDateString()
                      : "Ongoing"
                  }`
                : "No dates set"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Enrollment table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Enrolled Students</CardTitle>
              <CardDescription>
                {cohort.enrollments.length} student{cohort.enrollments.length !== 1 ? "s" : ""} enrolled
              </CardDescription>
            </div>
            <AddStudentButton
              cohortId={cohortId}
              enrolledUserIds={cohort.enrollments.map((e) => e.user.id)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {cohort.enrollments.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              No students enrolled yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Enrolled</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {cohort.enrollments.map((enrollment) => (
                  <TableRow key={enrollment.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={ROUTES.adminStudent(enrollment.user.id)}
                        className="hover:underline"
                      >
                        {enrollment.user.full_name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {enrollment.user.email}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[enrollment.status]}>
                        {enrollment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {new Date(enrollment.enrolled_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <RemoveEnrollmentButton
                        enrollmentId={enrollment.id}
                        studentName={enrollment.user.full_name}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

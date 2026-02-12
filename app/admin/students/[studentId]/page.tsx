import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  User,
  Mail,
  Calendar,
  BookOpen,
  Trophy,
  ClipboardList,
} from "lucide-react";
import { getAuthenticatedUser } from "@/lib/supabase/auth-guard";
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

export const metadata = {
  title: "Student Details",
};

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const { organizationId, supabase } = await getAuthenticatedUser();

  // Get student profile
  const { data: student } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url, bio, is_active, created_at, last_sign_in_at")
    .eq("id", studentId)
    .single();

  if (!student) notFound();

  // Verify student belongs to the same organization
  const { data: studentRole } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", studentId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!studentRole) notFound();

  // Fetch enrolled courses with progress
  const { data: courseProgress } = await supabase
    .from("course_progress")
    .select(
      "id, progress_pct, updated_at, course_id, cohort_id, courses(id, title), cohorts(id, name)"
    )
    .eq("user_id", studentId)
    .order("updated_at", { ascending: false });

  // Fetch quiz attempt history
  const { data: quizAttempts } = await supabase
    .from("quiz_attempts")
    .select(
      "id, score, max_score, passed, started_at, completed_at, quiz_id, quizzes(id, title)"
    )
    .eq("user_id", studentId)
    .order("started_at", { ascending: false })
    .limit(20);

  // Fetch certificates earned
  const { data: certificates } = await supabase
    .from("certificates")
    .select(
      "id, issued_at, certificate_url, course_id, courses(id, title)"
    )
    .eq("user_id", studentId)
    .order("issued_at", { ascending: false });

  return (
    <div className="space-y-6">
      <Link
        href={ROUTES.adminStudents}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Students
      </Link>

      {/* Student info card */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800">
              {student.avatar_url ? (
                <Image
                  src={student.avatar_url}
                  alt={student.full_name || "Student"}
                  width={56}
                  height={56}
                  className="h-14 w-14 rounded-full object-cover"
                />
              ) : (
                <User className="h-7 w-7 text-slate-400" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <CardTitle className="text-xl">
                  {student.full_name || "Unnamed Student"}
                </CardTitle>
                {student.is_active ? (
                  <Badge className="bg-green-900 text-green-300">Active</Badge>
                ) : (
                  <Badge className="bg-slate-800 text-slate-400">
                    Inactive
                  </Badge>
                )}
              </div>
              <CardDescription className="mt-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5" />
                  {student.email}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" />
                  Member since{" "}
                  {new Date(student.created_at).toLocaleDateString()}
                </div>
              </CardDescription>
              {student.bio && (
                <p className="mt-2 text-sm text-slate-400">{student.bio}</p>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Enrolled courses with progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4" />
            Enrolled Courses
          </CardTitle>
          <CardDescription>
            {(courseProgress || []).length} course
            {(courseProgress || []).length !== 1 ? "s" : ""} enrolled
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(courseProgress || []).length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              No course enrollments yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Cohort</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(courseProgress || []).map((cp) => {
                  const course = cp.courses as unknown as {
                    id: string;
                    title: string;
                  } | null;
                  const cohort = cp.cohorts as unknown as {
                    id: string;
                    name: string;
                  } | null;

                  return (
                    <TableRow key={cp.id}>
                      <TableCell className="font-medium">
                        {course?.title || "Unknown Course"}
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {cohort?.name || "N/A"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 rounded-full bg-slate-800">
                            <div
                              className="h-2 rounded-full bg-blue-500"
                              style={{
                                width: `${cp.progress_pct || 0}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-slate-400">
                            {cp.progress_pct || 0}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-400">
                        {cp.updated_at
                          ? new Date(cp.updated_at).toLocaleDateString()
                          : "N/A"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Quiz attempt history */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4" />
            Quiz Attempts
          </CardTitle>
          <CardDescription>
            {(quizAttempts || []).length} attempt
            {(quizAttempts || []).length !== 1 ? "s" : ""} recorded
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(quizAttempts || []).length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              No quiz attempts yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quiz</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(quizAttempts || []).map((attempt) => {
                  const quiz = attempt.quizzes as unknown as {
                    id: string;
                    title: string;
                  } | null;

                  return (
                    <TableRow key={attempt.id}>
                      <TableCell className="font-medium">
                        {quiz?.title || "Unknown Quiz"}
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {attempt.score}/{attempt.max_score}
                      </TableCell>
                      <TableCell>
                        {attempt.passed ? (
                          <Badge className="bg-green-900 text-green-300">
                            Passed
                          </Badge>
                        ) : (
                          <Badge className="bg-red-900 text-red-300">
                            Failed
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-400">
                        {attempt.started_at
                          ? new Date(
                              attempt.started_at
                            ).toLocaleDateString()
                          : "N/A"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Certificates earned */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4" />
            Certificates Earned
          </CardTitle>
          <CardDescription>
            {(certificates || []).length} certificate
            {(certificates || []).length !== 1 ? "s" : ""} earned
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(certificates || []).length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              No certificates earned yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Certificate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(certificates || []).map((cert) => {
                  const course = cert.courses as unknown as {
                    id: string;
                    title: string;
                  } | null;

                  return (
                    <TableRow key={cert.id}>
                      <TableCell className="font-medium">
                        {course?.title || "Unknown Course"}
                      </TableCell>
                      <TableCell className="text-sm text-slate-400">
                        {new Date(cert.issued_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {cert.certificate_url ? (
                          <a
                            href={cert.certificate_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-400 hover:underline"
                          >
                            View Certificate
                          </a>
                        ) : (
                          <span className="text-sm text-slate-500">
                            N/A
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

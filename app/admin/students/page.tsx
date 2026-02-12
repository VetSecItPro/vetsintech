import Link from "next/link";
import { getAuthenticatedUser } from "@/lib/supabase/auth-guard";
import { ROUTES } from "@/lib/constants/routes";
import { Plus, Search, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata = {
  title: "Manage Students",
};

interface StudentRow {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  is_active: boolean;
  last_sign_in_at: string | null;
  cohorts: string[];
  progress: number;
}

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    cohort_id?: string;
    status?: string;
  }>;
}) {
  const { search, cohort_id, status } = await searchParams;
  const { organizationId, supabase } = await getAuthenticatedUser();

  // Build query for students in the organization
  // Get user IDs with student role in this org
  const rolesQuery = supabase
    .from("user_roles")
    .select("user_id")
    .eq("organization_id", organizationId)
    .eq("role", "student");

  const { data: studentRoles } = await rolesQuery;
  const studentIds = (studentRoles || []).map((r) => r.user_id);

  // Fetch profiles for those students
  let profilesQuery = supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url, is_active, last_sign_in_at")
    .in("id", studentIds.length > 0 ? studentIds : ["__none__"])
    .order("full_name", { ascending: true });

  // Apply search filter
  if (search) {
    profilesQuery = profilesQuery.or(
      `full_name.ilike.%${search}%,email.ilike.%${search}%`
    );
  }

  // Apply status filter
  if (status === "active") {
    profilesQuery = profilesQuery.eq("is_active", true);
  } else if (status === "inactive") {
    profilesQuery = profilesQuery.eq("is_active", false);
  }

  const { data: students } = await profilesQuery;

  // Fetch enrollments for all students to get cohort info and progress
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("user_id, cohort_id, cohorts(id, name)")
    .in("user_id", studentIds.length > 0 ? studentIds : ["__none__"]);

  // Fetch course progress for all students
  const { data: progressData } = await supabase
    .from("course_progress")
    .select("user_id, progress_pct")
    .in("user_id", studentIds.length > 0 ? studentIds : ["__none__"]);

  // If filtering by cohort, get user IDs in that cohort
  let cohortFilterIds: Set<string> | null = null;
  if (cohort_id) {
    const { data: cohortEnrollments } = await supabase
      .from("enrollments")
      .select("user_id")
      .eq("cohort_id", cohort_id);
    cohortFilterIds = new Set(
      (cohortEnrollments || []).map((e) => e.user_id)
    );
  }

  // Index enrollments and progress by user_id for O(1) lookups
  const enrollmentsByUser = new Map<string, typeof enrollments>();
  for (const e of enrollments || []) {
    const list = enrollmentsByUser.get(e.user_id) || [];
    list.push(e);
    enrollmentsByUser.set(e.user_id, list);
  }

  const progressByUser = new Map<string, typeof progressData>();
  for (const p of progressData || []) {
    const list = progressByUser.get(p.user_id) || [];
    list.push(p);
    progressByUser.set(p.user_id, list);
  }

  // Build enriched student rows
  const enrichedStudents: StudentRow[] = (students || [])
    .filter((s) => !cohortFilterIds || cohortFilterIds.has(s.id))
    .map((s) => {
      const studentEnrollments = enrollmentsByUser.get(s.id) || [];
      const cohortNames = studentEnrollments
        .map((e) => {
          const cohort = e.cohorts as unknown as { id: string; name: string } | null;
          return cohort?.name;
        })
        .filter(Boolean) as string[];

      const studentProgress = progressByUser.get(s.id) || [];
      const avgProgress =
        studentProgress.length > 0
          ? Math.round(
              studentProgress.reduce((sum, p) => sum + ((p as { progress_pct: number }).progress_pct || 0), 0) /
                studentProgress.length
            )
          : 0;

      return {
        id: s.id,
        full_name: s.full_name || "Unnamed",
        email: s.email || "",
        avatar_url: s.avatar_url,
        is_active: s.is_active ?? true,
        last_sign_in_at: s.last_sign_in_at,
        cohorts: cohortNames,
        progress: avgProgress,
      };
    });

  // Fetch cohorts for filter dropdown
  const { data: cohorts } = await supabase
    .from("cohorts")
    .select("id, name")
    .eq("organization_id", organizationId)
    .order("name");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Students</h1>
          <p className="text-sm text-slate-500">
            Manage students in your organization
          </p>
        </div>
        <Button asChild>
          <Link href={ROUTES.adminNewStudent}>
            <Plus className="mr-2 h-4 w-4" />
            Add Student
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <form className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            name="search"
            placeholder="Search by name or email..."
            defaultValue={search || ""}
            className="pl-9"
          />
        </div>
        <select
          name="cohort_id"
          defaultValue={cohort_id || ""}
          className="h-9 rounded-md border border-slate-800 bg-slate-900 px-3 text-sm text-slate-300"
        >
          <option value="">All Cohorts</option>
          {(cohorts || []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={status || ""}
          className="h-9 rounded-md border border-slate-800 bg-slate-900 px-3 text-sm text-slate-300"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <Button type="submit" variant="secondary" size="sm">
          Filter
        </Button>
      </form>

      {/* Student table */}
      {enrichedStudents.length > 0 ? (
        <div className="rounded-lg border border-slate-800">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Cohort(s)</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrichedStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={ROUTES.adminStudent(student.id)}
                      className="hover:underline"
                    >
                      {student.full_name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-slate-400">
                    {student.email}
                  </TableCell>
                  <TableCell>
                    {student.cohorts.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {student.cohorts.map((name) => (
                          <Badge
                            key={name}
                            variant="outline"
                            className="text-xs"
                          >
                            {name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">
                        No cohort
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 rounded-full bg-slate-800">
                        <div
                          className="h-2 rounded-full bg-blue-500"
                          style={{ width: `${student.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-400">
                        {student.progress}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-slate-400">
                    {student.last_sign_in_at
                      ? new Date(student.last_sign_in_at).toLocaleDateString()
                      : "Never"}
                  </TableCell>
                  <TableCell>
                    {student.is_active ? (
                      <Badge className="bg-green-900 text-green-300">
                        Active
                      </Badge>
                    ) : (
                      <Badge className="bg-slate-800 text-slate-400">
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-700 py-16">
          <GraduationCap className="h-12 w-12 text-slate-600" />
          <p className="mt-3 text-lg font-medium text-slate-400">
            No students found
          </p>
          <p className="text-sm text-slate-500">
            {search || cohort_id || status
              ? "Try adjusting your filters"
              : "Add your first student to get started"}
          </p>
          {!search && !cohort_id && !status && (
            <Button asChild className="mt-4">
              <Link href={ROUTES.adminNewStudent}>Add Student</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

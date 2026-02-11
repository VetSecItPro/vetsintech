"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { ROUTES } from "@/lib/constants/routes";
import type { CohortWithCourse } from "@/lib/domains/courses/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  completed:
    "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  archived:
    "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
};

export default function CohortsPage() {
  const router = useRouter();
  const [cohorts, setCohorts] = useState<CohortWithCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    async function fetchCohorts() {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/cohorts?${params}`);
      if (res.ok) {
        const { data } = await res.json();
        setCohorts(data);
      }
      setIsLoading(false);
    }
    fetchCohorts();
  }, [search, statusFilter]);

  async function handleDelete(cohortId: string) {
    const res = await fetch(`/api/cohorts/${cohortId}`, { method: "DELETE" });
    if (res.ok) {
      setCohorts((prev) => prev.filter((c) => c.id !== cohortId));
      toast.success("Cohort deleted");
    } else {
      toast.error("Failed to delete cohort");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cohorts</h1>
          <p className="text-sm text-slate-500">
            Manage course cohorts and student enrollments
          </p>
        </div>
        <Link href={ROUTES.adminNewCohort}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Cohort
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search cohorts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cohort cards */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 w-32 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-48 rounded bg-slate-100 dark:bg-slate-900" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : cohorts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-10 w-10 text-slate-300" />
            <p className="mt-2 font-medium text-slate-600">No cohorts found</p>
            <p className="text-sm text-slate-400">
              Create a cohort to start enrolling students
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cohorts.map((cohort) => (
            <Card
              key={cohort.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => router.push(ROUTES.adminCohort(cohort.id))}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{cohort.name}</CardTitle>
                    <CardDescription>{cohort.course.title}</CardDescription>
                  </div>
                  <Badge className={STATUS_COLORS[cohort.status]}>
                    {cohort.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {cohort.enrollment_count} students
                  </span>
                  {cohort.starts_at && (
                    <span>
                      {new Date(cohort.starts_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 h-7 w-7 text-red-500 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(cohort.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

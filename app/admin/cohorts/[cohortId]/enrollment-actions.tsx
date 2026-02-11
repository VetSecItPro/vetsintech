"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

// ---------- Add Student Dialog ----------

interface Student {
  id: string;
  full_name: string;
  email: string;
}

interface AddStudentButtonProps {
  cohortId: string;
  enrolledUserIds: string[];
}

export function AddStudentButton({
  cohortId,
  enrolledUserIds,
}: AddStudentButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [enrolling, startEnroll] = useTransition();

  async function fetchStudents(query: string) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (query) params.set("search", query);

      const res = await fetch(`/api/students?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch students");

      const { data } = await res.json();
      // Filter out already-enrolled students
      const available = (data || []).filter(
        (s: Student) => !enrolledUserIds.includes(s.id)
      );
      setStudents(available);
    } catch {
      toast.error("Failed to load students");
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setSearch("");
      fetchStudents("");
    } else {
      setStudents([]);
    }
  }

  function handleSearch(value: string) {
    setSearch(value);
    fetchStudents(value);
  }

  function handleEnroll(userId: string) {
    startEnroll(async () => {
      try {
        const res = await fetch("/api/enrollments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId, cohort_id: cohortId }),
        });

        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.error || "Failed to enroll student");
        }

        toast.success("Student enrolled successfully");
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to enroll student"
        );
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <Plus className="h-4 w-4" />
          Add Student
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Student to Cohort</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="h-[300px]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : students.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                {search
                  ? "No matching students found"
                  : "No available students"}
              </p>
            ) : (
              <div className="space-y-1">
                {students.map((student) => (
                  <button
                    key={student.id}
                    onClick={() => handleEnroll(student.id)}
                    disabled={enrolling}
                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"
                  >
                    <div>
                      <div className="font-medium">{student.full_name}</div>
                      <div className="text-slate-500">{student.email}</div>
                    </div>
                    {enrolling ? (
                      <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    ) : (
                      <Plus className="h-4 w-4 text-slate-400" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Remove Enrollment Button ----------

interface RemoveEnrollmentButtonProps {
  enrollmentId: string;
  studentName: string;
}

export function RemoveEnrollmentButton({
  enrollmentId,
  studentName,
}: RemoveEnrollmentButtonProps) {
  const router = useRouter();
  const [removing, startRemove] = useTransition();

  function handleRemove() {
    startRemove(async () => {
      try {
        const res = await fetch(`/api/enrollments/${enrollmentId}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.error || "Failed to remove enrollment");
        }

        toast.success("Student removed from cohort");
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to remove student"
        );
      }
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
          disabled={removing}
        >
          {removing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Student</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove {studentName} from this cohort? This
            action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleRemove}>
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

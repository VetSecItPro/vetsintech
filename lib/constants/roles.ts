import type { UserRole } from "@/lib/types/auth";

export const ROLES: Record<UserRole, { label: string; description: string }> = {
  admin: {
    label: "Administrator",
    description: "Full platform access — manage courses, students, and settings",
  },
  instructor: {
    label: "Instructor",
    description: "Manage assigned courses, grade quizzes, moderate discussions",
  },
  student: {
    label: "Student",
    description: "Access enrolled courses, participate in discussions",
  },
};

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 3,
  instructor: 2,
  student: 1,
};

// ============================================================================
// Course Domain Types
// Maps to: courses, modules, lessons, cohorts, enrollments tables
// ============================================================================

// ---------- Enums (match DB enums) ----------

export type CourseStatus = "draft" | "published" | "archived";
export type LessonType = "text" | "video" | "quiz" | "assignment" | "resource";
export type CohortStatus = "active" | "completed" | "archived";
export type EnrollmentStatus = "active" | "completed" | "dropped" | "suspended";

// ---------- Core Entities ----------

export interface Course {
  id: string;
  organization_id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail_url: string | null;
  category: string | null;
  tags: string[];
  prerequisites: string[];
  status: CourseStatus;
  created_by: string | null;
  estimated_duration_minutes: number | null;
  created_at: string;
  updated_at: string;
}

export interface Module {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  is_required: boolean;
  created_at: string;
  updated_at: string;
}

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  lesson_type: LessonType;
  content: Record<string, unknown> | null; // Tiptap ProseMirror JSON
  video_url: string | null;
  sort_order: number;
  estimated_duration_minutes: number | null;
  is_required: boolean;
  created_at: string;
  updated_at: string;
}

export interface Cohort {
  id: string;
  organization_id: string;
  course_id: string;
  name: string;
  description: string | null;
  status: CohortStatus;
  starts_at: string | null;
  ends_at: string | null;
  max_students: number | null;
  cloned_from: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Enrollment {
  id: string;
  cohort_id: string;
  user_id: string;
  enrolled_at: string;
  enrolled_by: string | null;
  status: EnrollmentStatus;
  completed_at: string | null;
  created_at: string;
}

// ---------- Joined / Extended Types ----------

export interface CourseWithModules extends Course {
  modules: ModuleWithLessons[];
}

export interface ModuleWithLessons extends Module {
  lessons: Lesson[];
}

export interface CourseWithStats extends Course {
  module_count: number;
  lesson_count: number;
  enrollment_count: number;
  cohort_count: number;
}

export interface CohortWithCourse extends Cohort {
  course: Pick<Course, "id" | "title" | "slug">;
  enrollment_count: number;
}

export interface CohortWithEnrollments extends Cohort {
  course: Pick<Course, "id" | "title" | "slug">;
  enrollments: (Enrollment & {
    user: { id: string; full_name: string; email: string };
  })[];
}

// ---------- Input Types (for create/update) ----------

export interface CreateCourseInput {
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
  prerequisites?: string[];
  estimated_duration_minutes?: number;
  thumbnail_url?: string;
}

export interface UpdateCourseInput extends Partial<CreateCourseInput> {
  status?: CourseStatus;
}

export interface CreateModuleInput {
  course_id: string;
  title: string;
  description?: string;
  is_required?: boolean;
}

export interface UpdateModuleInput {
  title?: string;
  description?: string;
  sort_order?: number;
  is_required?: boolean;
}

export interface CreateLessonInput {
  module_id: string;
  title: string;
  lesson_type?: LessonType;
  content?: Record<string, unknown>;
  video_url?: string;
  estimated_duration_minutes?: number;
  is_required?: boolean;
}

export interface UpdateLessonInput {
  title?: string;
  lesson_type?: LessonType;
  content?: Record<string, unknown>;
  video_url?: string;
  sort_order?: number;
  estimated_duration_minutes?: number;
  is_required?: boolean;
}

export interface CreateCohortInput {
  course_id: string;
  name: string;
  description?: string;
  starts_at?: string;
  ends_at?: string;
  max_students?: number;
}

export interface UpdateCohortInput {
  name?: string;
  description?: string;
  status?: CohortStatus;
  starts_at?: string;
  ends_at?: string;
  max_students?: number;
}

// ---------- Filter / Query Types ----------

export interface CourseFilters {
  status?: CourseStatus;
  category?: string;
  search?: string;
}

export interface CohortFilters {
  course_id?: string;
  status?: CohortStatus;
  search?: string;
}

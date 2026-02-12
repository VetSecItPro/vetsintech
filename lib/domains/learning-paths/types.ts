// ============================================================================
// Learning Path Domain Types
// Maps to: learning_paths, learning_path_courses, learning_path_enrollments
// ============================================================================

// ---------- Enums (match DB enums) ----------

export type LearningPathStatus = "draft" | "published" | "archived";
export type DifficultyLevel = "beginner" | "intermediate" | "advanced";

// ---------- Core Entities ----------

export interface LearningPath {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail_url: string | null;
  status: LearningPathStatus;
  estimated_hours: number | null;
  difficulty_level: DifficultyLevel | null;
  tags: string[];
  organization_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface LearningPathCourse {
  id: string;
  learning_path_id: string;
  course_id: string;
  position: number;
  is_required: boolean;
}

export interface LearningPathEnrollment {
  id: string;
  learning_path_id: string;
  student_id: string;
  enrolled_at: string;
  completed_at: string | null;
  organization_id: string;
}

// ---------- Joined / Extended Types ----------

export interface LearningPathCourseWithDetails extends LearningPathCourse {
  course: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    thumbnail_url: string | null;
    estimated_duration_minutes: number | null;
    status: string;
  };
}

export interface LearningPathWithCourses extends LearningPath {
  courses: LearningPathCourseWithDetails[];
}

export interface LearningPathWithStats extends LearningPath {
  course_count: number;
  enrollment_count: number;
}

export interface LearningPathWithProgress extends LearningPath {
  course_count: number;
  enrollment: LearningPathEnrollment | null;
  progress_percentage: number;
}

export interface PathCourseProgress {
  course_id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail_url: string | null;
  estimated_duration_minutes: number | null;
  position: number;
  is_required: boolean;
  progress_percentage: number;
  is_completed: boolean;
}

// ---------- Input Types (for create/update) ----------

export interface CreateLearningPathInput {
  title: string;
  description?: string;
  thumbnail_url?: string;
  estimated_hours?: number;
  difficulty_level?: DifficultyLevel;
  tags?: string[];
}

export interface UpdateLearningPathInput extends Partial<CreateLearningPathInput> {
  status?: LearningPathStatus;
}

export interface AddCourseToPathInput {
  course_id: string;
  is_required?: boolean;
}

// ---------- Filter / Query Types ----------

export interface LearningPathFilters {
  status?: LearningPathStatus;
  difficulty_level?: DifficultyLevel;
  search?: string;
}

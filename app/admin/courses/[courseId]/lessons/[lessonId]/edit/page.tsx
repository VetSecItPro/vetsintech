import { notFound } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/supabase/auth-guard";
import { getLessonById } from "@/lib/domains/courses/queries";
import { LessonEditor } from "@/components/courses/lesson-editor";

export default async function LessonEditPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { courseId, lessonId } = await params;
  await getAuthenticatedUser();

  const lesson = await getLessonById(lessonId);
  if (!lesson) notFound();

  // Get module_id from lesson for the editor
  return (
    <LessonEditor
      courseId={courseId}
      moduleId={lesson.module_id}
      lesson={lesson}
    />
  );
}

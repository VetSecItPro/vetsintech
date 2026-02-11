import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLessonById } from "@/lib/domains/courses/queries";
import { LessonEditor } from "@/components/courses/lesson-editor";

export default async function LessonEditPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { courseId, lessonId } = await params;
  const supabase = await createClient();

  // Verify auth
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

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

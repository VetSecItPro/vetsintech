"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import ImageExtension from "@tiptap/extension-image";
import UnderlineExtension from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Youtube from "@tiptap/extension-youtube";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { cn } from "@/lib/utils";

const lowlight = createLowlight(common);

interface LessonContentProps {
  content: Record<string, unknown> | null;
  className?: string;
}

/**
 * Read-only Tiptap content renderer for student-facing lesson views.
 * Renders ProseMirror JSON safely — no dangerouslySetInnerHTML.
 */
export function LessonContent({ content, className }: LessonContentProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      LinkExtension.configure({
        openOnClick: true,
        HTMLAttributes: {
          class:
            "text-blue-600 underline underline-offset-2 hover:text-blue-800 dark:text-blue-400",
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
      ImageExtension.configure({
        HTMLAttributes: {
          class: "rounded-lg max-w-full h-auto my-4",
        },
      }),
      UnderlineExtension,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Youtube.configure({
        HTMLAttributes: {
          class: "rounded-lg my-4 w-full aspect-video",
        },
      }),
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content: content || undefined,
    editable: false,
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-slate dark:prose-invert max-w-none",
          "prose-headings:font-semibold prose-headings:tracking-tight",
          "prose-p:leading-7 prose-li:leading-7",
          "prose-code:rounded prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5",
          "dark:prose-code:bg-slate-800",
          "prose-pre:bg-slate-900 prose-pre:text-slate-50",
          className
        ),
      },
    },
  });

  if (!content) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-slate-400">
        No content available for this lesson.
      </div>
    );
  }

  return <EditorContent editor={editor} />;
}

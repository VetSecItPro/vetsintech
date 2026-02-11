"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import { cn } from "@/lib/utils";

interface TiptapContentProps {
  content: Record<string, unknown>;
  className?: string;
}

/**
 * Lightweight read-only Tiptap renderer for discussion posts.
 * Uses a minimal extension set (no code highlighting, no images, no YouTube).
 */
export function TiptapContent({ content, className }: TiptapContentProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      LinkExtension.configure({
        openOnClick: true,
        HTMLAttributes: {
          class: "text-blue-400 underline underline-offset-2 hover:text-blue-300",
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
    ],
    content,
    editable: false,
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm prose-slate dark:prose-invert max-w-none",
          "prose-p:leading-relaxed prose-p:my-1",
          className
        ),
      },
    },
  });

  return <EditorContent editor={editor} />;
}

"use client";

import type { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Undo,
  Redo,
  Link,
  Image,
  Youtube,
  AlignLeft,
  AlignCenter,
  AlignRight,
  CodeSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ToolbarProps {
  editor: Editor | null;
}

interface ToolbarAction {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  action: (editor: Editor) => void;
  isActive?: (editor: Editor) => boolean;
}

const TOOLBAR_GROUPS: ToolbarAction[][] = [
  // Undo/Redo
  [
    {
      icon: Undo,
      label: "Undo",
      action: (e) => e.chain().focus().undo().run(),
    },
    {
      icon: Redo,
      label: "Redo",
      action: (e) => e.chain().focus().redo().run(),
    },
  ],
  // Headings
  [
    {
      icon: Heading1,
      label: "Heading 1",
      action: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: (e) => e.isActive("heading", { level: 1 }),
    },
    {
      icon: Heading2,
      label: "Heading 2",
      action: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: (e) => e.isActive("heading", { level: 2 }),
    },
    {
      icon: Heading3,
      label: "Heading 3",
      action: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: (e) => e.isActive("heading", { level: 3 }),
    },
  ],
  // Formatting
  [
    {
      icon: Bold,
      label: "Bold",
      action: (e) => e.chain().focus().toggleBold().run(),
      isActive: (e) => e.isActive("bold"),
    },
    {
      icon: Italic,
      label: "Italic",
      action: (e) => e.chain().focus().toggleItalic().run(),
      isActive: (e) => e.isActive("italic"),
    },
    {
      icon: Underline,
      label: "Underline",
      action: (e) => e.chain().focus().toggleUnderline().run(),
      isActive: (e) => e.isActive("underline"),
    },
    {
      icon: Strikethrough,
      label: "Strikethrough",
      action: (e) => e.chain().focus().toggleStrike().run(),
      isActive: (e) => e.isActive("strike"),
    },
    {
      icon: Code,
      label: "Inline Code",
      action: (e) => e.chain().focus().toggleCode().run(),
      isActive: (e) => e.isActive("code"),
    },
  ],
  // Alignment
  [
    {
      icon: AlignLeft,
      label: "Align Left",
      action: (e) => e.chain().focus().setTextAlign("left").run(),
      isActive: (e) => e.isActive({ textAlign: "left" }),
    },
    {
      icon: AlignCenter,
      label: "Align Center",
      action: (e) => e.chain().focus().setTextAlign("center").run(),
      isActive: (e) => e.isActive({ textAlign: "center" }),
    },
    {
      icon: AlignRight,
      label: "Align Right",
      action: (e) => e.chain().focus().setTextAlign("right").run(),
      isActive: (e) => e.isActive({ textAlign: "right" }),
    },
  ],
  // Lists & Blocks
  [
    {
      icon: List,
      label: "Bullet List",
      action: (e) => e.chain().focus().toggleBulletList().run(),
      isActive: (e) => e.isActive("bulletList"),
    },
    {
      icon: ListOrdered,
      label: "Ordered List",
      action: (e) => e.chain().focus().toggleOrderedList().run(),
      isActive: (e) => e.isActive("orderedList"),
    },
    {
      icon: Quote,
      label: "Blockquote",
      action: (e) => e.chain().focus().toggleBlockquote().run(),
      isActive: (e) => e.isActive("blockquote"),
    },
    {
      icon: CodeSquare,
      label: "Code Block",
      action: (e) => e.chain().focus().toggleCodeBlock().run(),
      isActive: (e) => e.isActive("codeBlock"),
    },
    {
      icon: Minus,
      label: "Horizontal Rule",
      action: (e) => e.chain().focus().setHorizontalRule().run(),
    },
  ],
  // Media
  [
    {
      icon: Link,
      label: "Link",
      action: (e) => {
        const previousUrl = e.getAttributes("link").href;
        const url = window.prompt("Enter URL", previousUrl);
        if (url === null) return;
        if (url === "") {
          e.chain().focus().extendMarkRange("link").unsetLink().run();
          return;
        }
        e.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
      },
      isActive: (e) => e.isActive("link"),
    },
    {
      icon: Image,
      label: "Image",
      action: (e) => {
        const url = window.prompt("Enter image URL");
        if (url) {
          e.chain().focus().setImage({ src: url }).run();
        }
      },
    },
    {
      icon: Youtube,
      label: "YouTube Video",
      action: (e) => {
        const url = window.prompt("Enter YouTube URL");
        if (url) {
          e.commands.setYoutubeVideo({ src: url });
        }
      },
    },
  ],
];

export function Toolbar({ editor }: ToolbarProps) {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b bg-slate-50 px-2 py-1 dark:bg-slate-900">
      {TOOLBAR_GROUPS.map((group, groupIdx) => (
        <div key={groupIdx} className="flex items-center">
          {groupIdx > 0 && (
            <Separator orientation="vertical" className="mx-1 h-6" />
          )}
          {group.map((item) => (
            <Tooltip key={item.label}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8",
                    item.isActive?.(editor) &&
                      "bg-slate-200 dark:bg-slate-700"
                  )}
                  onClick={() => item.action(editor)}
                >
                  <item.icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {item.label}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      ))}
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { generateHTML } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import ImageExtension from "@tiptap/extension-image";
import UnderlineExtension from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { cn } from "@/lib/utils";
import {
  getEmbedUrl,
  type VideoProvider,
} from "./extensions/video-embed";
import { ContentRendererCodeBlock } from "./content-renderer-code-block";

const lowlight = createLowlight(common);

// Extensions for HTML generation (read-only, no YouTube/VideoEmbed node views needed)
const extensions = [
  StarterKit.configure({
    codeBlock: false,
  }),
  LinkExtension.configure({
    openOnClick: true,
    HTMLAttributes: {
      class:
        "text-blue-600 underline underline-offset-2 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300",
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
  TextAlign.configure({
    types: ["heading", "paragraph"],
  }),
  CodeBlockLowlight.configure({
    lowlight,
  }),
];

interface ContentRendererProps {
  content: Record<string, unknown> | null | undefined;
  className?: string;
}

interface TiptapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  text?: string;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

/**
 * Renders Tiptap JSON content in read-only mode for student-facing lesson views.
 * Handles video embeds as responsive iframes and code blocks with syntax highlighting.
 */
export function ContentRenderer({ content, className }: ContentRendererProps) {
  const { html, videoEmbeds, codeBlocks } = useMemo(() => {
    if (!content) return { html: "", videoEmbeds: [], codeBlocks: [] };

    const doc = content as unknown as TiptapNode;
    const foundVideoEmbeds: Array<{
      provider: VideoProvider;
      videoId: string;
      index: number;
    }> = [];
    const foundCodeBlocks: Array<{
      language: string;
      code: string;
      index: number;
    }> = [];

    // Extract video embeds and code blocks, replace with placeholders in the content
    let placeholderIndex = 0;
    const processedContent = {
      ...doc,
      content: (doc.content || []).flatMap((node) => {
        if (node.type === "videoEmbed") {
          const idx = placeholderIndex++;
          foundVideoEmbeds.push({
            provider: (node.attrs?.provider as VideoProvider) || "youtube",
            videoId: (node.attrs?.videoId as string) || "",
            index: idx,
          });
          // Replace with a paragraph containing a marker
          return [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: `%%VIDEO_EMBED_${idx}%%`,
                },
              ],
            },
          ];
        }
        if (node.type === "codeBlock") {
          const idx = placeholderIndex++;
          const code = (node.content || [])
            .map((child) => child.text || "")
            .join("");
          foundCodeBlocks.push({
            language: (node.attrs?.language as string) || "plaintext",
            code,
            index: idx,
          });
          return [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: `%%CODE_BLOCK_${idx}%%`,
                },
              ],
            },
          ];
        }
        // Also handle the YouTube extension nodes if present
        if (node.type === "youtube") {
          const idx = placeholderIndex++;
          const src = (node.attrs?.src as string) || "";
          // Extract video ID from YouTube embed URL
          let videoId = "";
          try {
            const url = new URL(src);
            if (url.pathname.includes("/embed/")) {
              videoId = url.pathname.split("/embed/")[1] || "";
            } else {
              videoId = url.searchParams.get("v") || url.pathname.slice(1);
            }
          } catch {
            videoId = "";
          }
          foundVideoEmbeds.push({
            provider: "youtube",
            videoId,
            index: idx,
          });
          return [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: `%%VIDEO_EMBED_${idx}%%`,
                },
              ],
            },
          ];
        }
        return [node];
      }),
    } as Record<string, unknown>;

    let generatedHtml = "";
    try {
      generatedHtml = generateHTML(processedContent, extensions);
    } catch {
      // Fallback: try rendering without processing
      try {
        generatedHtml = generateHTML(content, extensions);
      } catch {
        generatedHtml = "<p>Content could not be rendered.</p>";
      }
    }

    return {
      html: generatedHtml,
      videoEmbeds: foundVideoEmbeds,
      codeBlocks: foundCodeBlocks,
    };
  }, [content]);

  if (!content) {
    return null;
  }

  // Split HTML by placeholders and interleave with React components
  const parts = html.split(/(%%VIDEO_EMBED_\d+%%|%%CODE_BLOCK_\d+%%)/).filter(Boolean);

  return (
    <div
      className={cn(
        "prose prose-slate dark:prose-invert max-w-none",
        className
      )}
    >
      {parts.map((part, i) => {
        const videoMatch = part.match(/%%VIDEO_EMBED_(\d+)%%/);
        if (videoMatch) {
          const idx = parseInt(videoMatch[1], 10);
          const embed = videoEmbeds.find((v) => v.index === idx);
          if (embed) {
            const embedUrl = getEmbedUrl(embed.provider, embed.videoId);
            if (embedUrl) {
              return (
                <div key={`video-${idx}`} className="my-4">
                  <div className="aspect-video overflow-hidden rounded-lg bg-black">
                    <iframe
                      src={embedUrl}
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={`${embed.provider} video`}
                    />
                  </div>
                </div>
              );
            }
          }
          return null;
        }

        const codeMatch = part.match(/%%CODE_BLOCK_(\d+)%%/);
        if (codeMatch) {
          const idx = parseInt(codeMatch[1], 10);
          const block = codeBlocks.find((c) => c.index === idx);
          if (block) {
            return (
              <ContentRendererCodeBlock
                key={`code-${idx}`}
                language={block.language}
                code={block.code}
              />
            );
          }
          return null;
        }

        // Regular HTML content — strip the placeholder paragraph wrappers
        const cleanedPart = part
          .replace(/<p>%%VIDEO_EMBED_\d+%%<\/p>/g, "")
          .replace(/<p>%%CODE_BLOCK_\d+%%<\/p>/g, "");

        if (!cleanedPart.trim()) return null;

        return (
          <div
            key={`html-${i}`}
            dangerouslySetInnerHTML={{ __html: cleanedPart }}
          />
        );
      })}
    </div>
  );
}

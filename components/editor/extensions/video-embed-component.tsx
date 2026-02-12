"use client";

import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { getEmbedUrl, type VideoProvider } from "./video-embed";

const PROVIDER_CONFIG: Record<
  VideoProvider,
  { label: string; color: string; bgColor: string }
> = {
  youtube: {
    label: "YouTube",
    color: "text-white",
    bgColor: "bg-red-600",
  },
  vimeo: {
    label: "Vimeo",
    color: "text-white",
    bgColor: "bg-blue-500",
  },
  loom: {
    label: "Loom",
    color: "text-white",
    bgColor: "bg-purple-600",
  },
};

export function VideoEmbedComponent(props: NodeViewProps) {
  const { node, deleteNode, selected } = props;
  const { provider, videoId, src } = node.attrs as {
    provider: VideoProvider | null;
    videoId: string | null;
    src: string | null;
  };
  const [isHovered, setIsHovered] = useState(false);

  if (!provider || !videoId) {
    return (
      <NodeViewWrapper>
        <div className="my-4 flex items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          Invalid video URL: {src || "No URL provided"}
        </div>
      </NodeViewWrapper>
    );
  }

  const embedUrl = getEmbedUrl(provider, videoId);
  const config = PROVIDER_CONFIG[provider];

  if (!embedUrl) {
    return (
      <NodeViewWrapper>
        <div className="my-4 flex items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          Could not generate embed for this video
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper>
      <div
        className={`relative my-4 ${selected ? "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-950" : ""}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Provider badge */}
        <div className="absolute left-2 top-2 z-10">
          <span
            className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${config.bgColor} ${config.color}`}
          >
            {config.label}
          </span>
        </div>

        {/* Delete button */}
        {isHovered && (
          <div className="absolute right-2 top-2 z-10">
            <button
              type="button"
              className="rounded-md bg-red-600 p-1.5 text-white shadow-md transition-colors hover:bg-red-700"
              onClick={deleteNode}
              aria-label="Remove video"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Video iframe */}
        <div className="aspect-video overflow-hidden rounded-lg bg-black">
          <iframe
            src={embedUrl}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={`${config.label} video`}
          />
        </div>
      </div>
    </NodeViewWrapper>
  );
}

import { Node, mergeAttributes, ReactNodeViewRenderer } from "@tiptap/react";
import { VideoEmbedComponent } from "./video-embed-component";

export type VideoProvider = "youtube" | "vimeo" | "loom";

export interface VideoEmbedOptions {
  HTMLAttributes: Record<string, string>;
  allowedProviders: VideoProvider[];
}

declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    videoEmbed: {
      setVideoEmbed: (options: { src: string }) => ReturnType;
    };
  }
}

/**
 * Detect the video provider from a URL.
 */
export function detectProvider(url: string): VideoProvider | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace("www.", "");

    if (host === "youtube.com" || host === "youtu.be") return "youtube";
    if (host === "vimeo.com" || host === "player.vimeo.com") return "vimeo";
    if (host === "loom.com" || host === "www.loom.com") return "loom";

    return null;
  } catch {
    return null;
  }
}

/**
 * Extract the video ID from a URL based on its provider.
 */
export function extractVideoId(
  url: string,
  provider: VideoProvider
): string | null {
  try {
    const parsed = new URL(url);

    switch (provider) {
      case "youtube": {
        // youtube.com/watch?v=ID or youtu.be/ID
        if (parsed.hostname.replace("www.", "") === "youtu.be") {
          return parsed.pathname.slice(1) || null;
        }
        return parsed.searchParams.get("v") || null;
      }
      case "vimeo": {
        // vimeo.com/ID or vimeo.com/channels/xxx/ID
        const segments = parsed.pathname.split("/").filter(Boolean);
        const lastSegment = segments[segments.length - 1];
        return lastSegment && /^\d+$/.test(lastSegment) ? lastSegment : null;
      }
      case "loom": {
        // loom.com/share/ID or loom.com/embed/ID
        const parts = parsed.pathname.split("/").filter(Boolean);
        if (
          parts.length >= 2 &&
          (parts[0] === "share" || parts[0] === "embed")
        ) {
          return parts[1] || null;
        }
        return null;
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

/**
 * Get the embed URL for a video.
 */
export function getEmbedUrl(
  provider: VideoProvider,
  videoId: string
): string | null {
  switch (provider) {
    case "youtube":
      return `https://www.youtube.com/embed/${videoId}`;
    case "vimeo":
      return `https://player.vimeo.com/video/${videoId}`;
    case "loom":
      return `https://www.loom.com/embed/${videoId}`;
    default:
      return null;
  }
}

export const VideoEmbed = Node.create<VideoEmbedOptions>({
  name: "videoEmbed",

  group: "block",

  atom: true,

  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      allowedProviders: ["youtube", "vimeo", "loom"],
    };
  },

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-src"),
        renderHTML: (attributes) => ({
          "data-src": attributes.src as string,
        }),
      },
      provider: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-provider"),
        renderHTML: (attributes) => ({
          "data-provider": attributes.provider as string,
        }),
      },
      videoId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-video-id"),
        renderHTML: (attributes) => ({
          "data-video-id": attributes.videoId as string,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="video-embed"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(
        { "data-type": "video-embed" },
        this.options.HTMLAttributes,
        HTMLAttributes
      ),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(VideoEmbedComponent);
  },

  addCommands() {
    return {
      setVideoEmbed:
        (options) =>
        ({ commands }) => {
          const provider = detectProvider(options.src);
          if (!provider) return false;

          const videoId = extractVideoId(options.src, provider);
          if (!videoId) return false;

          return commands.insertContent({
            type: this.name,
            attrs: {
              src: options.src,
              provider,
              videoId,
            },
          });
        },
    };
  },
});

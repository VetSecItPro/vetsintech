"use client";

import { useState, useCallback } from "react";
import type { Editor } from "@tiptap/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  detectProvider,
  extractVideoId,
  getEmbedUrl,
  type VideoProvider,
} from "./extensions/video-embed";

const PROVIDER_CONFIG: Record<
  VideoProvider,
  { label: string; color: string; borderColor: string }
> = {
  youtube: {
    label: "YouTube",
    color: "text-red-600",
    borderColor: "border-red-600",
  },
  vimeo: {
    label: "Vimeo",
    color: "text-blue-500",
    borderColor: "border-blue-500",
  },
  loom: {
    label: "Loom",
    color: "text-purple-600",
    borderColor: "border-purple-600",
  },
};

interface MediaEmbedDialogProps {
  editor: Editor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MediaEmbedDialog({
  editor,
  open,
  onOpenChange,
}: MediaEmbedDialogProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const provider = url ? detectProvider(url) : null;
  const videoId = provider ? extractVideoId(url, provider) : null;
  const embedUrl = provider && videoId ? getEmbedUrl(provider, videoId) : null;
  const config = provider ? PROVIDER_CONFIG[provider] : null;

  const handleInsert = useCallback(() => {
    if (!url || !provider || !videoId) {
      setError("Please enter a valid YouTube, Vimeo, or Loom URL.");
      return;
    }

    editor.chain().focus().setVideoEmbed({ src: url }).run();
    setUrl("");
    setError(null);
    onOpenChange(false);
  }, [editor, url, provider, videoId, onOpenChange]);

  const handleUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setUrl(value);
      setError(null);

      if (value && !detectProvider(value)) {
        setError("URL not recognized. Supported: YouTube, Vimeo, Loom.");
      }
    },
    []
  );

  const handleClose = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        setUrl("");
        setError(null);
      }
      onOpenChange(isOpen);
    },
    [onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Embed Video</DialogTitle>
          <DialogDescription>
            Paste a YouTube, Vimeo, or Loom URL to embed a video.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Input
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={handleUrlChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && embedUrl) {
                  handleInsert();
                }
              }}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            {config && videoId && (
              <p className={`text-sm font-medium ${config.color}`}>
                {config.label} video detected
              </p>
            )}
          </div>

          {/* Preview */}
          {embedUrl && (
            <div
              className={`overflow-hidden rounded-lg border-2 ${config?.borderColor ?? "border-slate-200"}`}
            >
              <div className="aspect-video bg-black">
                <iframe
                  src={embedUrl}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="Video preview"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button onClick={handleInsert} disabled={!embedUrl}>
            Insert Video
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

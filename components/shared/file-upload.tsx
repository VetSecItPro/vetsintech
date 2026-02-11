"use client";

import { useCallback, useState } from "react";
import { Upload, X, FileIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "video/mp4",
  "video/webm",
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

interface FileUploadProps {
  onUpload: (file: File) => Promise<{ url: string; path: string }>;
  onRemove?: (path: string) => void;
  accept?: string;
  maxSize?: number;
  className?: string;
}

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  url: string;
  path: string;
}

export function FileUpload({
  onUpload,
  onRemove,
  accept,
  maxSize = MAX_FILE_SIZE,
  className,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return `File type "${file.type}" is not allowed`;
      }
      if (file.size > maxSize) {
        return `File exceeds maximum size of ${formatFileSize(maxSize)}`;
      }
      return null;
    },
    [maxSize]
  );

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      setIsUploading(true);
      try {
        const result = await onUpload(file);
        setUploadedFiles((prev) => [
          ...prev,
          {
            name: file.name,
            size: file.size,
            type: file.type,
            url: result.url,
            path: result.path,
          },
        ]);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Upload failed. Please try again."
        );
      } finally {
        setIsUploading(false);
      }
    },
    [onUpload, validateFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = ""; // Reset so same file can be re-selected
    },
    [handleFile]
  );

  const handleRemove = useCallback(
    (path: string) => {
      setUploadedFiles((prev) => prev.filter((f) => f.path !== path));
      onRemove?.(path);
    },
    [onRemove]
  );

  return (
    <div className={cn("space-y-3", className)}>
      {/* Drop zone */}
      <label
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors",
          isDragging
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
            : "border-slate-300 hover:border-slate-400 dark:border-slate-700 dark:hover:border-slate-600",
          isUploading && "pointer-events-none opacity-60"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input
          type="file"
          className="hidden"
          onChange={handleInputChange}
          accept={accept || ALLOWED_TYPES.join(",")}
          disabled={isUploading}
        />
        {isUploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        ) : (
          <Upload className="h-8 w-8 text-slate-400" />
        )}
        <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-400">
          {isUploading
            ? "Uploading..."
            : "Drop a file here or click to browse"}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Max {formatFileSize(maxSize)} — Images, PDFs, Docs, Videos
        </p>
      </label>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {/* Uploaded files list */}
      {uploadedFiles.length > 0 && (
        <ul className="space-y-2">
          {uploadedFiles.map((file) => (
            <li
              key={file.path}
              className="flex items-center justify-between rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <FileIcon className="h-4 w-4 flex-shrink-0 text-slate-400" />
                <span className="truncate text-sm">{file.name}</span>
                <span className="flex-shrink-0 text-xs text-slate-400">
                  {formatFileSize(file.size)}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 flex-shrink-0"
                onClick={() => handleRemove(file.path)}
              >
                <X className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import {
  FileIcon,
  Trash2,
  Search,
  Download,
  Loader2,
  FolderOpen,
} from "lucide-react";
import { toast } from "sonner";
import { FileUpload } from "@/components/shared/file-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CourseFile {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  course_id: string | null;
  created_at: string;
}

interface CourseOption {
  id: string;
  title: string;
}

const ALL_VALUE = "__all__";

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getFileTypeLabel(mimeType: string): string {
  const map: Record<string, string> = {
    "application/pdf": "PDF",
    "image/jpeg": "Image",
    "image/png": "Image",
    "image/gif": "Image",
    "image/webp": "Image",
    "video/mp4": "Video",
    "video/webm": "Video",
    "text/plain": "Text",
    "text/csv": "CSV",
  };
  if (mimeType.includes("wordprocessingml") || mimeType.includes("msword"))
    return "Word";
  if (mimeType.includes("presentationml") || mimeType.includes("powerpoint"))
    return "PPT";
  return map[mimeType] || "File";
}

export default function FilesPage() {
  const [files, setFiles] = useState<CourseFile[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState<string>(ALL_VALUE);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    const params = new URLSearchParams();
    if (courseFilter !== ALL_VALUE) params.set("course_id", courseFilter);

    const res = await fetch(`/api/files?${params}`);
    if (res.ok) {
      const { data } = await res.json();
      setFiles(data);
    }
    setIsLoading(false);
  }, [courseFilter]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  useEffect(() => {
    async function fetchCourses() {
      const res = await fetch("/api/courses");
      if (res.ok) {
        const { data } = await res.json();
        setCourses(data.map((c: { id: string; title: string }) => ({ id: c.id, title: c.title })));
      }
    }
    fetchCourses();
  }, []);

  async function handleUpload(file: File): Promise<{ url: string; path: string }> {
    const formData = new FormData();
    formData.append("file", file);
    if (courseFilter !== ALL_VALUE) {
      formData.append("course_id", courseFilter);
    }

    const res = await fetch("/api/files", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Upload failed" }));
      throw new Error(error);
    }

    const { data } = await res.json();
    toast.success("File uploaded");
    await fetchFiles();
    return { url: data.url, path: data.path };
  }

  async function handleDelete(fileId: string) {
    setDeletingId(fileId);
    try {
      const res = await fetch(`/api/files?id=${fileId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      toast.success("File deleted");
    } catch {
      toast.error("Failed to delete file");
    } finally {
      setDeletingId(null);
    }
  }

  const filteredFiles = files.filter((f) =>
    search.trim()
      ? f.file_name.toLowerCase().includes(search.toLowerCase())
      : true
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">File Library</h1>
        <p className="text-sm text-slate-500">
          Manage uploaded files across your courses
        </p>
      </div>

      {/* Upload area */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload File</CardTitle>
          <CardDescription>
            Upload files to your organization&apos;s library. Files are stored securely in Supabase Storage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FileUpload onUpload={handleUpload} />
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={courseFilter} onValueChange={setCourseFilter}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Filter by course" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All Courses</SelectItem>
            {courses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Files table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FolderOpen className="h-10 w-10 text-slate-300" />
              <p className="mt-2 font-medium text-slate-600">No files found</p>
              <p className="text-sm text-slate-400">
                Upload files using the form above
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="w-[100px]">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFiles.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileIcon className="h-4 w-4 flex-shrink-0 text-slate-400" />
                        <span className="truncate font-medium max-w-[300px]">
                          {file.file_name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {getFileTypeLabel(file.file_type)}
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {formatFileSize(file.file_size)}
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {formatDate(file.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Download"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-700"
                          onClick={() => handleDelete(file.id)}
                          disabled={deletingId === file.id}
                          title="Delete"
                        >
                          {deletingId === file.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

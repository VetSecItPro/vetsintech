"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import type { ResourceWithCourse, ResourceType } from "@/lib/domains/resources/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  FileText,
  Presentation,
  File,
  Sheet,
  Video,
  Link as LinkIcon,
  GitBranch,
  FileQuestion,
  Download,
  ExternalLink,
  LayoutGrid,
  List,
  Eye,
} from "lucide-react";

// ---------- Resource type icon helper ----------

const RESOURCE_TYPE_ICONS: Record<ResourceType, typeof FileText> = {
  pdf: FileText,
  slide: Presentation,
  document: File,
  spreadsheet: Sheet,
  video: Video,
  link: LinkIcon,
  repo: GitBranch,
  other: FileQuestion,
};

const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  pdf: "PDF",
  slide: "Slides",
  document: "Document",
  spreadsheet: "Spreadsheet",
  video: "Video",
  link: "Link",
  repo: "Repository",
  other: "Other",
};

const ALL_VALUE = "__all__";

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface ResourceLibraryClientProps {
  initialResources: ResourceWithCourse[];
  courses: { id: string; title: string }[];
  isAdmin: boolean;
  onEdit?: (resourceId: string) => void;
  onDelete?: (resourceId: string) => void;
}

export function ResourceLibraryClient({
  initialResources,
  courses,
  isAdmin,
  onEdit,
  onDelete,
}: ResourceLibraryClientProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>(ALL_VALUE);
  const [courseFilter, setCourseFilter] = useState<string>(ALL_VALUE);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const filteredResources = useMemo(() => {
    let result = initialResources;

    if (typeFilter !== ALL_VALUE) {
      result = result.filter((r) => r.type === typeFilter);
    }

    if (courseFilter !== ALL_VALUE) {
      if (courseFilter === "__orgwide__") {
        result = result.filter((r) => !r.course_id);
      } else {
        result = result.filter((r) => r.course_id === courseFilter);
      }
    }

    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(term) ||
          (r.description && r.description.toLowerCase().includes(term)) ||
          r.tags.some((t) => t.toLowerCase().includes(term))
      );
    }

    return result;
  }, [initialResources, search, typeFilter, courseFilter]);

  async function handleDownload(resource: ResourceWithCourse) {
    // Track download
    try {
      await fetch(`/api/resources/${resource.id}/download`, {
        method: "POST",
      });
    } catch {
      // Non-blocking — download tracking failure is not critical
    }

    if (resource.external_url) {
      window.open(resource.external_url, "_blank", "noopener,noreferrer");
    } else if (resource.file_path) {
      // For file-based resources, trigger a download via the storage path
      window.open(resource.file_path, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Resource Library</h1>
        <p className="text-muted-foreground">
          Browse and download shared resources, documents, and links.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search resources..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All Types</SelectItem>
            {(Object.keys(RESOURCE_TYPE_LABELS) as ResourceType[]).map((type) => (
              <SelectItem key={type} value={type}>
                {RESOURCE_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={courseFilter} onValueChange={setCourseFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Course" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All Courses</SelectItem>
            <SelectItem value="__orgwide__">Org-wide</SelectItem>
            {courses.map((course) => (
              <SelectItem key={course.id} value={course.id}>
                {course.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-1">
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("list")}
          >
            <List className="size-4" />
          </Button>
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="size-4" />
          </Button>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {filteredResources.length} resource{filteredResources.length !== 1 ? "s" : ""}
      </p>

      {/* Resource list / grid */}
      {filteredResources.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-700 py-12">
          <FileText className="h-10 w-10 text-slate-600" />
          <p className="mt-3 font-medium text-slate-400">No resources found</p>
          <p className="text-sm text-slate-500">
            Try adjusting your search or filters.
          </p>
        </div>
      ) : viewMode === "list" ? (
        <div className="space-y-2">
          {filteredResources.map((resource) => {
            const Icon = RESOURCE_TYPE_ICONS[resource.type] || FileQuestion;
            return (
              <div
                key={resource.id}
                className="flex items-center gap-4 rounded-lg border border-slate-800 p-4 transition-colors hover:border-slate-700"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-800">
                  <Icon className="size-5 text-slate-400" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-medium">{resource.title}</h3>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {RESOURCE_TYPE_LABELS[resource.type]}
                    </Badge>
                  </div>
                  {resource.description && (
                    <p className="mt-0.5 truncate text-sm text-slate-500">
                      {resource.description}
                    </p>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    {resource.course ? (
                      <span>{resource.course.title}</span>
                    ) : (
                      <span>Org-wide</span>
                    )}
                    {resource.file_size && (
                      <>
                        <span className="text-slate-700">&middot;</span>
                        <span>{formatFileSize(resource.file_size)}</span>
                      </>
                    )}
                    <span className="text-slate-700">&middot;</span>
                    <span className="flex items-center gap-1">
                      <Download className="size-3" />
                      {resource.download_count}
                    </span>
                    {resource.tags.length > 0 && (
                      <>
                        <span className="text-slate-700">&middot;</span>
                        {resource.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {resource.tags.length > 3 && (
                          <span className="text-slate-500">
                            +{resource.tags.length - 3}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {isAdmin && onEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(resource.id)}
                    >
                      Edit
                    </Button>
                  )}
                  {isAdmin && onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300"
                      onClick={() => onDelete(resource.id)}
                    >
                      Delete
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(resource)}
                  >
                    {resource.external_url ? (
                      <>
                        <ExternalLink className="mr-1 size-3" />
                        Open
                      </>
                    ) : (
                      <>
                        <Download className="mr-1 size-3" />
                        Download
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredResources.map((resource) => {
            const Icon = RESOURCE_TYPE_ICONS[resource.type] || FileQuestion;
            return (
              <div
                key={resource.id}
                className="flex flex-col overflow-hidden rounded-lg border border-slate-800 transition-colors hover:border-slate-700"
              >
                <div className="flex h-24 items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                  <Icon className="size-10 text-slate-500" />
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {RESOURCE_TYPE_LABELS[resource.type]}
                    </Badge>
                    {resource.course && (
                      <span className="truncate text-xs text-blue-400">
                        {resource.course.title}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 font-semibold line-clamp-1">
                    {resource.title}
                  </h3>
                  {resource.description && (
                    <p className="mt-1 flex-1 text-xs text-slate-500 line-clamp-2">
                      {resource.description}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-1">
                    {resource.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-800 pt-3">
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      {resource.file_size && (
                        <span>{formatFileSize(resource.file_size)}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Download className="size-3" />
                        {resource.download_count}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {isAdmin && onEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(resource.id)}
                        >
                          Edit
                        </Button>
                      )}
                      {isAdmin && onDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300"
                          onClick={() => onDelete(resource.id)}
                        >
                          Delete
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(resource)}
                      >
                        {resource.external_url ? (
                          <ExternalLink className="size-3" />
                        ) : (
                          <Download className="size-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

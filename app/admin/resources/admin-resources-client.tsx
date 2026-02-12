"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ResourceWithCourse } from "@/lib/domains/resources/types";
import { ResourceLibraryClient } from "@/app/(student)/resources/resource-library-client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ResourceFormDialog } from "./resource-form-dialog";

interface AdminResourcesClientProps {
  initialResources: ResourceWithCourse[];
  courses: { id: string; title: string }[];
}

export function AdminResourcesClient({
  initialResources,
  courses,
}: AdminResourcesClientProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);

  const editingResource = editingResourceId
    ? initialResources.find((r) => r.id === editingResourceId) ?? null
    : null;

  async function handleDelete(resourceId: string) {
    if (
      !confirm(
        "Are you sure you want to delete this resource? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/resources/${resourceId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to delete resource");
      }

      toast.success("Resource deleted successfully");
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete resource";
      toast.error(message);
    }
  }

  function handleEdit(resourceId: string) {
    setEditingResourceId(resourceId);
    setDialogOpen(true);
  }

  function handleDialogClose() {
    setDialogOpen(false);
    setEditingResourceId(null);
  }

  return (
    <div className="space-y-6">
      {/* Add button header */}
      <div className="flex items-center justify-end">
        <Button onClick={() => setDialogOpen(true)}>
          <Plus />
          Add Resource
        </Button>
      </div>

      {/* Shared resource library component — admin mode */}
      <ResourceLibraryClient
        initialResources={initialResources}
        courses={courses}
        isAdmin={true}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Create / Edit dialog */}
      <ResourceFormDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        courses={courses}
        resource={editingResource}
      />
    </div>
  );
}

"use client";

import { useState } from "react";
import { courseSchema, type CourseFormData } from "@/lib/utils/validation";
import type { Course } from "@/lib/domains/courses/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface CourseFormProps {
  initialData?: Course;
  onSubmit: (data: CourseFormData) => Promise<void>;
  isLoading: boolean;
}

interface FieldErrors {
  title?: string;
  description?: string;
  category?: string;
  tags?: string;
  estimated_duration_minutes?: string;
}

export function CourseForm({ initialData, onSubmit, isLoading }: CourseFormProps) {
  const isEditing = Boolean(initialData);

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [category, setCategory] = useState(initialData?.category ?? "");
  const [tagsInput, setTagsInput] = useState(
    initialData?.tags?.join(", ") ?? ""
  );
  const [durationMinutes, setDurationMinutes] = useState(
    initialData?.estimated_duration_minutes?.toString() ?? ""
  );
  const [errors, setErrors] = useState<FieldErrors>({});

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const formData: Record<string, unknown> = {
      title: title.trim(),
    };

    if (description.trim()) {
      formData.description = description.trim();
    }
    if (category.trim()) {
      formData.category = category.trim();
    }
    if (tags.length > 0) {
      formData.tags = tags;
    }
    if (durationMinutes.trim()) {
      formData.estimated_duration_minutes = parseInt(durationMinutes, 10);
    }

    const result = courseSchema.safeParse(formData);

    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof FieldErrors;
        if (field && !fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    await onSubmit(result.data);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? "Edit Course" : "Create New Course"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Introduction to Cybersecurity"
              aria-invalid={Boolean(errors.title)}
              disabled={isLoading}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what students will learn..."
              rows={4}
              aria-invalid={Boolean(errors.description)}
              disabled={isLoading}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description}</p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Security, Networking, Cloud"
              aria-invalid={Boolean(errors.category)}
              disabled={isLoading}
            />
            {errors.category && (
              <p className="text-sm text-destructive">{errors.category}</p>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Comma-separated, e.g. beginner, hands-on, certification"
              aria-invalid={Boolean(errors.tags)}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Separate tags with commas
            </p>
            {errors.tags && (
              <p className="text-sm text-destructive">{errors.tags}</p>
            )}
          </div>

          {/* Estimated Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration">Estimated Duration (minutes)</Label>
            <Input
              id="duration"
              type="number"
              min={1}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              placeholder="e.g. 120"
              aria-invalid={Boolean(errors.estimated_duration_minutes)}
              disabled={isLoading}
            />
            {errors.estimated_duration_minutes && (
              <p className="text-sm text-destructive">
                {errors.estimated_duration_minutes}
              </p>
            )}
          </div>

          {/* Submit */}
          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? isEditing
                  ? "Saving..."
                  : "Creating..."
                : isEditing
                  ? "Save Changes"
                  : "Create Course"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

"use client";

import { useState } from "react";
import {
  learningPathSchema,
  type LearningPathFormData,
} from "@/lib/domains/learning-paths/validation";
import type { LearningPath } from "@/lib/domains/learning-paths/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface LearningPathFormProps {
  initialData?: LearningPath;
  onSubmit: (data: LearningPathFormData) => Promise<void>;
  isLoading: boolean;
}

interface FieldErrors {
  title?: string;
  description?: string;
  estimated_hours?: string;
  difficulty_level?: string;
  tags?: string;
  thumbnail_url?: string;
}

export function LearningPathForm({
  initialData,
  onSubmit,
  isLoading,
}: LearningPathFormProps) {
  const isEditing = Boolean(initialData);

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(
    initialData?.description ?? ""
  );
  const [estimatedHours, setEstimatedHours] = useState(
    initialData?.estimated_hours?.toString() ?? ""
  );
  const [difficultyLevel, setDifficultyLevel] = useState(
    initialData?.difficulty_level ?? ""
  );
  const [tagsInput, setTagsInput] = useState(
    initialData?.tags?.join(", ") ?? ""
  );
  const [thumbnailUrl, setThumbnailUrl] = useState(
    initialData?.thumbnail_url ?? ""
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
    if (estimatedHours.trim()) {
      formData.estimated_hours = parseInt(estimatedHours, 10);
    }
    if (difficultyLevel) {
      formData.difficulty_level = difficultyLevel;
    }
    if (tags.length > 0) {
      formData.tags = tags;
    }
    if (thumbnailUrl.trim()) {
      formData.thumbnail_url = thumbnailUrl.trim();
    }

    const result = learningPathSchema.safeParse(formData);

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
        <CardTitle>
          {isEditing ? "Edit Learning Path" : "Create New Learning Path"}
        </CardTitle>
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
              placeholder="e.g. Web Development Bootcamp"
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
              placeholder="Describe what students will achieve by completing this path..."
              rows={4}
              aria-invalid={Boolean(errors.description)}
              disabled={isLoading}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description}</p>
            )}
          </div>

          {/* Difficulty Level */}
          <div className="space-y-2">
            <Label htmlFor="difficulty_level">Difficulty Level</Label>
            <Select
              value={difficultyLevel}
              onValueChange={setDifficultyLevel}
              disabled={isLoading}
            >
              <SelectTrigger id="difficulty_level">
                <SelectValue placeholder="Select difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
            {errors.difficulty_level && (
              <p className="text-sm text-destructive">
                {errors.difficulty_level}
              </p>
            )}
          </div>

          {/* Estimated Hours */}
          <div className="space-y-2">
            <Label htmlFor="estimated_hours">Estimated Hours</Label>
            <Input
              id="estimated_hours"
              type="number"
              min={1}
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
              placeholder="e.g. 40"
              aria-invalid={Boolean(errors.estimated_hours)}
              disabled={isLoading}
            />
            {errors.estimated_hours && (
              <p className="text-sm text-destructive">
                {errors.estimated_hours}
              </p>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Comma-separated, e.g. web-dev, fullstack, javascript"
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

          {/* Thumbnail URL */}
          <div className="space-y-2">
            <Label htmlFor="thumbnail_url">Thumbnail URL</Label>
            <Input
              id="thumbnail_url"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              aria-invalid={Boolean(errors.thumbnail_url)}
              disabled={isLoading}
            />
            {errors.thumbnail_url && (
              <p className="text-sm text-destructive">
                {errors.thumbnail_url}
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
                  : "Create Learning Path"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

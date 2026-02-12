import Link from "next/link";
import Image from "next/image";
import { getAuthenticatedUser } from "@/lib/supabase/auth-guard";
import { ROUTES } from "@/lib/constants/routes";
import { getPublishedPathsWithProgress } from "@/lib/domains/learning-paths/queries";
import { BookOpen, Clock, GraduationCap, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Learning Paths",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  intermediate:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  advanced: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

export default async function PathsPage() {
  const { user, organizationId } = await getAuthenticatedUser();

  const paths = await getPublishedPathsWithProgress(
    organizationId,
    user.id
  );

  const enrolledPaths = paths.filter((p) => p.enrollment !== null);
  const availablePaths = paths.filter((p) => p.enrollment === null);

  return (
    <div className="space-y-8">
      {/* Enrolled Paths */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Learning Paths</h1>
        <p className="text-sm text-slate-500">
          Your enrolled learning paths and progress
        </p>

        {enrolledPaths.length > 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {enrolledPaths.map((path) => (
              <Link
                key={path.id}
                href={ROUTES.path(path.id)}
                className="group flex flex-col overflow-hidden rounded-lg border border-slate-800 transition-colors hover:border-slate-700"
              >
                <div className="flex h-32 items-center justify-center bg-gradient-to-br from-indigo-950 to-slate-900">
                  {path.thumbnail_url ? (
                    <Image
                      src={path.thumbnail_url}
                      alt={path.title}
                      width={400}
                      height={300}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Layers className="h-10 w-10 text-indigo-500/50" />
                  )}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-center gap-2">
                    {path.difficulty_level && (
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${DIFFICULTY_COLORS[path.difficulty_level] || ""}`}
                      >
                        {path.difficulty_level}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-1 font-semibold group-hover:text-indigo-400 transition-colors">
                    {path.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                    {path.description || "No description"}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      {path.course_count} course{path.course_count !== 1 ? "s" : ""}
                    </span>
                    {path.estimated_hours && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {path.estimated_hours}h
                      </span>
                    )}
                  </div>
                  <div className="mt-auto pt-3">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{path.progress_percentage}% complete</span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-indigo-500 transition-all"
                        style={{
                          width: `${Math.min(path.progress_percentage, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-6 flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-700 py-12">
            <GraduationCap className="h-10 w-10 text-slate-600" />
            <p className="mt-3 font-medium text-slate-400">
              No enrolled learning paths yet
            </p>
            <p className="text-sm text-slate-500">
              Browse available paths below to get started
            </p>
          </div>
        )}
      </div>

      {/* Available Paths */}
      {availablePaths.length > 0 && (
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            Available Learning Paths
          </h2>
          <p className="text-sm text-slate-500">
            Structured tracks to guide your learning
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {availablePaths.map((path) => (
              <Link
                key={path.id}
                href={ROUTES.path(path.id)}
                className="flex flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-900/30 transition-colors hover:border-slate-700"
              >
                <div className="flex h-32 items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                  {path.thumbnail_url ? (
                    <Image
                      src={path.thumbnail_url}
                      alt={path.title}
                      width={400}
                      height={300}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Layers className="h-10 w-10 text-slate-600" />
                  )}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-center gap-2">
                    {path.difficulty_level && (
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${DIFFICULTY_COLORS[path.difficulty_level] || ""}`}
                      >
                        {path.difficulty_level}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-1 font-semibold">{path.title}</h3>
                  <p className="mt-1 flex-1 text-xs text-slate-500 line-clamp-2">
                    {path.description || "No description"}
                  </p>
                  <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      {path.course_count} course{path.course_count !== 1 ? "s" : ""}
                    </span>
                    {path.estimated_hours && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {path.estimated_hours}h
                      </span>
                    )}
                  </div>
                  {path.tags && path.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {path.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[10px]">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

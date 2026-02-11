import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BookOpen, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Course Catalog — VetsInTech",
  description:
    "Browse our library of technology courses designed for veterans. From cybersecurity to software development.",
};

export default async function CatalogPage() {
  const supabase = await createClient();

  // Fetch published courses (public — no auth required)
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, slug, description, category, thumbnail_url, estimated_duration_minutes, tags")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Course Catalog
        </h1>
        <p className="mt-4 text-slate-400">
          Explore our growing library of technology courses designed specifically
          for veteran learners. Sign up to enroll and start learning today.
        </p>
      </div>

      {courses && courses.length > 0 ? (
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <div
              key={course.id}
              className="flex flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-900/50 transition-colors hover:border-slate-700"
            >
              {/* Thumbnail placeholder */}
              <div className="flex h-40 items-center justify-center bg-gradient-to-br from-blue-950 to-slate-900">
                {course.thumbnail_url ? (
                  <img
                    src={course.thumbnail_url}
                    alt={course.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <BookOpen className="h-12 w-12 text-blue-500/50" />
                )}
              </div>

              <div className="flex flex-1 flex-col p-5">
                {course.category && (
                  <span className="mb-2 text-xs font-medium text-blue-400">
                    {course.category}
                  </span>
                )}
                <h3 className="font-semibold">{course.title}</h3>
                <p className="mt-2 flex-1 text-sm text-slate-400 line-clamp-2">
                  {course.description || "No description available."}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  {course.estimated_duration_minutes && (
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="h-3 w-3" />
                      {Math.round(course.estimated_duration_minutes / 60)}h
                    </span>
                  )}
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/register">
                      Enroll
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-12 flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-700 py-16">
          <BookOpen className="h-12 w-12 text-slate-600" />
          <p className="mt-3 text-lg font-medium text-slate-400">
            Courses coming soon
          </p>
          <p className="text-sm text-slate-500">
            We&apos;re preparing our course catalog. Check back soon or sign up
            to be notified.
          </p>
          <Button className="mt-4" asChild>
            <Link href="/register">Sign Up for Updates</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  GraduationCap,
  MessageSquare,
  Bell,
  User,
  Settings,
  Search,
  Users,
  Award,
  BarChart3,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { ROUTES } from "@/lib/constants/routes";

interface CommandPaletteProps {
  isAdmin?: boolean;
}

export function CommandPalette({ isAdmin }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setOpen((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages, actions..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Student">
          <CommandItem onSelect={() => navigate(ROUTES.dashboard)}>
            <GraduationCap className="mr-2 h-4 w-4" />
            Dashboard
          </CommandItem>
          <CommandItem onSelect={() => navigate(ROUTES.courses)}>
            <BookOpen className="mr-2 h-4 w-4" />
            My Courses
          </CommandItem>
          <CommandItem onSelect={() => navigate(ROUTES.community)}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Community
          </CommandItem>
          <CommandItem onSelect={() => navigate(ROUTES.notifications)}>
            <Bell className="mr-2 h-4 w-4" />
            Notifications
          </CommandItem>
          <CommandItem onSelect={() => navigate(ROUTES.profile)}>
            <User className="mr-2 h-4 w-4" />
            Profile
          </CommandItem>
        </CommandGroup>

        {isAdmin && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Admin">
              <CommandItem onSelect={() => navigate(ROUTES.adminDashboard)}>
                <BarChart3 className="mr-2 h-4 w-4" />
                Admin Dashboard
              </CommandItem>
              <CommandItem onSelect={() => navigate(ROUTES.adminCourses)}>
                <BookOpen className="mr-2 h-4 w-4" />
                Manage Courses
              </CommandItem>
              <CommandItem onSelect={() => navigate(ROUTES.adminCohorts)}>
                <GraduationCap className="mr-2 h-4 w-4" />
                Manage Cohorts
              </CommandItem>
              <CommandItem onSelect={() => navigate(ROUTES.adminStudents)}>
                <Users className="mr-2 h-4 w-4" />
                Manage Students
              </CommandItem>
              <CommandItem onSelect={() => navigate(ROUTES.adminAnnouncements)}>
                <Bell className="mr-2 h-4 w-4" />
                Announcements
              </CommandItem>
              <CommandItem onSelect={() => navigate(ROUTES.adminIntegrations)}>
                <Award className="mr-2 h-4 w-4" />
                Integrations
              </CommandItem>
              <CommandItem onSelect={() => navigate(ROUTES.adminSettings)}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </CommandItem>
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => navigate("/community/new")}>
            <MessageSquare className="mr-2 h-4 w-4" />
            New Discussion
          </CommandItem>
          {isAdmin && (
            <>
              <CommandItem onSelect={() => navigate(ROUTES.adminNewCourse)}>
                <BookOpen className="mr-2 h-4 w-4" />
                Create Course
              </CommandItem>
              <CommandItem onSelect={() => navigate(ROUTES.adminNewCohort)}>
                <GraduationCap className="mr-2 h-4 w-4" />
                Create Cohort
              </CommandItem>
              <CommandItem onSelect={() => navigate(ROUTES.adminNewAnnouncement)}>
                <Bell className="mr-2 h-4 w-4" />
                New Announcement
              </CommandItem>
            </>
          )}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

// Trigger button for nav bars
export function SearchTrigger({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-300"
    >
      <Search className="h-4 w-4" />
      <span className="hidden sm:inline">Search...</span>
      <kbd className="hidden rounded border border-slate-600 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 sm:inline">
        ⌘K
      </kbd>
    </button>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  Users,
  GraduationCap,
  LayoutDashboard,
  Settings,
  MessageSquare,
  Megaphone,
  Link2,
  Menu,
  LogOut,
  FolderKanban,
  FolderOpen,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/constants/routes";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface NavSection {
  title: string;
  items: {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      { href: ROUTES.adminDashboard, label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "Content",
    items: [
      { href: ROUTES.adminCourses, label: "Courses", icon: BookOpen },
      { href: ROUTES.adminCohorts, label: "Cohorts", icon: FolderKanban },
      { href: ROUTES.adminFiles, label: "Files", icon: FolderOpen },
    ],
  },
  {
    title: "People",
    items: [
      { href: ROUTES.adminStudents, label: "Students", icon: Users },
    ],
  },
  {
    title: "Community",
    items: [
      { href: ROUTES.adminAnnouncements, label: "Announcements", icon: Megaphone },
      { href: ROUTES.adminDiscussions, label: "Discussions", icon: MessageSquare },
    ],
  },
  {
    title: "System",
    items: [
      { href: ROUTES.adminIntegrations, label: "Integrations", icon: Link2 },
      { href: ROUTES.adminSettings, label: "Settings", icon: Settings },
    ],
  },
];

function SidebarContent({ pathname }: { pathname: string }) {
  return (
    <div className="flex h-full flex-col">
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_SECTIONS.map((section, idx) => (
          <div key={section.title}>
            {idx > 0 && <Separator className="my-3" />}
            <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {section.title}
            </p>
            {section.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  pathname.startsWith(item.href)
                    ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>
    </div>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(ROUTES.login);
    router.refresh();
  }

  return (
    <>
      {/* Mobile header with sheet */}
      <header className="sticky top-0 z-50 flex h-14 items-center border-b bg-white px-4 md:hidden dark:bg-slate-950">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="border-b px-6 py-4">
              <SheetTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Admin Panel
              </SheetTitle>
            </SheetHeader>
            <SidebarContent pathname={pathname} />
          </SheetContent>
        </Sheet>
        <span className="ml-3 text-sm font-semibold text-slate-900 dark:text-white">
          VetsInTech Admin
        </span>
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden w-64 flex-shrink-0 border-r bg-white md:flex md:flex-col dark:bg-slate-950">
        <div className="flex h-14 items-center border-b px-6">
          <Link
            href={ROUTES.adminDashboard}
            className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white"
          >
            <GraduationCap className="h-5 w-5" />
            Admin Panel
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarContent pathname={pathname} />
        </div>
        <div className="border-t p-3">
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="w-full justify-start gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950 dark:hover:text-red-300"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>
    </>
  );
}

"use client";

import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { CommandPalette } from "@/components/shared/command-palette";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      <AdminSidebar />
      <CommandPalette isAdmin />
      <div className="flex flex-1 flex-col">
        <main className="flex-1 px-4 py-6 md:px-8 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}

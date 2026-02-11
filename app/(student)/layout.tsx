"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { StudentNav } from "@/components/layout/student-nav";
import { CommandPalette } from "@/components/shared/command-palette";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [userName, setUserName] = useState<string | undefined>();

  useEffect(() => {
    async function fetchUser() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.user_metadata?.full_name) {
        setUserName(user.user_metadata.full_name);
      }
    }
    fetchUser();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <StudentNav userName={userName} />
      <CommandPalette />
      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}

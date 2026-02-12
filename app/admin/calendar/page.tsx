import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/constants/routes";
import { getCalendarItems } from "@/lib/domains/calendar/queries";
import { getCourses } from "@/lib/domains/courses/queries";
import { AdminCalendarClient } from "./admin-calendar-client";
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  addMonths,
} from "date-fns";

export const metadata = {
  title: "Manage Calendar",
};

export default async function AdminCalendarPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(ROUTES.login);

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();
  if (!profile) redirect(ROUTES.login);

  const now = new Date();
  const startDate = startOfMonth(subMonths(now, 1)).toISOString();
  const endDate = endOfMonth(addMonths(now, 1)).toISOString();

  const [items, courses] = await Promise.all([
    getCalendarItems(profile.organization_id, startDate, endDate),
    getCourses(profile.organization_id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
        <p className="text-sm text-slate-500">
          Manage custom events, view assignment and quiz deadlines
        </p>
      </div>

      <AdminCalendarClient
        initialItems={items}
        courses={courses.map((c) => ({ id: c.id, title: c.title }))}
        organizationId={profile.organization_id}
      />
    </div>
  );
}

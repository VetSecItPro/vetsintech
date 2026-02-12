import { getAuthenticatedUser } from "@/lib/supabase/auth-guard";
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
  const { organizationId } = await getAuthenticatedUser();

  const now = new Date();
  const startDate = startOfMonth(subMonths(now, 1)).toISOString();
  const endDate = endOfMonth(addMonths(now, 1)).toISOString();

  const [items, courses] = await Promise.all([
    getCalendarItems(organizationId, startDate, endDate),
    getCourses(organizationId),
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
        organizationId={organizationId}
      />
    </div>
  );
}

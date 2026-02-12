import { getAuthenticatedUser } from "@/lib/supabase/auth-guard";
import { getCalendarItems } from "@/lib/domains/calendar/queries";
import { StudentCalendarClient } from "./student-calendar-client";
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  addMonths,
} from "date-fns";

export const metadata = {
  title: "Calendar",
};

export default async function StudentCalendarPage() {
  const { organizationId } = await getAuthenticatedUser();

  // Fetch a 3-month window of calendar items (previous, current, next month)
  const now = new Date();
  const startDate = startOfMonth(subMonths(now, 1)).toISOString();
  const endDate = endOfMonth(addMonths(now, 1)).toISOString();

  const items = await getCalendarItems(
    organizationId,
    startDate,
    endDate
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
        <p className="text-sm text-slate-500">
          View assignment deadlines, quiz due dates, and events
        </p>
      </div>

      <StudentCalendarClient initialItems={items} />
    </div>
  );
}

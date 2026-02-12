import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/constants/routes";
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

  // Fetch a 3-month window of calendar items (previous, current, next month)
  const now = new Date();
  const startDate = startOfMonth(subMonths(now, 1)).toISOString();
  const endDate = endOfMonth(addMonths(now, 1)).toISOString();

  const items = await getCalendarItems(
    profile.organization_id,
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

      <StudentCalendarClient
        initialItems={items}
        organizationId={profile.organization_id}
      />
    </div>
  );
}

// ============================================================================
// Calendar Domain Types
// Maps to: calendar_events, plus aggregated assignment/quiz deadlines
// ============================================================================

// ---------- Enums ----------

export type CalendarEventType = "custom" | "office_hours" | "meeting" | "deadline";
export type CalendarViewMode = "month" | "week" | "day";
export type CalendarItemType = "assignment" | "quiz" | "event";

// ---------- Core Entity ----------

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: CalendarEventType;
  start_time: string;
  end_time: string | null;
  all_day: boolean;
  course_id: string | null;
  cohort_id: string | null;
  color: string;
  recurring: boolean;
  recurrence_rule: string | null;
  organization_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ---------- Unified Calendar Display ----------

/** Unified type for rendering items in the calendar view. */
export interface CalendarItem {
  id: string;
  title: string;
  type: CalendarItemType;
  startTime: string;
  endTime: string | null;
  allDay: boolean;
  courseId: string | null;
  courseName: string | null;
  color: string;
  url: string | null;
}

// ---------- Dashboard Widget ----------

/** Used by the "Due This Week" dashboard widget. */
export interface UpcomingDeadline {
  id: string;
  title: string;
  type: CalendarItemType;
  dueDate: string;
  courseName: string | null;
  courseId: string | null;
  isOverdue: boolean;
  daysUntilDue: number;
}

// ---------- Input Types ----------

export interface CreateCalendarEventInput {
  title: string;
  description?: string | null;
  event_type?: CalendarEventType;
  start_time: string;
  end_time?: string | null;
  all_day?: boolean;
  course_id?: string | null;
  cohort_id?: string | null;
  color?: string;
  recurring?: boolean;
  recurrence_rule?: string | null;
  organization_id: string;
  created_by: string;
}

export interface UpdateCalendarEventInput {
  title?: string;
  description?: string | null;
  event_type?: CalendarEventType;
  start_time?: string;
  end_time?: string | null;
  all_day?: boolean;
  course_id?: string | null;
  cohort_id?: string | null;
  color?: string;
  recurring?: boolean;
  recurrence_rule?: string | null;
}

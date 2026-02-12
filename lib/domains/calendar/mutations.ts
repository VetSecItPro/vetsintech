import { createClient } from "@/lib/supabase/server";
import type {
  CalendarEvent,
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
} from "./types";

// ============================================================================
// Calendar Event Mutations
// ============================================================================

/**
 * Create a new custom calendar event.
 */
export async function createCalendarEvent(
  input: CreateCalendarEventInput
): Promise<CalendarEvent> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("calendar_events")
    .insert({
      title: input.title,
      description: input.description || null,
      event_type: input.event_type || "custom",
      start_time: input.start_time,
      end_time: input.end_time || null,
      all_day: input.all_day ?? false,
      course_id: input.course_id || null,
      cohort_id: input.cohort_id || null,
      color: input.color || "#3b82f6",
      recurring: input.recurring ?? false,
      recurrence_rule: input.recurrence_rule || null,
      organization_id: input.organization_id,
      created_by: input.created_by,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update an existing calendar event.
 */
export async function updateCalendarEvent(
  eventId: string,
  input: UpdateCalendarEventInput
): Promise<CalendarEvent> {
  const supabase = await createClient();

  const payload: Record<string, unknown> = {};
  if (input.title !== undefined) payload.title = input.title;
  if (input.description !== undefined) payload.description = input.description;
  if (input.event_type !== undefined) payload.event_type = input.event_type;
  if (input.start_time !== undefined) payload.start_time = input.start_time;
  if (input.end_time !== undefined) payload.end_time = input.end_time;
  if (input.all_day !== undefined) payload.all_day = input.all_day;
  if (input.course_id !== undefined) payload.course_id = input.course_id;
  if (input.cohort_id !== undefined) payload.cohort_id = input.cohort_id;
  if (input.color !== undefined) payload.color = input.color;
  if (input.recurring !== undefined) payload.recurring = input.recurring;
  if (input.recurrence_rule !== undefined)
    payload.recurrence_rule = input.recurrence_rule;

  const { data, error } = await supabase
    .from("calendar_events")
    .update(payload)
    .eq("id", eventId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a calendar event.
 */
export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("id", eventId);

  if (error) throw error;
}

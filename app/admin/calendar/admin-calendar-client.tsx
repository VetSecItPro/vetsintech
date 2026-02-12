"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  addMonths,
} from "date-fns";
import { Plus } from "lucide-react";
import type { CalendarItem } from "@/lib/domains/calendar/types";
import { CalendarView } from "@/components/calendar/calendar-view";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AdminCalendarClientProps {
  initialItems: CalendarItem[];
  courses: { id: string; title: string }[];
  organizationId: string;
}

const EVENT_TYPES = [
  { value: "custom", label: "Custom" },
  { value: "office_hours", label: "Office Hours" },
  { value: "meeting", label: "Meeting" },
  { value: "deadline", label: "Deadline" },
];

const EVENT_COLORS = [
  { value: "#22c55e", label: "Green" },
  { value: "#3b82f6", label: "Blue" },
  { value: "#a855f7", label: "Purple" },
  { value: "#f59e0b", label: "Amber" },
  { value: "#ef4444", label: "Red" },
  { value: "#06b6d4", label: "Cyan" },
];

export function AdminCalendarClient({
  initialItems,
  courses,
  organizationId,
}: AdminCalendarClientProps) {
  const router = useRouter();
  const [items, setItems] = useState<CalendarItem[]>(initialItems);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState("custom");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [courseId, setCourseId] = useState<string>("");
  const [color, setColor] = useState("#22c55e");

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setEventType("custom");
    setStartTime("");
    setEndTime("");
    setAllDay(false);
    setCourseId("");
    setColor("#22c55e");
  };

  const handleCreateEvent = async () => {
    if (!title || !startTime) return;
    setSaving(true);

    try {
      const res = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || null,
          event_type: eventType,
          start_time: new Date(startTime).toISOString(),
          end_time: endTime ? new Date(endTime).toISOString() : null,
          all_day: allDay,
          course_id: courseId || null,
          color,
        }),
      });

      if (res.ok) {
        setDialogOpen(false);
        resetForm();
        router.refresh();
      } else {
        const json = await res.json();
        console.error("Failed to create event:", json.error);
      }
    } catch (error) {
      console.error("Failed to create event:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const res = await fetch(`/api/calendar/events/${eventId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to delete event:", error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Event
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Calendar Event</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="event-title">Title</Label>
                <Input
                  id="event-title"
                  placeholder="Event title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="event-description">Description</Label>
                <Textarea
                  id="event-description"
                  placeholder="Optional description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Event Type */}
              <div className="space-y-2">
                <Label>Event Type</Label>
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Start / End time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="event-start">Start</Label>
                  <Input
                    id="event-start"
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-end">End (optional)</Label>
                  <Input
                    id="event-end"
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>

              {/* All day toggle */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="event-all-day"
                  checked={allDay}
                  onChange={(e) => setAllDay(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-blue-600"
                />
                <Label htmlFor="event-all-day" className="text-sm">
                  All day event
                </Label>
              </div>

              {/* Course (optional) */}
              <div className="space-y-2">
                <Label>Course (optional)</Label>
                <Select value={courseId} onValueChange={setCourseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Organization-wide" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Organization-wide</SelectItem>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Color */}
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2">
                  {EVENT_COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setColor(c.value)}
                      className="h-8 w-8 rounded-full border-2 transition-all"
                      style={{
                        backgroundColor: c.value,
                        borderColor:
                          color === c.value ? "white" : "transparent",
                      }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateEvent}
                  disabled={saving || !title || !startTime}
                >
                  {saving ? "Creating..." : "Create Event"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <CalendarView items={items} />
    </div>
  );
}

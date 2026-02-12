"use client";

import { useState, useEffect, useTransition } from "react";
import { Bell, Mail, Send, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface EmailPreferences {
  announcement_emails: boolean;
  grade_emails: boolean;
  assignment_reminder_emails: boolean;
  enrollment_emails: boolean;
  discussion_reply_emails: boolean;
  weekly_digest: boolean;
}

const PREFERENCE_LABELS: {
  key: keyof EmailPreferences;
  label: string;
  description: string;
}[] = [
  {
    key: "announcement_emails",
    label: "Announcements",
    description: "Get notified when new announcements are posted",
  },
  {
    key: "grade_emails",
    label: "Grades",
    description: "Receive an email when a grade is posted for your work",
  },
  {
    key: "assignment_reminder_emails",
    label: "Assignment Reminders",
    description: "Reminders about upcoming assignment deadlines",
  },
  {
    key: "enrollment_emails",
    label: "Enrollments",
    description: "Confirmation when you are enrolled in a new course",
  },
  {
    key: "discussion_reply_emails",
    label: "Discussion Replies",
    description: "Get notified when someone replies to your discussion post",
  },
  {
    key: "weekly_digest",
    label: "Weekly Digest",
    description: "A summary of your learning progress each week",
  },
];

export default function NotificationSettingsPage() {
  const [prefs, setPrefs] = useState<EmailPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, startSaveTransition] = useTransition();
  const [isSendingTest, startTestTransition] = useTransition();
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    async function fetchPrefs() {
      try {
        const res = await fetch("/api/email/preferences");
        if (res.ok) {
          const { data } = await res.json();
          setPrefs({
            announcement_emails: data.announcement_emails,
            grade_emails: data.grade_emails,
            assignment_reminder_emails: data.assignment_reminder_emails,
            enrollment_emails: data.enrollment_emails,
            discussion_reply_emails: data.discussion_reply_emails,
            weekly_digest: data.weekly_digest,
          });
        }
      } finally {
        setLoading(false);
      }
    }
    fetchPrefs();
  }, []);

  function handleToggle(key: keyof EmailPreferences) {
    if (!prefs) return;
    setPrefs((prev) => (prev ? { ...prev, [key]: !prev[key] } : prev));
    setDirty(true);
  }

  function handleSave() {
    if (!prefs) return;
    startSaveTransition(async () => {
      try {
        const res = await fetch("/api/email/preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(prefs),
        });

        if (res.ok) {
          toast.success("Email preferences saved");
          setDirty(false);
        } else {
          const err = await res.json();
          toast.error(err.error || "Failed to save preferences");
        }
      } catch {
        toast.error("Something went wrong");
      }
    });
  }

  function handleSendTest() {
    startTestTransition(async () => {
      try {
        const res = await fetch("/api/email/test", { method: "POST" });

        if (res.ok) {
          toast.success("Test email sent! Check your inbox.");
        } else {
          const err = await res.json();
          toast.error(err.error || "Failed to send test email");
        }
      } catch {
        toast.error("Something went wrong");
      }
    });
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">
          Email Notifications
        </h1>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-lg bg-slate-800"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Email Notifications
        </h1>
        <p className="text-sm text-slate-500">
          Choose which email notifications you receive
        </p>
      </div>

      {/* Header icon */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-700">
          <Bell className="h-5 w-5 text-amber-400" />
        </div>
        <div>
          <p className="font-medium">Notification Preferences</p>
          <p className="text-sm text-slate-500">
            Toggle each category on or off
          </p>
        </div>
      </div>

      {/* Preference toggles */}
      <div className="space-y-1 rounded-lg border border-slate-800">
        {PREFERENCE_LABELS.map(({ key, label, description }) => (
          <div
            key={key}
            className="flex items-center justify-between px-6 py-4 border-b border-slate-800 last:border-b-0"
          >
            <div className="space-y-0.5 pr-4">
              <Label
                htmlFor={key}
                className="text-sm font-medium cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-400" />
                  {label}
                </div>
              </Label>
              <p className="text-xs text-slate-500">{description}</p>
            </div>
            <Switch
              id={key}
              checked={prefs?.[key] ?? false}
              onCheckedChange={() => handleToggle(key)}
            />
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={isSaving || !dirty}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Preferences
        </Button>

        <Button
          variant="outline"
          onClick={handleSendTest}
          disabled={isSendingTest}
        >
          {isSendingTest ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          Send Test Email
        </Button>
      </div>
    </div>
  );
}

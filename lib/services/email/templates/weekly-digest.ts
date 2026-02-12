// ============================================================================
// Weekly Digest Email Template
// ============================================================================

import { baseTemplate } from "./base";

export interface WeeklyDigestCourse {
  name: string;
  progressPercent: number;
}

export interface WeeklyDigestDeadline {
  title: string;
  dueDate: string;
}

export interface WeeklyDigestEmailData {
  coursesInProgress: WeeklyDigestCourse[];
  lessonsCompletedThisWeek: number;
  upcomingDeadlines: WeeklyDigestDeadline[];
  dashboardUrl: string;
  unsubscribeUrl?: string;
}

export function weeklyDigestSubject(): string {
  return "Your Weekly Learning Summary";
}

function progressBar(percent: number): string {
  const bar = `
    <div style="width: 100%; height: 8px; background-color: #334155; border-radius: 4px; overflow: hidden;">
      <div style="width: ${percent}%; height: 8px; background-color: #C5A55A; border-radius: 4px;"></div>
    </div>`;
  return `
    <div style="margin: 4px 0 0 0;">
      ${bar}
      <span style="font-size: 12px; color: #94a3b8;">${percent}% complete</span>
    </div>`;
}

export function weeklyDigestHtml(data: WeeklyDigestEmailData): string {
  // Courses section
  const coursesHtml = data.coursesInProgress.length > 0
    ? data.coursesInProgress
        .map(
          (c) => `
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #1e293b;">
              <p style="margin: 0 0 4px 0; font-weight: 600; color: #f1f5f9;">${c.name}</p>
              ${progressBar(c.progressPercent)}
            </td>
          </tr>`
        )
        .join("")
    : `<tr><td style="padding: 12px 16px; color: #64748b;">No courses in progress.</td></tr>`;

  // Deadlines section
  const deadlinesHtml = data.upcomingDeadlines.length > 0
    ? data.upcomingDeadlines
        .map(
          (d) => `
          <tr>
            <td style="padding: 8px 16px; border-bottom: 1px solid #1e293b;">
              <span style="color: #f1f5f9;">${d.title}</span>
              <span style="float: right; color: #ef4444; font-size: 13px;">${d.dueDate}</span>
            </td>
          </tr>`
        )
        .join("")
    : `<tr><td style="padding: 8px 16px; color: #64748b;">No upcoming deadlines.</td></tr>`;

  const bodyHtml = `
    <!-- Stats highlight -->
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 24px 0; width: 100%;">
      <tr>
        <td style="padding: 16px; background-color: #0f172a; border-radius: 8px; text-align: center;">
          <p style="margin: 0 0 4px 0; font-size: 36px; font-weight: 700; color: #C5A55A;">
            ${data.lessonsCompletedThisWeek}
          </p>
          <p style="margin: 0; font-size: 13px; color: #94a3b8;">Lessons completed this week</p>
        </td>
      </tr>
    </table>

    <!-- Courses in progress -->
    <p style="margin: 0 0 8px 0; font-weight: 600; color: #f1f5f9; font-size: 16px;">
      Courses in Progress
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #0f172a; border-radius: 8px; margin-bottom: 24px;">
      ${coursesHtml}
    </table>

    <!-- Upcoming deadlines -->
    <p style="margin: 0 0 8px 0; font-weight: 600; color: #f1f5f9; font-size: 16px;">
      Upcoming Deadlines
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #0f172a; border-radius: 8px;">
      ${deadlinesHtml}
    </table>
  `;

  return baseTemplate({
    heading: "Your Weekly Learning Summary",
    preheader: `You completed ${data.lessonsCompletedThisWeek} lessons this week`,
    bodyHtml,
    ctaUrl: data.dashboardUrl,
    ctaLabel: "Go to Dashboard",
    unsubscribeUrl: data.unsubscribeUrl,
  });
}

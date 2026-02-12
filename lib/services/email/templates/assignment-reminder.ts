// ============================================================================
// Assignment Reminder Email Template
// ============================================================================

import { baseTemplate } from "./base";

export interface AssignmentReminderEmailData {
  courseName: string;
  assignmentTitle: string;
  dueDate: string;
  viewUrl: string;
  unsubscribeUrl?: string;
}

export function assignmentReminderSubject(title: string): string {
  return `Assignment Due Soon: ${title}`;
}

export function assignmentReminderHtml(data: AssignmentReminderEmailData): string {
  const bodyHtml = `
    <p style="margin: 0 0 12px 0;">
      You have an upcoming deadline in <strong style="color: #f1f5f9;">${data.courseName}</strong>.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 16px 0; width: 100%;">
      <tr>
        <td style="padding: 16px; background-color: #0f172a; border-radius: 8px;">
          <p style="margin: 0 0 8px 0; font-size: 13px; color: #94a3b8;">Assignment</p>
          <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #f1f5f9;">
            ${data.assignmentTitle}
          </p>
          <p style="margin: 0 0 8px 0; font-size: 13px; color: #94a3b8;">Due Date</p>
          <p style="margin: 0; font-size: 16px; font-weight: 600; color: #ef4444;">
            ${data.dueDate}
          </p>
        </td>
      </tr>
    </table>
  `;

  return baseTemplate({
    heading: "Assignment Due Soon",
    preheader: `${data.assignmentTitle} is due ${data.dueDate}`,
    bodyHtml,
    ctaUrl: data.viewUrl,
    ctaLabel: "View Assignment",
    unsubscribeUrl: data.unsubscribeUrl,
  });
}

// ============================================================================
// Enrollment Confirmation Email Template
// ============================================================================

import { baseTemplate } from "./base";

export interface EnrollmentEmailData {
  courseName: string;
  viewUrl: string;
  unsubscribeUrl?: string;
}

export function enrollmentSubject(courseName: string): string {
  return `You've been enrolled in ${courseName}`;
}

export function enrollmentHtml(data: EnrollmentEmailData): string {
  const bodyHtml = `
    <p style="margin: 0 0 16px 0;">
      Welcome! You have been enrolled in a new course.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 16px 0; width: 100%;">
      <tr>
        <td style="padding: 16px; background-color: #0f172a; border-radius: 8px;">
          <p style="margin: 0 0 8px 0; font-size: 13px; color: #94a3b8;">Course</p>
          <p style="margin: 0; font-size: 18px; font-weight: 600; color: #C5A55A;">
            ${data.courseName}
          </p>
        </td>
      </tr>
    </table>
    <p style="margin: 16px 0 0 0;">
      You can start learning right away by clicking the button below.
    </p>
  `;

  return baseTemplate({
    heading: "Enrollment Confirmed",
    preheader: `You've been enrolled in ${data.courseName}`,
    bodyHtml,
    ctaUrl: data.viewUrl,
    ctaLabel: "Start Learning",
    unsubscribeUrl: data.unsubscribeUrl,
  });
}

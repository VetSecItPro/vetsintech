// ============================================================================
// Grade Posted Email Template
// ============================================================================

import { baseTemplate } from "./base";

export interface GradePostedEmailData {
  courseName: string;
  itemName: string;
  score: string;
  viewUrl: string;
  unsubscribeUrl?: string;
}

export function gradePostedSubject(itemName: string): string {
  return `Grade Posted: ${itemName}`;
}

export function gradePostedHtml(data: GradePostedEmailData): string {
  const bodyHtml = `
    <p style="margin: 0 0 12px 0;">
      Your grade has been posted for an item in <strong style="color: #f1f5f9;">${data.courseName}</strong>.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 16px 0; width: 100%;">
      <tr>
        <td style="padding: 16px; background-color: #0f172a; border-radius: 8px;">
          <p style="margin: 0 0 8px 0; font-size: 13px; color: #94a3b8;">Item</p>
          <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #f1f5f9;">
            ${data.itemName}
          </p>
          <p style="margin: 0 0 8px 0; font-size: 13px; color: #94a3b8;">Score</p>
          <p style="margin: 0; font-size: 24px; font-weight: 700; color: #C5A55A;">
            ${data.score}
          </p>
        </td>
      </tr>
    </table>
  `;

  return baseTemplate({
    heading: "Grade Posted",
    preheader: `Your grade for ${data.itemName}: ${data.score}`,
    bodyHtml,
    ctaUrl: data.viewUrl,
    ctaLabel: "View Grade",
    unsubscribeUrl: data.unsubscribeUrl,
  });
}

// ============================================================================
// Announcement Email Template
// ============================================================================

import { baseTemplate } from "./base";

export interface AnnouncementEmailData {
  organizationName: string;
  announcementTitle: string;
  previewText: string;
  viewUrl: string;
  unsubscribeUrl?: string;
}

export function announcementSubject(title: string): string {
  return `New Announcement: ${title}`;
}

export function announcementHtml(data: AnnouncementEmailData): string {
  const bodyHtml = `
    <p style="margin: 0 0 12px 0; color: #94a3b8; font-size: 13px;">
      From <strong style="color: #C5A55A;">${data.organizationName}</strong>
    </p>
    <p style="margin: 0 0 16px 0;">
      ${data.previewText}
    </p>
  `;

  return baseTemplate({
    heading: data.announcementTitle,
    preheader: `New announcement from ${data.organizationName}: ${data.previewText.slice(0, 80)}`,
    bodyHtml,
    ctaUrl: data.viewUrl,
    ctaLabel: "View Announcement",
    unsubscribeUrl: data.unsubscribeUrl,
  });
}

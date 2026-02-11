// ============================================================================
// Certificate PDF Generation Utility
// Renders the CertificatePDF component to a buffer using @react-pdf/renderer.
// ============================================================================

import { renderToBuffer } from "@react-pdf/renderer";
import { CertificatePDF } from "./pdf-template";
import type { CertificateWithDetails } from "./types";

/**
 * Generate a PDF buffer for a certificate.
 *
 * @param certificate - The certificate data with joined details
 * @returns A Buffer containing the rendered PDF bytes
 */
export async function generateCertificatePDF(
  certificate: CertificateWithDetails
): Promise<Buffer> {
  const completionDate = new Date(certificate.issued_at).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );

  const buffer = await renderToBuffer(
    CertificatePDF({
      studentName: certificate.student_name,
      courseTitle: certificate.course_title,
      completionDate,
      organizationName: certificate.organization_name,
      certificateNumber: certificate.certificate_number,
    })
  );

  return buffer;
}

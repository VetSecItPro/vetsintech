// ============================================================================
// Certificate Domain Types
// Maps to: certificates table
// ============================================================================

export type CertificateStatus = "issued" | "revoked";

export interface Certificate {
  id: string;
  user_id: string;
  course_id: string;
  cohort_id: string;
  organization_id: string;
  certificate_number: string;
  issued_at: string;
  status: CertificateStatus;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

/** Certificate joined with course title and student name for display */
export interface CertificateWithDetails extends Certificate {
  course_title: string;
  student_name: string;
  organization_name: string;
}

export interface IssueCertificateInput {
  user_id: string;
  course_id: string;
  cohort_id: string;
  organization_id: string;
}

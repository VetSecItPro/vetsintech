// ============================================================================
// Certificate Domain Mutations
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import type { Certificate, IssueCertificateInput } from "./types";

/**
 * Generate a unique certificate number.
 * Format: VIT-YYYYMMDD-XXXX (VetsinTech prefix + date + random suffix)
 */
function generateCertificateNumber(): string {
  const date = new Date();
  const dateStr =
    date.getFullYear().toString() +
    (date.getMonth() + 1).toString().padStart(2, "0") +
    date.getDate().toString().padStart(2, "0");
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `VIT-${dateStr}-${suffix}`;
}

/**
 * Issue a certificate to a student upon course completion.
 * Idempotent: returns existing certificate if already issued.
 */
export async function issueCertificate(
  input: IssueCertificateInput
): Promise<Certificate> {
  const supabase = await createClient();

  // Check for existing certificate (idempotent)
  const { data: existing, error: checkError } = await supabase
    .from("certificates")
    .select("*")
    .eq("user_id", input.user_id)
    .eq("course_id", input.course_id)
    .eq("status", "issued")
    .maybeSingle();

  if (checkError) throw checkError;
  if (existing) return existing;

  // Issue new certificate
  const { data, error } = await supabase
    .from("certificates")
    .insert({
      user_id: input.user_id,
      course_id: input.course_id,
      cohort_id: input.cohort_id,
      organization_id: input.organization_id,
      certificate_number: generateCertificateNumber(),
      issued_at: new Date().toISOString(),
      status: "issued",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Revoke a certificate (admin action).
 */
export async function revokeCertificate(
  certificateId: string
): Promise<Certificate> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("certificates")
    .update({ status: "revoked" })
    .eq("id", certificateId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

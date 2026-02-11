// ============================================================================
// Certificate Domain Queries
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import type { CertificateWithDetails } from "./types";

/**
 * Get a certificate by its ID.
 */
export async function getCertificateById(
  certificateId: string
): Promise<CertificateWithDetails | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("certificates")
    .select(
      `
      *,
      course:courses!inner(title),
      student:profiles!inner(full_name),
      org:organizations!inner(name)
    `
    )
    .eq("id", certificateId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return {
    ...data,
    course_title: (data.course as unknown as { title: string }).title,
    student_name: (data.student as unknown as { full_name: string }).full_name,
    organization_name: (data.org as unknown as { name: string }).name,
  };
}

/**
 * Get a certificate by its unique certificate number (for public verification).
 */
export async function getCertificateByNumber(
  certificateNumber: string
): Promise<CertificateWithDetails | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("certificates")
    .select(
      `
      *,
      course:courses!inner(title),
      student:profiles!inner(full_name),
      org:organizations!inner(name)
    `
    )
    .eq("certificate_number", certificateNumber)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return {
    ...data,
    course_title: (data.course as unknown as { title: string }).title,
    student_name: (data.student as unknown as { full_name: string }).full_name,
    organization_name: (data.org as unknown as { name: string }).name,
  };
}

/**
 * Get all certificates for a student in an organization.
 */
export async function getStudentCertificates(
  userId: string,
  organizationId: string
): Promise<CertificateWithDetails[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("certificates")
    .select(
      `
      *,
      course:courses!inner(title),
      student:profiles!inner(full_name),
      org:organizations!inner(name)
    `
    )
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .eq("status", "issued")
    .order("issued_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((cert) => ({
    ...cert,
    course_title: (cert.course as unknown as { title: string }).title,
    student_name: (cert.student as unknown as { full_name: string }).full_name,
    organization_name: (cert.org as unknown as { name: string }).name,
  }));
}

/**
 * Check if a student has a certificate for a specific course.
 */
export async function hasCertificate(
  userId: string,
  courseId: string
): Promise<boolean> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("certificates")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .eq("status", "issued");

  if (error) throw error;
  return (count ?? 0) > 0;
}

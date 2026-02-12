// ============================================================================
// Portfolio Domain Queries
// Read-only Supabase queries for portfolio data
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import type {
  PortfolioProfile,
  PortfolioItem,
  PublicPortfolio,
  PortfolioCourse,
  PortfolioCertificate,
  PortfolioBadge,
} from "./types";

// Select string for portfolio profile fields
const PORTFOLIO_PROFILE_SELECT = `
  id, full_name, email, bio, avatar_url, organization_id,
  username, headline, portfolio_public,
  linkedin_url, github_url, website_url,
  skills, military_branch, military_mos
`;

// ============================================================================
// Portfolio Profile
// ============================================================================

/**
 * Get portfolio profile for the authenticated user.
 */
export async function getPortfolioProfile(
  userId: string
): Promise<PortfolioProfile | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select(PORTFOLIO_PROFILE_SELECT)
    .eq("id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return {
    ...data,
    skills: data.skills || [],
  };
}

// ============================================================================
// Portfolio Items
// ============================================================================

/**
 * Get all portfolio items for a user, ordered by position.
 */
export async function getPortfolioItems(
  userId: string
): Promise<PortfolioItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("portfolio_items")
    .select("*")
    .eq("user_id", userId)
    .order("position", { ascending: true });

  if (error) throw error;
  return data || [];
}

// ============================================================================
// Username Availability
// ============================================================================

/**
 * Check whether a username is available.
 */
export async function checkUsernameAvailable(
  username: string
): Promise<boolean> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("username", username.toLowerCase());

  if (error) throw error;
  return (count ?? 0) === 0;
}

// ============================================================================
// Public Portfolio (aggregate query — no auth required)
// ============================================================================

/**
 * Get the full public portfolio for a given username.
 * Returns null if username doesn't exist or portfolio is not public.
 */
export async function getPublicPortfolio(
  username: string
): Promise<PublicPortfolio | null> {
  const supabase = await createClient();

  // 1. Get profile by username
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(PORTFOLIO_PROFILE_SELECT)
    .eq("username", username.toLowerCase())
    .single();

  if (profileError) {
    if (profileError.code === "PGRST116") return null;
    throw profileError;
  }

  if (!profile || !profile.portfolio_public) return null;

  const userId = profile.id;
  const organizationId = profile.organization_id;

  // 2. Get completed courses
  const completedCourses = await getCompletedCoursesForPortfolio(
    userId,
    organizationId
  );

  // 3. Get certificates
  const certificates = await getCertificatesForPortfolio(userId);

  // 4. Get visible portfolio items
  const { data: itemsData, error: itemsError } = await supabase
    .from("portfolio_items")
    .select("*")
    .eq("user_id", userId)
    .eq("visible", true)
    .order("position", { ascending: true });

  if (itemsError) throw itemsError;

  // 5. Get badges (handle gracefully if tables don't have data)
  const badges = await getBadgesForPortfolio(userId);

  // 6. Get total XP
  const totalXp = await getTotalXpForPortfolio(userId);

  return {
    profile: {
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      bio: profile.bio,
      headline: profile.headline,
      linkedin_url: profile.linkedin_url,
      github_url: profile.github_url,
      website_url: profile.website_url,
      skills: profile.skills || [],
      military_branch: profile.military_branch,
      military_mos: profile.military_mos,
    },
    completedCourses,
    certificates,
    portfolioItems: itemsData || [],
    badges,
    totalXp,
  };
}

// ============================================================================
// Internal helpers for public portfolio aggregation
// ============================================================================

async function getCompletedCoursesForPortfolio(
  userId: string,
  organizationId: string
): Promise<PortfolioCourse[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("enrollments")
    .select(
      `
      completed_at,
      cohort:cohorts!inner(
        organization_id,
        course:courses!inner(
          id,
          title,
          slug,
          category
        )
      )
    `
    )
    .eq("user_id", userId)
    .eq("status", "completed")
    .eq("cohort.organization_id", organizationId)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false });

  if (error) throw error;
  if (!data) return [];

  return data.map((enrollment) => {
    const cohort = enrollment.cohort as unknown as {
      organization_id: string;
      course: {
        id: string;
        title: string;
        slug: string;
        category: string | null;
      };
    };
    return {
      course_id: cohort.course.id,
      course_title: cohort.course.title,
      course_slug: cohort.course.slug,
      category: cohort.course.category,
      completed_at: enrollment.completed_at as string,
    };
  });
}

async function getCertificatesForPortfolio(
  userId: string
): Promise<PortfolioCertificate[]> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("certificates")
      .select(
        `
        id,
        certificate_number,
        issued_at,
        course:courses!inner(title)
      `
      )
      .eq("user_id", userId)
      .eq("status", "issued")
      .order("issued_at", { ascending: false });

    if (error) throw error;
    if (!data) return [];

    return data.map((cert) => ({
      id: cert.id,
      certificate_number: cert.certificate_number,
      course_title: (cert.course as unknown as { title: string }).title,
      issued_at: cert.issued_at,
    }));
  } catch {
    // Gracefully handle if certificates table has issues
    return [];
  }
}

async function getBadgesForPortfolio(
  userId: string
): Promise<PortfolioBadge[]> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("user_badges")
      .select(
        `
        earned_at,
        badge:badges!inner(
          id,
          name,
          description,
          icon,
          rarity
        )
      `
      )
      .eq("user_id", userId)
      .order("earned_at", { ascending: false });

    if (error) throw error;
    if (!data) return [];

    return data.map((ub) => {
      const badge = ub.badge as unknown as {
        id: string;
        name: string;
        description: string;
        icon: string;
        rarity: string;
      };
      return {
        id: badge.id,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        rarity: badge.rarity,
        earned_at: ub.earned_at,
      };
    });
  } catch {
    // Gracefully handle if gamification tables don't have data yet
    return [];
  }
}

async function getTotalXpForPortfolio(userId: string): Promise<number> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("xp_events")
      .select("xp_amount")
      .eq("user_id", userId);

    if (error) throw error;
    if (!data) return 0;

    return data.reduce((sum, row) => sum + (row.xp_amount ?? 0), 0);
  } catch {
    // Gracefully handle if gamification tables don't have data yet
    return 0;
  }
}

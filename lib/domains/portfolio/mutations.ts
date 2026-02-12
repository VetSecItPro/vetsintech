// ============================================================================
// Portfolio Domain Mutations
// Write operations for portfolio profile and items
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import type {
  PortfolioProfile,
  PortfolioItem,
  UpdatePortfolioProfileInput,
  CreatePortfolioItemInput,
  UpdatePortfolioItemInput,
} from "./types";

// Select string for portfolio profile fields
const PORTFOLIO_PROFILE_SELECT = `
  id, full_name, email, bio, avatar_url, organization_id,
  username, headline, portfolio_public,
  linkedin_url, github_url, website_url,
  skills, military_branch, military_mos
`;

// ============================================================================
// Portfolio Profile Mutations
// ============================================================================

/**
 * Update portfolio-specific profile fields.
 */
export async function updatePortfolioProfile(
  userId: string,
  input: UpdatePortfolioProfileInput
): Promise<PortfolioProfile> {
  const supabase = await createClient();

  const payload: Record<string, unknown> = {};
  if (input.headline !== undefined) payload.headline = input.headline;
  if (input.bio !== undefined) payload.bio = input.bio;
  if (input.linkedin_url !== undefined) payload.linkedin_url = input.linkedin_url;
  if (input.github_url !== undefined) payload.github_url = input.github_url;
  if (input.website_url !== undefined) payload.website_url = input.website_url;
  if (input.skills !== undefined) payload.skills = input.skills;
  if (input.military_branch !== undefined) payload.military_branch = input.military_branch;
  if (input.military_mos !== undefined) payload.military_mos = input.military_mos;
  if (input.portfolio_public !== undefined) payload.portfolio_public = input.portfolio_public;

  payload.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", userId)
    .select(PORTFOLIO_PROFILE_SELECT)
    .single();

  if (error) throw error;

  return {
    ...data,
    skills: data.skills || [],
  };
}

/**
 * Claim a unique username for public portfolio URL.
 */
export async function claimUsername(
  userId: string,
  username: string
): Promise<PortfolioProfile> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .update({
      username: username.toLowerCase(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select(PORTFOLIO_PROFILE_SELECT)
    .single();

  if (error) {
    // Unique constraint violation
    if (error.code === "23505") {
      throw new Error("Username is already taken");
    }
    throw error;
  }

  return {
    ...data,
    skills: data.skills || [],
  };
}

// ============================================================================
// Portfolio Item Mutations
// ============================================================================

/**
 * Create a new portfolio item.
 */
export async function createPortfolioItem(
  userId: string,
  input: CreatePortfolioItemInput
): Promise<PortfolioItem> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("portfolio_items")
    .insert({
      user_id: userId,
      title: input.title,
      description: input.description || null,
      item_type: input.item_type || "project",
      url: input.url || null,
      image_url: input.image_url || null,
      skills_used: input.skills_used || [],
      visible: input.visible ?? true,
      position: input.position ?? 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update an existing portfolio item (must belong to user).
 */
export async function updatePortfolioItem(
  itemId: string,
  userId: string,
  input: UpdatePortfolioItemInput
): Promise<PortfolioItem> {
  const supabase = await createClient();

  const payload: Record<string, unknown> = {};
  if (input.title !== undefined) payload.title = input.title;
  if (input.description !== undefined) payload.description = input.description;
  if (input.item_type !== undefined) payload.item_type = input.item_type;
  if (input.url !== undefined) payload.url = input.url;
  if (input.image_url !== undefined) payload.image_url = input.image_url;
  if (input.skills_used !== undefined) payload.skills_used = input.skills_used;
  if (input.visible !== undefined) payload.visible = input.visible;
  if (input.position !== undefined) payload.position = input.position;

  const { data, error } = await supabase
    .from("portfolio_items")
    .update(payload)
    .eq("id", itemId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a portfolio item (must belong to user).
 */
export async function deletePortfolioItem(
  itemId: string,
  userId: string
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("portfolio_items")
    .delete()
    .eq("id", itemId)
    .eq("user_id", userId);

  if (error) throw error;
}

/**
 * Reorder portfolio items by updating positions.
 */
export async function reorderPortfolioItems(
  userId: string,
  items: { id: string; position: number }[]
): Promise<void> {
  const supabase = await createClient();

  // Update each item's position — runs in sequence to avoid conflicts
  for (const item of items) {
    const { error } = await supabase
      .from("portfolio_items")
      .update({ position: item.position })
      .eq("id", item.id)
      .eq("user_id", userId);

    if (error) throw error;
  }
}

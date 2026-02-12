import { z } from "zod/v4";

// ============================================================================
// Portfolio Validation Schemas
// ============================================================================

export const militaryBranchSchema = z.enum([
  "Army",
  "Navy",
  "Air Force",
  "Marines",
  "Coast Guard",
  "Space Force",
  "National Guard",
]);

export const portfolioItemTypeSchema = z.enum([
  "project",
  "achievement",
  "work_sample",
  "certification",
]);

// Username: alphanumeric + hyphens, 3-30 chars, must start/end with alphanumeric
export const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be at most 30 characters")
  .regex(
    /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/,
    "Username must start and end with a letter or number, and can contain hyphens"
  )
  .transform((val) => val.toLowerCase());

// For usernames that are exactly 3 chars, the regex above requires start+middle+end
// but 3-char usernames only have start and end. Allow simple alphanumeric for short ones.
export const usernameFlexSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be at most 30 characters")
  .regex(
    /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i,
    "Username must be alphanumeric (hyphens allowed in the middle)"
  )
  .transform((val) => val.toLowerCase());

export const updatePortfolioProfileSchema = z.object({
  headline: z
    .string()
    .max(200, "Headline must be under 200 characters")
    .nullable()
    .optional(),
  bio: z
    .string()
    .max(500, "Bio must be under 500 characters")
    .nullable()
    .optional(),
  linkedin_url: z
    .string()
    .url("Invalid LinkedIn URL")
    .nullable()
    .optional(),
  github_url: z
    .string()
    .url("Invalid GitHub URL")
    .nullable()
    .optional(),
  website_url: z
    .string()
    .url("Invalid website URL")
    .nullable()
    .optional(),
  skills: z
    .array(z.string().max(50, "Skill tag must be under 50 characters"))
    .max(30, "Maximum 30 skills")
    .optional(),
  military_branch: militaryBranchSchema.nullable().optional(),
  military_mos: z
    .string()
    .max(100, "MOS must be under 100 characters")
    .nullable()
    .optional(),
  portfolio_public: z.boolean().optional(),
});

export const claimUsernameSchema = z.object({
  username: usernameFlexSchema,
});

export const createPortfolioItemSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be under 200 characters"),
  description: z
    .string()
    .max(2000, "Description must be under 2000 characters")
    .nullable()
    .optional(),
  item_type: portfolioItemTypeSchema.optional(),
  url: z.string().url("Invalid URL").nullable().optional(),
  image_url: z.string().url("Invalid image URL").nullable().optional(),
  skills_used: z
    .array(z.string().max(50))
    .max(20, "Maximum 20 skills per item")
    .optional(),
  visible: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
});

export const updatePortfolioItemSchema = createPortfolioItemSchema.partial();

export const reorderPortfolioItemsSchema = z.object({
  items: z.array(
    z.object({
      id: z.uuid("Invalid item ID"),
      position: z.number().int().min(0),
    })
  ),
});

// ============================================================================
// Inferred Types
// ============================================================================

export type UpdatePortfolioProfileFormData = z.infer<
  typeof updatePortfolioProfileSchema
>;
export type ClaimUsernameFormData = z.infer<typeof claimUsernameSchema>;
export type CreatePortfolioItemFormData = z.infer<
  typeof createPortfolioItemSchema
>;
export type UpdatePortfolioItemFormData = z.infer<
  typeof updatePortfolioItemSchema
>;
export type ReorderPortfolioItemsFormData = z.infer<
  typeof reorderPortfolioItemsSchema
>;

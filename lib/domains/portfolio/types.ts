// ============================================================================
// Portfolio Domain Types
// Maps to: profiles (portfolio columns) + portfolio_items table
// ============================================================================

export type PortfolioItemType =
  | "project"
  | "achievement"
  | "work_sample"
  | "certification";

export type MilitaryBranch =
  | "Army"
  | "Navy"
  | "Air Force"
  | "Marines"
  | "Coast Guard"
  | "Space Force"
  | "National Guard";

export interface PortfolioItem {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  item_type: PortfolioItemType;
  url: string | null;
  image_url: string | null;
  skills_used: string[];
  visible: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

/** Profile extended with portfolio-specific columns */
export interface PortfolioProfile {
  id: string;
  full_name: string;
  email: string;
  bio: string | null;
  avatar_url: string | null;
  username: string | null;
  headline: string | null;
  portfolio_public: boolean;
  linkedin_url: string | null;
  github_url: string | null;
  website_url: string | null;
  skills: string[];
  military_branch: string | null;
  military_mos: string | null;
  organization_id: string;
}

/** Completed course info for portfolio display */
export interface PortfolioCourse {
  course_id: string;
  course_title: string;
  course_slug: string;
  category: string | null;
  completed_at: string;
}

/** Certificate info for portfolio display */
export interface PortfolioCertificate {
  id: string;
  certificate_number: string;
  course_title: string;
  issued_at: string;
}

/** Badge info for portfolio display */
export interface PortfolioBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: string;
  earned_at: string;
}

/** Full public portfolio aggregate */
export interface PublicPortfolio {
  profile: {
    full_name: string;
    avatar_url: string | null;
    bio: string | null;
    headline: string | null;
    linkedin_url: string | null;
    github_url: string | null;
    website_url: string | null;
    skills: string[];
    military_branch: string | null;
    military_mos: string | null;
  };
  completedCourses: PortfolioCourse[];
  certificates: PortfolioCertificate[];
  portfolioItems: PortfolioItem[];
  badges: PortfolioBadge[];
  totalXp: number;
}

/** Input types for mutations */
export interface UpdatePortfolioProfileInput {
  headline?: string | null;
  bio?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  website_url?: string | null;
  skills?: string[];
  military_branch?: string | null;
  military_mos?: string | null;
  portfolio_public?: boolean;
}

export interface CreatePortfolioItemInput {
  title: string;
  description?: string | null;
  item_type?: PortfolioItemType;
  url?: string | null;
  image_url?: string | null;
  skills_used?: string[];
  visible?: boolean;
  position?: number;
}

export interface UpdatePortfolioItemInput {
  title?: string;
  description?: string | null;
  item_type?: PortfolioItemType;
  url?: string | null;
  image_url?: string | null;
  skills_used?: string[];
  visible?: boolean;
  position?: number;
}

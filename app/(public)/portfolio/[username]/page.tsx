import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  Linkedin,
  Github,
  Globe,
  Award,
  BookOpen,
  ExternalLink,
  Shield,
  Star,
  Zap,
  FolderOpen,
  Lock,
} from "lucide-react";
import { getPublicPortfolio } from "@/lib/domains/portfolio/queries";
import type { PublicPortfolio } from "@/lib/domains/portfolio/types";

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;

  try {
    const portfolio = await getPublicPortfolio(username);
    if (!portfolio) {
      return {
        title: "Portfolio Not Found - VetsInTech",
      };
    }

    const title = `${portfolio.profile.full_name} - Portfolio | VetsInTech`;
    const description =
      portfolio.profile.headline ||
      `${portfolio.profile.full_name}'s portfolio on VetsInTech`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "profile",
      },
    };
  } catch {
    return {
      title: "Portfolio - VetsInTech",
    };
  }
}

// Military branch to color mapping for badge styling
const BRANCH_COLORS: Record<string, string> = {
  Army: "bg-green-900/50 text-green-300 border-green-700",
  Navy: "bg-blue-900/50 text-blue-300 border-blue-700",
  "Air Force": "bg-sky-900/50 text-sky-300 border-sky-700",
  Marines: "bg-red-900/50 text-red-300 border-red-700",
  "Coast Guard": "bg-orange-900/50 text-orange-300 border-orange-700",
  "Space Force": "bg-indigo-900/50 text-indigo-300 border-indigo-700",
  "National Guard": "bg-yellow-900/50 text-yellow-300 border-yellow-700",
};

// Badge rarity to color mapping
const RARITY_COLORS: Record<string, string> = {
  common: "border-slate-600 text-slate-300",
  uncommon: "border-green-600 text-green-300",
  rare: "border-blue-600 text-blue-300",
  epic: "border-purple-600 text-purple-300",
  legendary: "border-yellow-600 text-yellow-300",
};

export default async function PublicPortfolioPage({ params }: Props) {
  const { username } = await params;
  let portfolio: PublicPortfolio | null = null;

  try {
    portfolio = await getPublicPortfolio(username);
  } catch {
    // Fall through to not found / private handling
  }

  if (!portfolio) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Lock className="mx-auto h-12 w-12 text-slate-500" />
          <h1 className="mt-4 text-2xl font-bold">Portfolio Not Available</h1>
          <p className="mt-2 text-slate-400">
            This portfolio is either private or does not exist.
          </p>
        </div>
      </div>
    );
  }

  const { profile, completedCourses, certificates, portfolioItems, badges, totalXp } =
    portfolio;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:px-6">
      {/* Hero Section */}
      <section className="text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-slate-700 text-3xl font-bold">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt={profile.full_name}
              className="h-24 w-24 rounded-full object-cover"
            />
          ) : (
            profile.full_name.charAt(0).toUpperCase()
          )}
        </div>

        <h1 className="mt-4 text-3xl font-bold tracking-tight">
          {profile.full_name}
        </h1>

        {profile.headline && (
          <p className="mt-2 text-lg text-slate-400">{profile.headline}</p>
        )}

        {profile.military_branch && (
          <span
            className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${
              BRANCH_COLORS[profile.military_branch] ||
              "bg-slate-800 text-slate-300 border-slate-600"
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            {profile.military_branch}
            {profile.military_mos && ` - ${profile.military_mos}`}
          </span>
        )}

        {profile.bio && (
          <p className="mx-auto mt-4 max-w-2xl text-slate-400">
            {profile.bio}
          </p>
        )}

        {/* Social Links */}
        <div className="mt-4 flex items-center justify-center gap-3">
          {profile.linkedin_url && (
            <a
              href={profile.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition-colors hover:border-blue-600 hover:text-blue-400"
            >
              <Linkedin className="h-4 w-4" />
              LinkedIn
            </a>
          )}
          {profile.github_url && (
            <a
              href={profile.github_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
            >
              <Github className="h-4 w-4" />
              GitHub
            </a>
          )}
          {profile.website_url && (
            <a
              href={profile.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition-colors hover:border-emerald-600 hover:text-emerald-400"
            >
              <Globe className="h-4 w-4" />
              Website
            </a>
          )}
        </div>

        {/* XP display */}
        {totalXp > 0 && (
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-yellow-900/30 px-3 py-1 text-sm font-medium text-yellow-400">
            <Zap className="h-3.5 w-3.5" />
            {totalXp.toLocaleString()} XP
          </div>
        )}
      </section>

      {/* Skills Section */}
      {profile.skills.length > 0 && (
        <section className="mt-12">
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <Star className="h-5 w-5 text-blue-400" />
            Skills
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {profile.skills.map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300"
              >
                {skill}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Completed Courses */}
      {completedCourses.length > 0 && (
        <section className="mt-12">
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <BookOpen className="h-5 w-5 text-blue-400" />
            Completed Courses
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {completedCourses.map((course) => (
              <div
                key={course.course_id}
                className="rounded-lg border border-slate-800 p-4"
              >
                <h3 className="font-semibold">{course.course_title}</h3>
                {course.category && (
                  <span className="mt-1 inline-block rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                    {course.category}
                  </span>
                )}
                <p className="mt-2 text-xs text-slate-500">
                  Completed{" "}
                  {new Date(course.completed_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Certificates */}
      {certificates.length > 0 && (
        <section className="mt-12">
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <Award className="h-5 w-5 text-blue-400" />
            Certificates
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {certificates.map((cert) => (
              <div
                key={cert.id}
                className="rounded-lg border border-slate-800 p-4"
              >
                <h3 className="font-semibold">{cert.course_title}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Issued{" "}
                  {new Date(cert.issued_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  #{cert.certificate_number}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Portfolio Items / Projects */}
      {portfolioItems.length > 0 && (
        <section className="mt-12">
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <FolderOpen className="h-5 w-5 text-blue-400" />
            Projects & Work
          </h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            {portfolioItems.map((item) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-lg border border-slate-800"
              >
                {item.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="h-40 w-full object-cover"
                  />
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold">{item.title}</h3>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 text-blue-400 hover:text-blue-300"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                  <span className="mt-1 inline-block rounded bg-slate-800 px-2 py-0.5 text-xs capitalize text-slate-400">
                    {item.item_type.replace("_", " ")}
                  </span>
                  {item.description && (
                    <p className="mt-2 text-sm text-slate-400">
                      {item.description}
                    </p>
                  )}
                  {item.skills_used.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {item.skills_used.map((skill) => (
                        <span
                          key={skill}
                          className="rounded bg-blue-950/50 px-2 py-0.5 text-xs text-blue-300"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Badges */}
      {badges.length > 0 && (
        <section className="mt-12">
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <Award className="h-5 w-5 text-blue-400" />
            Badges
          </h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
                  RARITY_COLORS[badge.rarity] ||
                  "border-slate-600 text-slate-300"
                }`}
                title={badge.description}
              >
                <span className="text-lg">{badge.icon}</span>
                <span className="text-sm font-medium">{badge.name}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

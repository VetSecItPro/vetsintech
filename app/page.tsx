import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/constants/routes";
import { PublicNav } from "@/components/layout/public-nav";
import { Footer } from "@/components/layout/footer";
import {
  GraduationCap,
  BookOpen,
  Users,
  Award,
  BarChart3,
  Shield,
  Monitor,
  MessageSquare,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: BookOpen,
    title: "Interactive Courses",
    description:
      "Rich text lessons, video content, and structured modules built for veteran learners.",
  },
  {
    icon: BarChart3,
    title: "Progress Tracking",
    description:
      "Monitor your learning journey with visual progress indicators and completion metrics.",
  },
  {
    icon: Shield,
    title: "Quizzes & Assessments",
    description:
      "Test your knowledge with auto-graded quizzes, multiple question types, and instant feedback.",
  },
  {
    icon: Award,
    title: "Certificates",
    description:
      "Earn verifiable certificates of completion to showcase your new skills.",
  },
  {
    icon: MessageSquare,
    title: "Community Forums",
    description:
      "Connect with fellow veterans, ask questions, and share knowledge in discussion boards.",
  },
  {
    icon: Monitor,
    title: "Unified Dashboard",
    description:
      "Track progress across internal courses and external platforms like Coursera and Pluralsight.",
  },
  {
    icon: Users,
    title: "Cohort Learning",
    description:
      "Learn alongside your cohort with structured timelines and group accountability.",
  },
  {
    icon: GraduationCap,
    title: "Admin Tools",
    description:
      "Powerful admin dashboard for course management, student tracking, and analytics.",
  },
] as const;

const STATS = [
  { value: "500+", label: "Veterans Trained" },
  { value: "50+", label: "Courses Available" },
  { value: "95%", label: "Completion Rate" },
  { value: "200+", label: "Certificates Issued" },
] as const;

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Authenticated users go to their dashboard
  if (user) {
    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (adminRole) {
      redirect(ROUTES.adminDashboard);
    }
    redirect(ROUTES.dashboard);
  }

  // Unauthenticated users see the landing page
  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white">
      <PublicNav />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-950/30 to-slate-950" />
          <div className="relative mx-auto max-w-7xl px-4 py-24 md:px-6 md:py-32">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-950/50 px-4 py-1.5 text-sm text-blue-400">
                <GraduationCap className="h-4 w-4" />
                Built for Veterans, By Veterans
              </div>
              <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
                Your Mission:{" "}
                <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  Master Technology
                </span>
              </h1>
              <p className="mt-6 text-lg text-slate-400 md:text-xl">
                A comprehensive learning platform designed to help veterans
                transition into technology careers. Interactive courses, hands-on
                assessments, and a supportive community — all in one place.
              </p>
              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Button size="lg" asChild>
                  <Link href="/register">
                    Start Learning
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/catalog">Browse Courses</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="border-y border-slate-800 bg-slate-900/50">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-12 md:grid-cols-4 md:px-6">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-white md:text-4xl">
                  {stat.value}
                </div>
                <div className="mt-1 text-sm text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-20">
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight">
                Everything You Need to Succeed
              </h2>
              <p className="mt-4 text-slate-400">
                A full-featured learning management system with the tools
                veterans need to build their tech careers.
              </p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 transition-colors hover:border-slate-700"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-950">
                    <feature.icon className="h-5 w-5 text-blue-400" />
                  </div>
                  <h3 className="mt-4 font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm text-slate-400">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="border-t border-slate-800 bg-slate-900/30 py-20">
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight">
                How It Works
              </h2>
              <p className="mt-4 text-slate-400">
                Get started in three simple steps
              </p>
            </div>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Create Your Account",
                  description:
                    "Sign up with your email and join your assigned cohort. Your admin will get you set up in minutes.",
                },
                {
                  step: "02",
                  title: "Learn at Your Pace",
                  description:
                    "Work through interactive lessons, watch video content, and take quizzes to test your understanding.",
                },
                {
                  step: "03",
                  title: "Earn Your Certificate",
                  description:
                    "Complete your courses and earn verifiable certificates to showcase to employers.",
                },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-bold">
                    {item.step}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-slate-400">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-20">
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <div className="grid gap-12 md:grid-cols-2">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">
                  Built for the Way Veterans Learn
                </h2>
                <p className="mt-4 text-slate-400">
                  We understand the discipline, structure, and mission-focused
                  mindset that veterans bring. Our platform is designed to match
                  that approach.
                </p>
                <ul className="mt-8 space-y-4">
                  {[
                    "Structured learning paths with clear objectives",
                    "Progress tracking so you always know where you stand",
                    "Cohort-based learning for team accountability",
                    "Community forums for peer support",
                    "External platform integration (Coursera, Pluralsight, Udemy)",
                    "Admin tools for instructors to manage and track students",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                      <span className="text-slate-300">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex items-center justify-center">
                <div className="w-full max-w-sm rounded-lg border border-slate-800 bg-slate-900 p-8 text-center">
                  <GraduationCap className="mx-auto h-16 w-16 text-blue-500" />
                  <h3 className="mt-4 text-xl font-bold">Ready to Start?</h3>
                  <p className="mt-2 text-sm text-slate-400">
                    Join hundreds of veterans who have already transformed their
                    careers through our platform.
                  </p>
                  <Button className="mt-6 w-full" asChild>
                    <Link href="/register">
                      Create Free Account
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-slate-800 bg-gradient-to-b from-blue-950/30 to-slate-950 py-20">
          <div className="mx-auto max-w-7xl px-4 text-center md:px-6">
            <h2 className="text-3xl font-bold tracking-tight">
              Your Next Mission Starts Here
            </h2>
            <p className="mt-4 text-lg text-slate-400">
              Join VetsInTech and start building the skills that will define your
              future in technology.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" asChild>
                <Link href="/register">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/contact">Contact Us</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

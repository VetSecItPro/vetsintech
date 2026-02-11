import {
  Shield,
  Users,
  Target,
  Heart,
  GraduationCap,
  Briefcase,
} from "lucide-react";

export const metadata = {
  title: "About — VetsInTech",
  description:
    "Learn about VetsInTech's mission to empower veterans through technology education and career development.",
};

const VALUES = [
  {
    icon: Shield,
    title: "Service",
    description:
      "We honor the spirit of service by providing accessible, high-quality education to those who have served.",
  },
  {
    icon: Users,
    title: "Community",
    description:
      "We build strong learning communities where veterans support each other through shared experience.",
  },
  {
    icon: Target,
    title: "Excellence",
    description:
      "We maintain high standards in our curriculum, ensuring our graduates are career-ready from day one.",
  },
  {
    icon: Heart,
    title: "Impact",
    description:
      "We measure success by the real-world outcomes of our veterans — jobs secured, skills gained, lives changed.",
  },
] as const;

const IMPACT_STATS = [
  { value: "500+", label: "Veterans Served" },
  { value: "92%", label: "Job Placement Rate" },
  { value: "50+", label: "Partner Companies" },
  { value: "15+", label: "States Represented" },
] as const;

export default function AboutPage() {
  return (
    <div>
      {/* Hero */}
      <section className="border-b border-slate-800 py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
              Empowering Veterans Through{" "}
              <span className="text-blue-400">Technology Education</span>
            </h1>
            <p className="mt-6 text-lg text-slate-400">
              VetsInTech is dedicated to bridging the gap between military
              service and technology careers. We provide veterans with the
              skills, community, and support they need to succeed in the modern
              tech workforce.
            </p>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="grid gap-12 md:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Our Mission</h2>
              <p className="mt-4 text-slate-400">
                To provide veterans with world-class technology education that
                leverages their unique strengths — discipline, teamwork,
                leadership, and mission focus — to build successful careers in
                tech.
              </p>
              <p className="mt-4 text-slate-400">
                We believe every veteran who wants to pursue a career in
                technology should have access to the training, mentorship, and
                community support they need to succeed.
              </p>
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Our Vision</h2>
              <p className="mt-4 text-slate-400">
                A world where every veteran has a clear, supported path from
                military service to a fulfilling technology career. We envision a
                tech industry enriched by the diverse perspectives and proven
                leadership of our nation&apos;s veterans.
              </p>
              <p className="mt-4 text-slate-400">
                Through our platform, we are building a network of
                veteran-technologists who support each other and give back to the
                community.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Impact Stats */}
      <section className="border-y border-slate-800 bg-slate-900/50 py-12">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 md:grid-cols-4 md:px-6">
          {IMPACT_STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-bold text-white md:text-4xl">
                {stat.value}
              </div>
              <div className="mt-1 text-sm text-slate-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Values */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <h2 className="text-center text-2xl font-bold tracking-tight">
            Our Core Values
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((value) => (
              <div
                key={value.title}
                className="rounded-lg border border-slate-800 p-6 text-center"
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-950">
                  <value.icon className="h-6 w-6 text-blue-400" />
                </div>
                <h3 className="mt-4 font-semibold">{value.title}</h3>
                <p className="mt-2 text-sm text-slate-400">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What We Offer */}
      <section className="border-t border-slate-800 bg-slate-900/30 py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <h2 className="text-center text-2xl font-bold tracking-tight">
            What We Offer
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <div className="rounded-lg border border-slate-800 p-6">
              <GraduationCap className="h-8 w-8 text-blue-400" />
              <h3 className="mt-4 text-lg font-semibold">
                Technology Education
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                Comprehensive courses in cybersecurity, software development,
                cloud computing, data analytics, and more — all delivered
                through our interactive platform.
              </p>
            </div>
            <div className="rounded-lg border border-slate-800 p-6">
              <Users className="h-8 w-8 text-blue-400" />
              <h3 className="mt-4 text-lg font-semibold">
                Peer Community
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                Join a community of fellow veterans who understand your journey.
                Share knowledge, ask questions, and build lasting professional
                connections.
              </p>
            </div>
            <div className="rounded-lg border border-slate-800 p-6">
              <Briefcase className="h-8 w-8 text-blue-400" />
              <h3 className="mt-4 text-lg font-semibold">Career Support</h3>
              <p className="mt-2 text-sm text-slate-400">
                Earn verifiable certificates, build your portfolio, and connect
                with our network of employer partners who value veteran talent.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

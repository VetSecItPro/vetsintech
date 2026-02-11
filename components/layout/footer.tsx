import Link from "next/link";
import { GraduationCap } from "lucide-react";

const FOOTER_LINKS = {
  Platform: [
    { href: "/courses", label: "Course Catalog" },
    { href: "/about", label: "About Us" },
    { href: "/contact", label: "Contact" },
  ],
  Resources: [
    { href: "/login", label: "Student Login" },
    { href: "/register", label: "Sign Up" },
  ],
} as const;

export function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Brand */}
          <div>
            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-bold text-white"
            >
              <GraduationCap className="h-5 w-5 text-blue-500" />
              VetsInTech
            </Link>
            <p className="mt-3 text-sm text-slate-400">
              Empowering veterans with the technical skills to succeed in the
              modern workforce. Learn, grow, and connect with a community that
              understands your journey.
            </p>
          </div>

          {/* Links */}
          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <h3 className="text-sm font-semibold text-white">{title}</h3>
              <ul className="mt-3 space-y-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-400 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-slate-800 pt-6">
          <p className="text-center text-xs text-slate-500">
            &copy; {new Date().getFullYear()} VetsInTech. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

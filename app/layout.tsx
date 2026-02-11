import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "VetsInTech — Empowering Veterans Through Technology Education",
    template: "%s | VetsInTech",
  },
  description:
    "VetsInTech is a learning platform that helps veterans transition into technology careers. Interactive courses, quizzes, certificates, and community support.",
  keywords: [
    "veterans",
    "technology education",
    "edtech",
    "learning platform",
    "cybersecurity",
    "software development",
    "veteran careers",
  ],
  openGraph: {
    type: "website",
    title: "VetsInTech — Empowering Veterans Through Technology Education",
    description:
      "A comprehensive learning platform designed to help veterans build successful technology careers.",
    siteName: "VetsInTech",
  },
  twitter: {
    card: "summary_large_image",
    title: "VetsInTech — Empowering Veterans Through Technology Education",
    description:
      "A comprehensive learning platform designed to help veterans build successful technology careers.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <TooltipProvider delayDuration={300}>
          {children}
        </TooltipProvider>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}

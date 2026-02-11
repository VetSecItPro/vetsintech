"use client";

import { useState, useTransition } from "react";
import { Send, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim() || !message.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            organization: organization.trim() || null,
            message: message.trim(),
          }),
        });

        if (res.ok) {
          setSubmitted(true);
        } else {
          const data = await res.json();
          setError(data.error || "Something went wrong. Please try again.");
        }
      } catch {
        setError("Network error. Please try again.");
      }
    });
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center md:px-6">
        <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
        <h1 className="mt-6 text-2xl font-bold">Message Sent!</h1>
        <p className="mt-3 text-slate-400">
          Thank you for reaching out. We&apos;ll get back to you within 1-2
          business days.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
      <div className="grid gap-12 md:grid-cols-2">
        {/* Info */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Get in Touch</h1>
          <p className="mt-4 text-slate-400">
            Have questions about our programs? Want to partner with us? Looking
            to enroll your organization&apos;s veterans? We&apos;d love to hear
            from you.
          </p>

          <div className="mt-10 space-y-6">
            <div>
              <h3 className="font-semibold">For Veterans</h3>
              <p className="mt-1 text-sm text-slate-400">
                Interested in enrolling? Fill out the form and we&apos;ll help
                you find the right program for your goals.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">For Organizations</h3>
              <p className="mt-1 text-sm text-slate-400">
                Want to bring VetsInTech to your organization? Contact us about
                enterprise plans and custom cohort programs.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">For Partners</h3>
              <p className="mt-1 text-sm text-slate-400">
                Interested in partnering or sponsoring? We&apos;re always
                looking for companies committed to veteran success.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Full Name <span className="text-red-400">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="bg-slate-900 border-slate-700"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-red-400">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="bg-slate-900 border-slate-700"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="organization">Organization (Optional)</Label>
              <Input
                id="organization"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="Your company or unit"
                className="bg-slate-900 border-slate-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">
                Message <span className="text-red-400">*</span>
              </Label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="How can we help you?"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                rows={5}
                required
              />
            </div>

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send Message
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

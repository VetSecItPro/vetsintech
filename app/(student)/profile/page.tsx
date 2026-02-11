"use client";

import { useState, useEffect, useTransition } from "react";
import { User, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface ProfileData {
  id: string;
  full_name: string;
  email: string;
  bio: string | null;
  avatar_url: string | null;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/profiles");
        if (res.ok) {
          const { data } = await res.json();
          setProfile(data);
          setFullName(data.full_name || "");
          setBio(data.bio || "");
        }
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  function handleSave() {
    startTransition(async () => {
      try {
        const res = await fetch("/api/profiles", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            full_name: fullName.trim(),
            bio: bio.trim() || null,
          }),
        });

        if (res.ok) {
          const { data } = await res.json();
          setProfile(data);
          toast.success("Profile updated successfully");
        } else {
          const err = await res.json();
          toast.error(err.error || "Failed to update profile");
        }
      } catch {
        toast.error("Something went wrong");
      }
    });
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded-lg bg-slate-800"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-sm text-slate-500">
          Manage your account information
        </p>
      </div>

      {/* Avatar placeholder */}
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-700 text-xl font-medium">
          {fullName ? fullName.charAt(0).toUpperCase() : <User className="h-6 w-6" />}
        </div>
        <div>
          <p className="font-medium">{fullName || "Your name"}</p>
          <p className="text-sm text-slate-500">{profile?.email}</p>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-4 rounded-lg border border-slate-800 p-6">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            value={profile?.email || ""}
            disabled
            className="bg-slate-900 border-slate-700 opacity-60"
          />
          <p className="text-xs text-slate-600">
            Email cannot be changed here
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name"
            className="bg-slate-900 border-slate-700"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell us about yourself..."
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={4}
            maxLength={500}
          />
          <p className="text-xs text-slate-600">{bio.length}/500 characters</p>
        </div>

        <Button onClick={handleSave} disabled={isPending || !fullName.trim()}>
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Changes
        </Button>
      </div>
    </div>
  );
}

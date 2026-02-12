"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import {
  Save,
  Loader2,
  Plus,
  Trash2,
  ExternalLink,
  Eye,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  XCircle,
  Globe,
  Link as LinkIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { PortfolioItem } from "@/lib/domains/portfolio/types";

const MILITARY_BRANCHES = [
  "Army",
  "Navy",
  "Air Force",
  "Marines",
  "Coast Guard",
  "Space Force",
  "National Guard",
] as const;

const ITEM_TYPES = [
  { value: "project", label: "Project" },
  { value: "achievement", label: "Achievement" },
  { value: "work_sample", label: "Work Sample" },
  { value: "certification", label: "Certification" },
] as const;

export default function PortfolioEditorPage() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Profile form state
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [militaryBranch, setMilitaryBranch] = useState("");
  const [militaryMos, setMilitaryMos] = useState("");
  const [portfolioPublic, setPortfolioPublic] = useState(false);

  // Username state
  const [username, setUsername] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  // New item form state
  const [showNewItemForm, setShowNewItemForm] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemDescription, setNewItemDescription] = useState("");
  const [newItemType, setNewItemType] = useState("project");
  const [newItemUrl, setNewItemUrl] = useState("");
  const [newItemImageUrl, setNewItemImageUrl] = useState("");
  const [newItemSkills, setNewItemSkills] = useState("");

  const fetchProfile = useCallback(async () => {
    try {
      const [profileRes, itemsRes] = await Promise.all([
        fetch("/api/portfolio/profile"),
        fetch("/api/portfolio/items"),
      ]);

      if (profileRes.ok) {
        const { data } = await profileRes.json();
        setHeadline(data.headline || "");
        setBio(data.bio || "");
        setLinkedinUrl(data.linkedin_url || "");
        setGithubUrl(data.github_url || "");
        setWebsiteUrl(data.website_url || "");
        setSkills(data.skills || []);
        setMilitaryBranch(data.military_branch || "");
        setMilitaryMos(data.military_mos || "");
        setPortfolioPublic(data.portfolio_public || false);
        setUsername(data.username || "");
        setUsernameInput(data.username || "");
      }

      if (itemsRes.ok) {
        const { data } = await itemsRes.json();
        setItems(data || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Username availability check
  async function checkUsername() {
    if (!usernameInput || usernameInput.length < 3) return;
    setCheckingUsername(true);
    try {
      const res = await fetch(
        `/api/portfolio/username?username=${encodeURIComponent(usernameInput)}`
      );
      if (res.ok) {
        const { available } = await res.json();
        setUsernameAvailable(available);
      }
    } finally {
      setCheckingUsername(false);
    }
  }

  function handleClaimUsername() {
    startTransition(async () => {
      try {
        const res = await fetch("/api/portfolio/username", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: usernameInput }),
        });

        if (res.ok) {
          const { data } = await res.json();
          setUsername(data.username);
          toast.success("Username claimed successfully");
        } else {
          const err = await res.json();
          toast.error(err.error || "Failed to claim username");
        }
      } catch {
        toast.error("Something went wrong");
      }
    });
  }

  function handleSaveProfile() {
    startTransition(async () => {
      try {
        const res = await fetch("/api/portfolio/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            headline: headline.trim() || null,
            bio: bio.trim() || null,
            linkedin_url: linkedinUrl.trim() || null,
            github_url: githubUrl.trim() || null,
            website_url: websiteUrl.trim() || null,
            skills,
            military_branch: militaryBranch || null,
            military_mos: militaryMos.trim() || null,
            portfolio_public: portfolioPublic,
          }),
        });

        if (res.ok) {
          toast.success("Portfolio profile updated");
        } else {
          const err = await res.json();
          toast.error(err.error || "Failed to update profile");
        }
      } catch {
        toast.error("Something went wrong");
      }
    });
  }

  function handleAddSkill() {
    const skill = newSkill.trim();
    if (!skill || skills.includes(skill)) return;
    setSkills([...skills, skill]);
    setNewSkill("");
  }

  function handleRemoveSkill(skill: string) {
    setSkills(skills.filter((s) => s !== skill));
  }

  function handleCreateItem() {
    startTransition(async () => {
      try {
        const res = await fetch("/api/portfolio/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: newItemTitle.trim(),
            description: newItemDescription.trim() || null,
            item_type: newItemType,
            url: newItemUrl.trim() || null,
            image_url: newItemImageUrl.trim() || null,
            skills_used: newItemSkills
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            position: items.length,
          }),
        });

        if (res.ok) {
          const { data } = await res.json();
          setItems([...items, data]);
          setShowNewItemForm(false);
          setNewItemTitle("");
          setNewItemDescription("");
          setNewItemType("project");
          setNewItemUrl("");
          setNewItemImageUrl("");
          setNewItemSkills("");
          toast.success("Portfolio item added");
        } else {
          const err = await res.json();
          toast.error(err.error || "Failed to create item");
        }
      } catch {
        toast.error("Something went wrong");
      }
    });
  }

  function handleDeleteItem(itemId: string) {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/portfolio/items/${itemId}`, {
          method: "DELETE",
        });

        if (res.ok) {
          setItems(items.filter((i) => i.id !== itemId));
          toast.success("Item deleted");
        } else {
          toast.error("Failed to delete item");
        }
      } catch {
        toast.error("Something went wrong");
      }
    });
  }

  function handleMoveItem(index: number, direction: "up" | "down") {
    const newItems = [...items];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newItems.length) return;

    [newItems[index], newItems[swapIndex]] = [newItems[swapIndex], newItems[index]];

    // Update positions
    const reordered = newItems.map((item, i) => ({ ...item, position: i }));
    setItems(reordered);

    // Save reorder
    startTransition(async () => {
      try {
        await fetch("/api/portfolio/items/reorder", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: reordered.map((item) => ({
              id: item.id,
              position: item.position,
            })),
          }),
        });
      } catch {
        toast.error("Failed to reorder items");
      }
    });
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Portfolio Editor</h1>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
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
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Portfolio Editor</h1>
        <p className="text-sm text-slate-500">
          Build your professional portfolio to share with employers
        </p>
      </div>

      {/* Public / Private Toggle */}
      <div className="flex items-center justify-between rounded-lg border border-slate-800 p-4">
        <div>
          <p className="font-medium">Portfolio Visibility</p>
          <p className="text-sm text-slate-500">
            {portfolioPublic
              ? "Your portfolio is publicly visible"
              : "Your portfolio is private"}
          </p>
        </div>
        <button
          onClick={() => setPortfolioPublic(!portfolioPublic)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            portfolioPublic ? "bg-blue-600" : "bg-slate-700"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              portfolioPublic ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Username Section */}
      <div className="rounded-lg border border-slate-800 p-6 space-y-4">
        <h2 className="text-lg font-semibold">Portfolio URL</h2>
        {username ? (
          <div className="space-y-2">
            <p className="text-sm text-slate-400">Your portfolio URL:</p>
            <div className="flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2">
              <LinkIcon className="h-4 w-4 text-slate-500" />
              <code className="text-sm text-blue-400">
                vetsintech.vercel.app/portfolio/{username}
              </code>
              {portfolioPublic && (
                <a
                  href={`/portfolio/${username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-slate-400 hover:text-white"
                >
                  <Eye className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-400">
              Claim a username for your public portfolio URL
            </p>
            <div className="flex gap-2">
              <Input
                value={usernameInput}
                onChange={(e) => {
                  setUsernameInput(e.target.value);
                  setUsernameAvailable(null);
                }}
                placeholder="your-username"
                className="bg-slate-900 border-slate-700"
              />
              <Button
                variant="outline"
                onClick={checkUsername}
                disabled={checkingUsername || usernameInput.length < 3}
              >
                {checkingUsername ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Check"
                )}
              </Button>
            </div>
            {usernameAvailable !== null && (
              <div className="flex items-center gap-1.5 text-sm">
                {usernameAvailable ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span className="text-green-400">Username is available</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-400" />
                    <span className="text-red-400">Username is taken</span>
                  </>
                )}
              </div>
            )}
            {usernameAvailable && (
              <Button onClick={handleClaimUsername} disabled={isPending}>
                Claim Username
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Profile Fields */}
      <div className="rounded-lg border border-slate-800 p-6 space-y-4">
        <h2 className="text-lg font-semibold">Profile Information</h2>

        <div className="space-y-2">
          <Label htmlFor="headline">Headline</Label>
          <Input
            id="headline"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="Cybersecurity Analyst | U.S. Army Veteran"
            className="bg-slate-900 border-slate-700"
            maxLength={200}
          />
          <p className="text-xs text-slate-600">
            A short professional headline for your portfolio
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell employers about yourself..."
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={4}
            maxLength={500}
          />
          <p className="text-xs text-slate-600">{bio.length}/500 characters</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="branch">Military Branch</Label>
            <select
              id="branch"
              value={militaryBranch}
              onChange={(e) => setMilitaryBranch(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select branch...</option>
              {MILITARY_BRANCHES.map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mos">MOS / Rate / AFSC</Label>
            <Input
              id="mos"
              value={militaryMos}
              onChange={(e) => setMilitaryMos(e.target.value)}
              placeholder="e.g., 25B, IT2, 3D0X2"
              className="bg-slate-900 border-slate-700"
              maxLength={100}
            />
          </div>
        </div>
      </div>

      {/* Social Links */}
      <div className="rounded-lg border border-slate-800 p-6 space-y-4">
        <h2 className="text-lg font-semibold">Social Links</h2>

        <div className="space-y-2">
          <Label htmlFor="linkedin">LinkedIn URL</Label>
          <Input
            id="linkedin"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            placeholder="https://linkedin.com/in/your-profile"
            className="bg-slate-900 border-slate-700"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="github">GitHub URL</Label>
          <Input
            id="github"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            placeholder="https://github.com/your-username"
            className="bg-slate-900 border-slate-700"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="website">Website URL</Label>
          <Input
            id="website"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://your-website.com"
            className="bg-slate-900 border-slate-700"
          />
        </div>
      </div>

      {/* Skills */}
      <div className="rounded-lg border border-slate-800 p-6 space-y-4">
        <h2 className="text-lg font-semibold">Skills</h2>

        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <span
              key={skill}
              className="flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1 text-sm"
            >
              {skill}
              <button
                onClick={() => handleRemoveSkill(skill)}
                className="text-slate-500 hover:text-red-400"
              >
                &times;
              </button>
            </span>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            placeholder="Add a skill..."
            className="bg-slate-900 border-slate-700"
            maxLength={50}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddSkill();
              }
            }}
          />
          <Button
            variant="outline"
            onClick={handleAddSkill}
            disabled={!newSkill.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Save Profile Button */}
      <Button
        onClick={handleSaveProfile}
        disabled={isPending}
        className="w-full"
      >
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        Save Portfolio Profile
      </Button>

      {/* Portfolio Items */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Portfolio Items</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNewItemForm(true)}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add Item
          </Button>
        </div>

        {/* New Item Form */}
        {showNewItemForm && (
          <div className="rounded-lg border border-blue-800 bg-blue-950/20 p-6 space-y-4">
            <h3 className="font-medium">New Portfolio Item</h3>

            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
                placeholder="My Awesome Project"
                className="bg-slate-900 border-slate-700"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <textarea
                value={newItemDescription}
                onChange={(e) => setNewItemDescription(e.target.value)}
                placeholder="Describe your project..."
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                rows={3}
                maxLength={2000}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Type</Label>
                <select
                  value={newItemType}
                  onChange={(e) => setNewItemType(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {ITEM_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Project URL</Label>
                <Input
                  value={newItemUrl}
                  onChange={(e) => setNewItemUrl(e.target.value)}
                  placeholder="https://github.com/..."
                  className="bg-slate-900 border-slate-700"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input
                value={newItemImageUrl}
                onChange={(e) => setNewItemImageUrl(e.target.value)}
                placeholder="https://example.com/screenshot.png"
                className="bg-slate-900 border-slate-700"
              />
            </div>

            <div className="space-y-2">
              <Label>Skills Used (comma-separated)</Label>
              <Input
                value={newItemSkills}
                onChange={(e) => setNewItemSkills(e.target.value)}
                placeholder="Python, AWS, Docker"
                className="bg-slate-900 border-slate-700"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleCreateItem}
                disabled={isPending || !newItemTitle.trim()}
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Add Item
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowNewItemForm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Existing Items */}
        {items.length === 0 && !showNewItemForm && (
          <div className="rounded-lg border border-dashed border-slate-700 p-8 text-center">
            <Globe className="mx-auto h-8 w-8 text-slate-600" />
            <p className="mt-2 text-sm text-slate-500">
              No portfolio items yet. Add your projects, achievements, and work
              samples.
            </p>
          </div>
        )}

        {items.map((item, index) => (
          <div
            key={item.id}
            className="rounded-lg border border-slate-800 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium truncate">{item.title}</h3>
                  <span className="flex-shrink-0 rounded bg-slate-800 px-2 py-0.5 text-xs capitalize text-slate-400">
                    {item.item_type.replace("_", " ")}
                  </span>
                  {!item.visible && (
                    <span className="flex-shrink-0 rounded bg-yellow-900/50 px-2 py-0.5 text-xs text-yellow-400">
                      Hidden
                    </span>
                  )}
                </div>
                {item.description && (
                  <p className="mt-1 text-sm text-slate-400 line-clamp-2">
                    {item.description}
                  </p>
                )}
                {item.skills_used.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
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

              <div className="flex items-center gap-1 flex-shrink-0">
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded p-1 text-slate-500 hover:text-blue-400"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                <button
                  onClick={() => handleMoveItem(index, "up")}
                  disabled={index === 0 || isPending}
                  className="rounded p-1 text-slate-500 hover:text-white disabled:opacity-30"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleMoveItem(index, "down")}
                  disabled={index === items.length - 1 || isPending}
                  className="rounded p-1 text-slate-500 hover:text-white disabled:opacity-30"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  disabled={isPending}
                  className="rounded p-1 text-slate-500 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Preview Link */}
      {username && portfolioPublic && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 text-center">
          <a
            href={`/portfolio/${username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300"
          >
            <Eye className="h-4 w-4" />
            Preview Your Public Portfolio
          </a>
        </div>
      )}
    </div>
  );
}

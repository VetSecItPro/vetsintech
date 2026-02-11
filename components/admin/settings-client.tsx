"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings, Users, Shield } from "lucide-react";
import { toast } from "sonner";

interface Member {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

interface SettingsClientProps {
  orgId: string;
  orgName: string;
  orgLogoUrl: string;
  members: Member[];
}

const ROLE_BADGE_STYLES: Record<string, string> = {
  admin: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  instructor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  student: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

export function SettingsClient({
  orgId,
  orgName,
  orgLogoUrl,
  members,
}: SettingsClientProps) {
  const router = useRouter();
  const [name, setName] = useState(orgName);
  const [logoUrl, setLogoUrl] = useState(orgLogoUrl);
  const [savePending, startSaveTransition] = useTransition();

  async function handleSaveOrg() {
    startSaveTransition(async () => {
      try {
        const res = await fetch("/api/organizations", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, logo_url: logoUrl }),
        });

        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.error || "Failed to update organization");
        }

        toast.success("Organization settings saved");
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to save settings"
        );
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Organization Info */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Settings className="h-5 w-5 text-slate-400" />
            Organization Info
          </CardTitle>
          <CardDescription className="text-slate-400">
            Update your organization name and branding
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="org-name"
              className="text-sm font-medium text-slate-300"
            >
              Organization Name
            </label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Organization name"
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="org-logo"
              className="text-sm font-medium text-slate-300"
            >
              Logo URL
            </label>
            <Input
              id="org-logo"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>

          <Button
            onClick={handleSaveOrg}
            disabled={savePending}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {savePending ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-slate-400" />
            Team Members
          </CardTitle>
          <CardDescription className="text-slate-400">
            {members.length} members in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-slate-400">Name</TableHead>
                <TableHead className="text-slate-400">Email</TableHead>
                <TableHead className="text-slate-400">Role</TableHead>
                <TableHead className="text-slate-400 text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.length > 0 ? (
                members.map((member) => (
                  <MemberRow key={member.id} member={member} orgId={orgId} />
                ))
              ) : (
                <TableRow className="border-slate-800">
                  <TableCell
                    colSpan={4}
                    className="text-center text-slate-500 py-8"
                  >
                    No team members found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function MemberRow({
  member,
  orgId,
}: {
  member: Member;
  orgId: string;
}) {
  const router = useRouter();
  const [rolePending, startRoleTransition] = useTransition();

  async function handleRoleChange(newRole: string) {
    startRoleTransition(async () => {
      try {
        const res = await fetch(`/api/students/${member.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole }),
        });

        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.error || "Failed to update role");
        }

        toast.success(`${member.fullName}'s role updated to ${newRole}`);
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to update role"
        );
      }
    });
  }

  return (
    <TableRow className="border-slate-800 hover:bg-slate-800/50">
      <TableCell className="text-white font-medium">
        {member.fullName}
      </TableCell>
      <TableCell className="text-slate-400">{member.email}</TableCell>
      <TableCell>
        <Badge
          variant="secondary"
          className={
            ROLE_BADGE_STYLES[member.role] ??
            "bg-slate-500/10 text-slate-400 border-slate-500/20"
          }
        >
          <Shield className="h-3 w-3 mr-1" />
          {member.role}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <Select
          defaultValue={member.role}
          onValueChange={handleRoleChange}
          disabled={rolePending}
        >
          <SelectTrigger className="w-[140px] bg-slate-800 border-slate-700 text-slate-300 h-8 text-sm ml-auto">
            <SelectValue placeholder="Change role" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem
              value="student"
              className="text-slate-300 focus:bg-slate-700 focus:text-white"
            >
              Student
            </SelectItem>
            <SelectItem
              value="instructor"
              className="text-slate-300 focus:bg-slate-700 focus:text-white"
            >
              Instructor
            </SelectItem>
            <SelectItem
              value="admin"
              className="text-slate-300 focus:bg-slate-700 focus:text-white"
            >
              Admin
            </SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
    </TableRow>
  );
}

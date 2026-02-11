"use client";

import { useEffect, useState, useCallback } from "react";
import { BookOpen, Code, GraduationCap, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type ExternalPlatform = "coursera" | "pluralsight" | "udemy";

interface PlatformConfig {
  id: string;
  organization_id: string;
  platform: ExternalPlatform;
  is_enabled: boolean;
  credentials: Record<string, string>;
  sync_frequency_minutes: number;
  last_synced_at: string | null;
  sync_status: "idle" | "syncing" | "error";
  sync_error: string | null;
}

interface ExternalStudentProgress {
  userId: string;
  fullName: string;
  email: string;
  platform: ExternalPlatform;
  courseTitle: string;
  progressPercentage: number;
  status: string;
  lastActivityAt: string | null;
}

interface PlatformMeta {
  platform: ExternalPlatform;
  label: string;
  icon: React.ReactNode;
  credentialFields: { key: string; label: string; placeholder: string }[];
}

const PLATFORMS: PlatformMeta[] = [
  {
    platform: "coursera",
    label: "Coursera for Business",
    icon: <GraduationCap className="h-6 w-6" />,
    credentialFields: [
      {
        key: "client_id",
        label: "Client ID",
        placeholder: "Enter Coursera client ID",
      },
      {
        key: "client_secret",
        label: "Client Secret",
        placeholder: "Enter Coursera client secret",
      },
      {
        key: "org_slug",
        label: "Organization Slug",
        placeholder: "Enter organization slug",
      },
    ],
  },
  {
    platform: "pluralsight",
    label: "Pluralsight Skills",
    icon: <Code className="h-6 w-6" />,
    credentialFields: [
      {
        key: "api_token",
        label: "API Token",
        placeholder: "Enter Pluralsight API token",
      },
      {
        key: "plan_id",
        label: "Plan ID",
        placeholder: "Enter Pluralsight plan ID",
      },
    ],
  },
  {
    platform: "udemy",
    label: "Udemy Business",
    icon: <BookOpen className="h-6 w-6" />,
    credentialFields: [
      {
        key: "api_key",
        label: "API Key",
        placeholder: "Enter Udemy Business API key",
      },
      {
        key: "account_id",
        label: "Account ID",
        placeholder: "Enter Udemy account ID",
      },
    ],
  },
];

const SYNC_FREQUENCIES = [
  { value: "15", label: "Every 15 minutes" },
  { value: "30", label: "Every 30 minutes" },
  { value: "60", label: "Every hour" },
  { value: "360", label: "Every 6 hours" },
  { value: "720", label: "Every 12 hours" },
  { value: "1440", label: "Every 24 hours" },
];

function getSyncStatusBadge(status: PlatformConfig["sync_status"]) {
  switch (status) {
    case "idle":
      return <Badge variant="secondary">Idle</Badge>;
    case "syncing":
      return (
        <Badge className="bg-blue-600 text-white hover:bg-blue-700">
          Syncing
        </Badge>
      );
    case "error":
      return <Badge variant="destructive">Error</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Never";
  return new Date(dateStr).toLocaleString();
}

export default function IntegrationsPage() {
  const [configs, setConfigs] = useState<
    Partial<Record<ExternalPlatform, PlatformConfig>>
  >({});
  const [localCredentials, setLocalCredentials] = useState<
    Record<ExternalPlatform, Record<string, string>>
  >({
    coursera: {},
    pluralsight: {},
    udemy: {},
  });
  const [localEnabled, setLocalEnabled] = useState<
    Record<ExternalPlatform, boolean>
  >({
    coursera: false,
    pluralsight: false,
    udemy: false,
  });
  const [localFrequency, setLocalFrequency] = useState<
    Record<ExternalPlatform, string>
  >({
    coursera: "60",
    pluralsight: "60",
    udemy: "60",
  });
  const [progress, setProgress] = useState<ExternalStudentProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<ExternalPlatform | null>(null);
  const [syncing, setSyncing] = useState<ExternalPlatform | null>(null);

  const fetchConfigs = useCallback(async () => {
    try {
      const res = await fetch("/api/integrations");
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error ?? "Failed to fetch integrations");
        return;
      }

      const configMap: Partial<Record<ExternalPlatform, PlatformConfig>> = {};
      const creds: Record<ExternalPlatform, Record<string, string>> = {
        coursera: {},
        pluralsight: {},
        udemy: {},
      };
      const enabled: Record<ExternalPlatform, boolean> = {
        coursera: false,
        pluralsight: false,
        udemy: false,
      };
      const freq: Record<ExternalPlatform, string> = {
        coursera: "60",
        pluralsight: "60",
        udemy: "60",
      };

      for (const config of json.data.configs as PlatformConfig[]) {
        configMap[config.platform] = config;
        creds[config.platform] = config.credentials ?? {};
        enabled[config.platform] = config.is_enabled;
        freq[config.platform] = String(config.sync_frequency_minutes);
      }

      setConfigs(configMap);
      setLocalCredentials(creds);
      setLocalEnabled(enabled);
      setLocalFrequency(freq);
      setProgress(json.data.progress ?? []);
    } catch {
      toast.error("Failed to fetch integration configs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  async function handleSave(platform: ExternalPlatform) {
    setSaving(platform);
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          credentials: localCredentials[platform],
          is_enabled: localEnabled[platform],
          sync_frequency_minutes: Number(localFrequency[platform]),
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error ?? "Failed to save configuration");
        return;
      }

      toast.success(`${platform} configuration saved`);
      await fetchConfigs();
    } catch {
      toast.error("Failed to save configuration");
    } finally {
      setSaving(null);
    }
  }

  async function handleSync(platform: ExternalPlatform) {
    setSyncing(platform);
    try {
      const res = await fetch("/api/integrations/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error ?? "Sync failed");
        return;
      }

      toast.success(
        `Synced ${json.data.enrollments} enrollments and ${json.data.progress} progress records`
      );
      await fetchConfigs();
    } catch {
      toast.error("Sync failed");
    } finally {
      setSyncing(null);
    }
  }

  function updateCredential(
    platform: ExternalPlatform,
    key: string,
    value: string
  ) {
    setLocalCredentials((prev) => ({
      ...prev,
      [platform]: { ...prev[platform], [key]: value },
    }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Platform Integrations
        </h1>
        <p className="text-slate-400 mt-1">
          Connect external learning platforms to track student progress across
          Coursera, Pluralsight, and Udemy.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {PLATFORMS.map((meta) => {
          const config = configs[meta.platform];
          const isCurrentSaving = saving === meta.platform;
          const isCurrentSyncing = syncing === meta.platform;

          return (
            <Card
              key={meta.platform}
              className="bg-slate-900 border-slate-800"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="flex items-center gap-3">
                  <div className="text-slate-300">{meta.icon}</div>
                  <CardTitle className="text-white text-lg">
                    {meta.label}
                  </CardTitle>
                </div>
                <Switch
                  checked={localEnabled[meta.platform]}
                  onCheckedChange={(checked) =>
                    setLocalEnabled((prev) => ({
                      ...prev,
                      [meta.platform]: checked,
                    }))
                  }
                />
              </CardHeader>
              <CardContent className="space-y-4">
                {meta.credentialFields.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <Label className="text-slate-300 text-sm">
                      {field.label}
                    </Label>
                    <Input
                      type="password"
                      placeholder={field.placeholder}
                      value={localCredentials[meta.platform]?.[field.key] ?? ""}
                      onChange={(e) =>
                        updateCredential(
                          meta.platform,
                          field.key,
                          e.target.value
                        )
                      }
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                    />
                  </div>
                ))}

                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-sm">
                    Sync Frequency
                  </Label>
                  <Select
                    value={localFrequency[meta.platform]}
                    onValueChange={(value) =>
                      setLocalFrequency((prev) => ({
                        ...prev,
                        [meta.platform]: value,
                      }))
                    }
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {SYNC_FREQUENCIES.map((freq) => (
                        <SelectItem
                          key={freq.value}
                          value={freq.value}
                          className="text-white"
                        >
                          {freq.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {config && (
                  <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-800">
                    <div className="text-slate-400">
                      Last synced: {formatDate(config.last_synced_at)}
                    </div>
                    {getSyncStatusBadge(config.sync_status)}
                  </div>
                )}

                {config?.sync_error && (
                  <p className="text-sm text-red-400">{config.sync_error}</p>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => handleSave(meta.platform)}
                    disabled={isCurrentSaving}
                    className="flex-1"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isCurrentSaving ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleSync(meta.platform)}
                    disabled={
                      isCurrentSyncing ||
                      !config?.is_enabled ||
                      config?.sync_status === "syncing"
                    }
                    className="border-slate-700 text-slate-300 hover:text-white"
                  >
                    <RefreshCw
                      className={`h-4 w-4 mr-2 ${isCurrentSyncing ? "animate-spin" : ""}`}
                    />
                    {isCurrentSyncing ? "Syncing..." : "Sync Now"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div>
        <h2 className="text-xl font-semibold text-white mb-4">
          External Student Progress
        </h2>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-slate-800/50">
                  <TableHead className="text-slate-300">Student</TableHead>
                  <TableHead className="text-slate-300">Email</TableHead>
                  <TableHead className="text-slate-300">Platform</TableHead>
                  <TableHead className="text-slate-300">Course</TableHead>
                  <TableHead className="text-slate-300">Progress</TableHead>
                  <TableHead className="text-slate-300">Status</TableHead>
                  <TableHead className="text-slate-300">
                    Last Activity
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {progress.length === 0 ? (
                  <TableRow className="border-slate-800">
                    <TableCell
                      colSpan={7}
                      className="text-center text-slate-500 py-8"
                    >
                      No external progress data yet. Connect a platform and sync
                      to see student progress.
                    </TableCell>
                  </TableRow>
                ) : (
                  progress.map((row, i) => (
                    <TableRow
                      key={`${row.userId}-${row.platform}-${row.courseTitle}-${i}`}
                      className="border-slate-800 hover:bg-slate-800/50"
                    >
                      <TableCell className="text-white">
                        {row.fullName}
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {row.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-slate-300 border-slate-700 capitalize">
                          {row.platform}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {row.courseTitle}
                      </TableCell>
                      <TableCell className="text-white">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{
                                width: `${row.progressPercentage}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm">
                            {row.progressPercentage}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            row.status === "completed"
                              ? "default"
                              : "secondary"
                          }
                          className={
                            row.status === "completed"
                              ? "bg-green-600 hover:bg-green-700"
                              : ""
                          }
                        >
                          {row.status === "completed"
                            ? "Completed"
                            : "In Progress"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {formatDate(row.lastActivityAt)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

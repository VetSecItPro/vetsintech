"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BookOpen,
  Code,
  GraduationCap,
  RefreshCw,
  Save,
  Wifi,
  WifiOff,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { UnifiedProgressDashboard } from "@/components/integrations/unified-progress-dashboard";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

interface ConnectionTestResult {
  success: boolean;
  message: string;
  responseTime: number;
}

interface PlatformMeta {
  platform: ExternalPlatform;
  label: string;
  icon: React.ReactNode;
  credentialFields: { key: string; label: string; placeholder: string }[];
}

// ---------------------------------------------------------------------------
// Platform metadata
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

function SyncStatusIndicator({
  config,
}: {
  config: PlatformConfig | undefined;
}) {
  if (!config) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Clock className="h-4 w-4" />
        <span>Not configured</span>
      </div>
    );
  }

  switch (config.sync_status) {
    case "idle":
      if (config.last_synced_at) {
        return (
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            <span className="text-slate-400">
              Last synced: {formatDate(config.last_synced_at)}
            </span>
          </div>
        );
      }
      return (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Clock className="h-4 w-4" />
          <span>Never synced</span>
        </div>
      );
    case "syncing":
      return (
        <div className="flex items-center gap-2 text-sm">
          <RefreshCw className="h-4 w-4 text-blue-400 animate-spin" />
          <span className="text-blue-400">Syncing...</span>
        </div>
      );
    case "error":
      return (
        <div className="flex items-center gap-2 text-sm">
          <XCircle className="h-4 w-4 text-red-400" />
          <span className="text-red-400">Sync error</span>
        </div>
      );
    default:
      return (
        <Badge variant="outline" className="text-slate-400">
          Unknown
        </Badge>
      );
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Never";
  return new Date(dateStr).toLocaleString();
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<ExternalPlatform | null>(null);
  const [syncing, setSyncing] = useState<ExternalPlatform | null>(null);
  const [testing, setTesting] = useState<ExternalPlatform | null>(null);
  const [testResults, setTestResults] = useState<
    Partial<Record<ExternalPlatform, ConnectionTestResult>>
  >({});

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

      const msg = `Synced ${json.data.enrollments} enrollments and ${json.data.progress} progress records`;
      if (json.data.errors > 0) {
        toast.warning(`${msg} (${json.data.errors} errors)`);
      } else {
        toast.success(msg);
      }
      await fetchConfigs();
    } catch {
      toast.error("Sync failed");
    } finally {
      setSyncing(null);
    }
  }

  async function handleTestConnection(platform: ExternalPlatform) {
    setTesting(platform);
    // Clear previous test result
    setTestResults((prev) => {
      const next = { ...prev };
      delete next[platform];
      return next;
    });

    try {
      const res = await fetch(`/api/integrations/${platform}/test`, {
        method: "POST",
      });

      const json = await res.json();

      if (!res.ok) {
        setTestResults((prev) => ({
          ...prev,
          [platform]: {
            success: false,
            message: json.error ?? "Test failed",
            responseTime: 0,
          },
        }));
        toast.error(json.error ?? "Connection test failed");
        return;
      }

      const result = json.data as ConnectionTestResult;
      setTestResults((prev) => ({ ...prev, [platform]: result }));

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch {
      setTestResults((prev) => ({
        ...prev,
        [platform]: {
          success: false,
          message: "Network error during connection test",
          responseTime: 0,
        },
      }));
      toast.error("Connection test failed");
    } finally {
      setTesting(null);
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

      {/* Platform Configuration Cards */}
      <div className="grid gap-6 lg:grid-cols-3">
        {PLATFORMS.map((meta) => {
          const config = configs[meta.platform];
          const isCurrentSaving = saving === meta.platform;
          const isCurrentSyncing = syncing === meta.platform;
          const isCurrentTesting = testing === meta.platform;
          const testResult = testResults[meta.platform];

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
                {/* Credential fields */}
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

                {/* Sync frequency */}
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

                {/* Sync status indicator */}
                <div className="pt-2 border-t border-slate-800">
                  <SyncStatusIndicator config={config} />
                </div>

                {/* Sync error message */}
                {config?.sync_error && (
                  <div className="flex items-start gap-2 text-sm text-red-400 bg-red-950/30 rounded-md p-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{config.sync_error}</span>
                  </div>
                )}

                {/* Connection test result */}
                {testResult && (
                  <div
                    className={`flex items-start gap-2 text-sm rounded-md p-2 ${
                      testResult.success
                        ? "text-green-400 bg-green-950/30"
                        : "text-red-400 bg-red-950/30"
                    }`}
                  >
                    {testResult.success ? (
                      <Wifi className="h-4 w-4 mt-0.5 shrink-0" />
                    ) : (
                      <WifiOff className="h-4 w-4 mt-0.5 shrink-0" />
                    )}
                    <div>
                      <div>{testResult.message}</div>
                      {testResult.responseTime > 0 && (
                        <div className="text-xs opacity-70 mt-0.5">
                          Response time: {testResult.responseTime}ms
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-col gap-2 pt-2">
                  <div className="flex gap-2">
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
                      className="flex-1 border-slate-700 text-slate-300 hover:text-white"
                    >
                      <RefreshCw
                        className={`h-4 w-4 mr-2 ${isCurrentSyncing ? "animate-spin" : ""}`}
                      />
                      {isCurrentSyncing ? "Syncing..." : "Sync Now"}
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => handleTestConnection(meta.platform)}
                    disabled={isCurrentTesting || !config}
                    className="w-full border-slate-700 text-slate-300 hover:text-white"
                  >
                    {isCurrentTesting ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Wifi className="h-4 w-4 mr-2" />
                    )}
                    {isCurrentTesting
                      ? "Testing..."
                      : "Test Connection"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Unified Progress Dashboard */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">
          Unified Progress Dashboard
        </h2>
        <UnifiedProgressDashboard />
      </div>
    </div>
  );
}

import type { LucideIcon } from "lucide-react";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: { direction: "up" | "down" | "flat"; percentage: number };
}

const TREND_CONFIG = {
  up: {
    icon: ArrowUp,
    color: "text-green-500",
    label: "increase",
  },
  down: {
    icon: ArrowDown,
    color: "text-red-500",
    label: "decrease",
  },
  flat: {
    icon: Minus,
    color: "text-slate-400",
    label: "no change",
  },
} as const;

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
}: StatCardProps) {
  return (
    <Card className="border-slate-800 bg-slate-900">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-slate-400">
          {title}
        </CardTitle>
        <Icon className="size-5 text-slate-400" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-white">{value}</div>
        <div className="mt-1 flex items-center gap-1">
          {trend && (
            <>
              {(() => {
                const config = TREND_CONFIG[trend.direction];
                const TrendIcon = config.icon;
                return (
                  <span
                    className={cn("flex items-center text-xs", config.color)}
                  >
                    <TrendIcon className="mr-0.5 size-3" />
                    {trend.percentage}%
                  </span>
                );
              })()}
            </>
          )}
          {description && (
            <span className="text-xs text-slate-400">{description}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

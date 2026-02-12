import { Skeleton } from "@/components/ui/skeleton";

export default function ModulesLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-2 rounded-lg border border-slate-700 p-4">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}

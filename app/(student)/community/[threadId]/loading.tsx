import { Skeleton } from "@/components/ui/skeleton";

export default function ThreadDetailLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-80" />
      <div className="space-y-4">
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
    </div>
  );
}

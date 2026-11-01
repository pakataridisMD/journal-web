import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder while a dashboard page's data loads. */
export function PageSkeleton({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="py-8" aria-busy="true">
      <span className="sr-only" role="status">
        {label}
      </span>
      <div className="space-y-3 border-b pb-8">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-9 w-[28rem] max-w-full" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      <div className="mt-8 space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-2/3" />
      </div>
    </div>
  );
}

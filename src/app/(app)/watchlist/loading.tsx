import { Skeleton } from "@/components/skeleton";

export default function WatchlistLoading() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Loading watchlist">
      <Skeleton className="h-9 w-36" />
      <div className="overflow-hidden rounded-lg border border-border bg-background-elevated p-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="mt-2 h-10 w-full" />
        <Skeleton className="mt-2 h-10 w-full" />
      </div>
    </div>
  );
}

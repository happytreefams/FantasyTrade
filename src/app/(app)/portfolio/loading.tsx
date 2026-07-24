import { Skeleton } from "@/components/skeleton";

export default function PortfolioLoading() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Loading portfolio">
      <Skeleton className="h-9 w-40" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-background-elevated p-4">
        <Skeleton className="mb-3 h-5 w-24" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="mt-2 h-10 w-full" />
        <Skeleton className="mt-2 h-10 w-full" />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-background-elevated p-4">
        <Skeleton className="mb-3 h-5 w-32" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="mt-2 h-10 w-full" />
      </div>
    </div>
  );
}

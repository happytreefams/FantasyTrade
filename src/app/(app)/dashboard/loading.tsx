import { Skeleton } from "@/components/skeleton";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Loading dashboard">
      <Skeleton className="h-9 w-40" />

      <div className="rounded-lg border border-border bg-background-elevated p-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-2 h-12 w-64" />
        <div className="mt-4 flex gap-8">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-24" />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-background-elevated p-4">
        <Skeleton className="mb-2 h-5 w-28" />
        <Skeleton className="h-56 w-full" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-56 rounded-lg" />
        <Skeleton className="h-56 rounded-lg" />
        <Skeleton className="h-56 rounded-lg" />
      </div>
    </div>
  );
}

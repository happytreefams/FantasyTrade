import { Skeleton } from "@/components/skeleton";

export default function SecurityDetailLoading() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Loading security">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Skeleton className="h-9 w-24" />
          <Skeleton className="mt-2 h-5 w-40" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>

      <div className="rounded-lg border border-border bg-background-elevated p-4">
        <Skeleton className="mb-2 h-5 w-28" />
        <Skeleton className="h-56 w-full" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
    </div>
  );
}

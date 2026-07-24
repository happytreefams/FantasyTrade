import { Skeleton } from "@/components/skeleton";

export default function TradeLoading() {
  return (
    <div className="flex flex-col gap-4" role="status" aria-label="Loading trade ticket">
      <Skeleton className="h-9 w-28" />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-border bg-background-elevated p-6">
          <div className="mb-3 flex gap-2">
            <Skeleton className="h-7 w-14 rounded-full" />
            <Skeleton className="h-7 w-16 rounded-full" />
            <Skeleton className="h-7 w-14 rounded-full" />
          </div>
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-96 rounded-lg" />
      </div>
    </div>
  );
}

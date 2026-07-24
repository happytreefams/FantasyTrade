import Link from "next/link";

export default function AppNotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-background-elevated p-10 text-center">
      <h1 className="text-title font-semibold">Not found</h1>
      <p className="text-body text-foreground-muted">
        We couldn&apos;t find what you were looking for — it may have been renamed or doesn&apos;t exist.
      </p>
      <Link
        href="/dashboard"
        className="mt-2 rounded-md bg-accent-solid px-3 py-2 text-body font-medium text-accent-foreground transition-colors hover:bg-accent-solid-hover"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}

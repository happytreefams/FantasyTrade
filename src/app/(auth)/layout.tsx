export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="text-title font-semibold tracking-tight">Fantasy Trade</span>
          <p className="mt-1 text-caption text-foreground-muted">
            Practice trading with a simulated portfolio.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-background-elevated p-6 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}

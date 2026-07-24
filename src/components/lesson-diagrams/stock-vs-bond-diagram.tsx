function Node({ label }: { label: string }) {
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-border-strong bg-background-elevated text-center text-caption font-semibold text-foreground">
      {label}
    </div>
  );
}

/// Ownership (stock) vs. lending (bond), side by side: a stock is a
/// two-way ownership stake with no promised return; a bond is a loan that's
/// repaid with interest on a schedule, regardless of how the company does.
export function StockVsBondDiagram({ highlight = "both" }: { highlight?: "stock" | "bond" | "both" }) {
  const stockEmphasis = highlight === "stock" || highlight === "both";
  const bondEmphasis = highlight === "bond" || highlight === "both";

  return (
    <div className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-background-inset p-4 sm:grid-cols-2">
      <div
        className={`flex flex-col items-center gap-3 rounded-md border p-4 text-center ${
          stockEmphasis ? "border-accent/40 bg-accent/5" : "border-border"
        }`}
      >
        <p className="text-caption font-semibold text-foreground">Stock — you own a piece</p>
        <div className="flex items-center gap-2">
          <Node label="You" />
          <svg width="40" height="24" viewBox="0 0 40 24" aria-hidden="true">
            <line x1="2" y1="12" x2="38" y2="12" stroke="var(--color-foreground-subtle)" strokeWidth="2" />
            <path d="M30 5 L38 12 L30 19" fill="none" stroke="var(--color-foreground-subtle)" strokeWidth="2" />
            <path d="M10 5 L2 12 L10 19" fill="none" stroke="var(--color-foreground-subtle)" strokeWidth="2" />
          </svg>
          <Node label="Co." />
        </div>
        <p className="text-caption text-foreground-muted">
          Owner. No fixed payback — value rises and falls with the company, uncapped upside, real downside risk.
        </p>
      </div>

      <div
        className={`flex flex-col items-center gap-3 rounded-md border p-4 text-center ${
          bondEmphasis ? "border-accent/40 bg-accent/5" : "border-border"
        }`}
      >
        <p className="text-caption font-semibold text-foreground">Bond — you lend money</p>
        <div className="flex items-center gap-2">
          <Node label="You" />
          <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
            <line x1="2" y1="14" x2="38" y2="14" stroke="var(--color-foreground-subtle)" strokeWidth="2" />
            <path d="M30 7 L38 14 L30 21" fill="none" stroke="var(--color-foreground-subtle)" strokeWidth="2" />
            <line x1="38" y1="28" x2="2" y2="28" stroke="var(--color-positive)" strokeWidth="2" />
            <path d="M10 21 L2 28 L10 35" fill="none" stroke="var(--color-positive)" strokeWidth="2" />
          </svg>
          <Node label="Co." />
        </div>
        <p className="text-caption text-foreground-muted">
          Lender. Fixed interest paid on schedule, principal back at maturity — paid before owners, whether the
          company thrives or not.
        </p>
      </div>
    </div>
  );
}

import { formatCurrency } from "@/lib/format";

function Box({ label, sublabel }: { label: string; sublabel?: string }) {
  return (
    <div className="flex min-w-[110px] flex-1 flex-col items-center justify-center gap-1 rounded-md border-2 border-border-strong bg-background-elevated px-3 py-3 text-center">
      <span className="text-caption font-semibold text-foreground">{label}</span>
      {sublabel ? <span className="text-caption text-foreground-muted">{sublabel}</span> : null}
    </div>
  );
}

function Arrow() {
  return (
    <svg width="28" height="20" viewBox="0 0 28 20" aria-hidden="true" className="shrink-0">
      <line x1="2" y1="10" x2="22" y2="10" stroke="var(--color-foreground-subtle)" strokeWidth="2" />
      <path d="M15 3 L23 10 L15 17" fill="none" stroke="var(--color-foreground-subtle)" strokeWidth="2" />
    </svg>
  );
}

/// The mechanics of a short sale as a four-step flow — borrow, sell, buy
/// back, return — plus the risk asymmetry that makes it fundamentally
/// different from owning a stock: a long position's maximum loss is capped
/// at 100% (the price can't go below $0), but a short position's maximum
/// loss is theoretically unlimited (the price can keep rising indefinitely).
export function ShortSellingDiagram({
  shares = 10,
  sellPrice = 50,
  buyBackPrice = 35,
}: {
  shares?: number;
  sellPrice?: number;
  buyBackPrice?: number;
}) {
  const proceeds = shares * sellPrice;
  const cost = shares * buyBackPrice;
  const profit = proceeds - cost;
  const isProfit = profit >= 0;

  return (
    <div className="rounded-lg border border-border bg-background-inset p-4">
      <div className="flex flex-wrap items-center justify-center gap-1">
        <Box label="Borrow shares" sublabel={`${shares} shares from a broker`} />
        <Arrow />
        <Box label="Sell now" sublabel={`@ ${formatCurrency(sellPrice)} = +${formatCurrency(proceeds)}`} />
        <Arrow />
        <Box label="Buy back later" sublabel={`@ ${formatCurrency(buyBackPrice)} = -${formatCurrency(cost)}`} />
        <Arrow />
        <Box label="Return shares" sublabel="Position closed" />
      </div>

      <p className={`mt-3 text-center text-body font-semibold ${isProfit ? "text-positive" : "text-negative"}`}>
        {isProfit ? "+" : ""}
        {formatCurrency(profit)} {isProfit ? "profit" : "loss"} — the price fell after you sold, exactly what a short seller wants.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-border p-3 text-center">
          <p className="text-caption font-semibold text-foreground">Owning a stock (long)</p>
          <p className="mt-1 text-caption text-foreground-muted">
            Maximum loss: <span className="font-medium text-foreground">100%</span> (price can only fall to $0)
          </p>
          <p className="text-caption text-foreground-muted">Maximum gain: uncapped</p>
        </div>
        <div className="rounded-md border border-negative/40 bg-negative-bg/40 p-3 text-center">
          <p className="text-caption font-semibold text-foreground">Selling short</p>
          <p className="mt-1 text-caption text-foreground-muted">Maximum gain: 100% (price can only fall to $0)</p>
          <p className="text-caption font-medium text-negative">Maximum loss: unlimited — there&apos;s no ceiling on how high a price can rise</p>
        </div>
      </div>
    </div>
  );
}

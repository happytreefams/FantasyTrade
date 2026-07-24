import { SignOutButton } from "@/components/sign-out-button";
import { formatCurrency } from "@/lib/format";

export function AppHeader({
  userLabel,
  cashBalance,
  portfolioValue,
  pricesAsOf,
}: {
  userLabel: string;
  cashBalance: string;
  portfolioValue: string;
  pricesAsOf: string | null;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background-elevated px-4 py-3 sm:px-6">
      <div className="flex flex-wrap items-center gap-4 sm:gap-6">
        <div>
          <p className="text-caption text-foreground-muted">Cash balance</p>
          <p className="font-financial text-body font-medium">{formatCurrency(cashBalance)}</p>
        </div>
        <div>
          <p className="text-caption text-foreground-muted">Portfolio value</p>
          <p className="font-financial text-body font-medium">{formatCurrency(portfolioValue)}</p>
        </div>
        {pricesAsOf ? (
          <span className="hidden rounded-full border border-border px-2.5 py-1 text-caption text-foreground-muted sm:inline-flex">
            Prices as of {pricesAsOf} close
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden text-caption text-foreground-muted sm:inline">{userLabel}</span>
        <SignOutButton />
      </div>
    </header>
  );
}

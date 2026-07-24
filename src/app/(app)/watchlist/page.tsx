import Link from "next/link";

import { StarButton } from "@/components/star-button";
import { requireAccount } from "@/lib/current-account";
import { formatAsOfDate, formatCurrency, formatPercent } from "@/lib/format";
import { getLatestPricingDate } from "@/lib/market-data";
import { getWatchlist } from "@/lib/watchlist";

export default async function WatchlistPage() {
  const { account } = await requireAccount();
  const [items, pricesAsOf] = await Promise.all([
    getWatchlist(account.id),
    getLatestPricingDate().then(formatAsOfDate),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-display font-semibold tracking-tight">Watchlist</h1>
        {pricesAsOf ? <p className="text-caption text-foreground-muted">Prices as of {pricesAsOf} close</p> : null}
      </div>

      <section className="overflow-hidden rounded-lg border border-border bg-background-elevated">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center">
            <p className="text-body text-foreground-muted">Your watchlist is empty.</p>
            <p className="text-caption text-foreground-subtle">
              Star a symbol from Trade or a security&apos;s page to track it here.
            </p>
            <Link
              href="/trade"
              className="mt-2 rounded-md bg-accent-solid px-3 py-2 text-body font-medium text-accent-foreground transition-colors hover:bg-accent-solid-hover"
            >
              Go to Trade
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-body">
              <thead>
                <tr className="text-caption text-foreground-muted">
                  <th className="px-4 py-2 text-left">Symbol</th>
                  <th className="px-4 py-2 text-right">Last close</th>
                  <th className="px-4 py-2 text-right">Day change</th>
                  <th className="px-4 py-2 text-right">
                    <span className="sr-only">Remove from watchlist</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const isGain = item.dayChange.greaterThanOrEqualTo(0);
                  return (
                    <tr key={item.id} className="border-t border-border">
                      <td className="px-4 py-3">
                        <Link
                          href={`/security/${encodeURIComponent(item.security.symbol)}`}
                          className="font-medium hover:text-accent hover:underline"
                        >
                          {item.security.symbol}
                        </Link>
                        <div className="text-caption text-foreground-muted">{item.security.name}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-financial">
                        {item.lastClose ? formatCurrency(item.lastClose.toString()) : "—"}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-financial ${isGain ? "text-positive" : "text-negative"}`}
                      >
                        {formatCurrency(item.dayChange.toString())} ({formatPercent(item.dayChangePercent.toString())})
                      </td>
                      <td className="px-2 py-3 text-right">
                        <StarButton securityId={item.security.id} symbol={item.security.symbol} initialWatched size="sm" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

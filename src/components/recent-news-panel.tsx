import { formatAsOfDate, formatPercent } from "@/lib/format";
import type { NewsHeadline } from "@/lib/market-data";

/// Shows recent headlines and the security's 5-day price change side by
/// side, deliberately not paired into a single sentence — the two facts are
/// independent, and nothing here should read as "the stock moved because of
/// this headline." Price moves have many contributing factors; the app only
/// ever presents both facts neutrally, never as cause and effect.
export function RecentNewsPanel({
  headlines,
  fiveDayChangePercent,
}: {
  headlines: NewsHeadline[] | null;
  fiveDayChangePercent: number | string | null;
}) {
  const changeIsPositive = fiveDayChangePercent != null && Number(fiveDayChangePercent) >= 0;

  return (
    <section className="rounded-lg border border-border bg-background-elevated p-4 sm:p-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-title font-semibold">Recent News</h2>
        {fiveDayChangePercent != null ? (
          <p className={`font-financial text-caption ${changeIsPositive ? "text-positive" : "text-negative"}`}>
            5-day change: {formatPercent(fiveDayChangePercent)}
          </p>
        ) : null}
      </div>

      {!headlines || headlines.length === 0 ? (
        <p className="text-body text-foreground-muted">No recent headlines available.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {headlines.map((headline) => (
            <li key={headline.url} className="py-3 first:pt-0 last:pb-0">
              <a
                href={headline.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-body font-medium text-foreground hover:text-accent hover:underline"
              >
                {headline.title}
              </a>
              <p className="mt-1 text-caption text-foreground-subtle">
                {headline.source} · {formatAsOfDate(headline.publishedAt)}
              </p>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-caption text-foreground-subtle">
        Headlines and price change are shown together for context only — not as an explanation for any specific move.
      </p>
    </section>
  );
}

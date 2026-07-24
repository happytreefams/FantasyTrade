import { RRSP, TFSA } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";

type AccountType = "TFSA" | "RRSP";

type YearPoint = { year: number; cumulative: number };

/// Real year-by-year TFSA limits, accumulated — this is the actual published
/// schedule, not an estimate.
function tfsaSeries(): YearPoint[] {
  let cumulative = 0;
  return TFSA.historicalLimits.map(({ year, limit }) => {
    cumulative += limit;
    return { year, cumulative };
  });
}

/// RRSP room depends on each year's real earned income, which this app has
/// no record of — so this is an illustrative example only: a flat assumed
/// income, capped at the same annual dollar limit that applies to everyone.
const ASSUMED_ANNUAL_INCOME = 80000;

function rrspSeries(): YearPoint[] {
  const annualRoom = Math.min((ASSUMED_ANNUAL_INCOME * RRSP.contributionPercentOfEarnedIncome) / 100, RRSP.annualDollarCap);
  const years = Array.from({ length: 6 }, (_, index) => RRSP.sourceYear - 5 + index);
  let cumulative = 0;
  return years.map((year) => {
    cumulative += annualRoom;
    return { year, cumulative };
  });
}

/// Illustrates how unused contribution room accumulates year over year for
/// someone who never contributes — real TFSA history for `accountType`
/// "TFSA" (the default), or an illustrative flat-income example for "RRSP"
/// (real RRSP room depends on each year's actual earned income).
export function ContributionRoomTracker({ accountType = "TFSA" }: { accountType?: AccountType }) {
  const series = accountType === "TFSA" ? tfsaSeries() : rrspSeries();
  const max = Math.max(...series.map((point) => point.cumulative));
  const first = series[0];
  const last = series[series.length - 1];

  return (
    <div className="rounded-lg border border-border bg-background-inset p-4">
      <div
        role="img"
        aria-label={`Cumulative unused ${accountType} contribution room growing from ${formatCurrency(first.cumulative)} in ${first.year} to ${formatCurrency(last.cumulative)} in ${last.year}`}
        className="flex h-32 items-end gap-1"
      >
        {series.map((point) => (
          <div key={point.year} title={`${point.year}: ${formatCurrency(point.cumulative)} cumulative room`} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <div className="w-full rounded-t bg-accent" style={{ height: `${(point.cumulative / max) * 100}%` }} />
            <span className="text-[10px] text-foreground-subtle">&apos;{String(point.year).slice(2)}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-caption text-foreground-subtle">
        By {last.year}, someone who never contributed would have {formatCurrency(last.cumulative)} in unused{" "}
        {accountType} room — it never expires and keeps accumulating whether or not you use it.
        {accountType === "RRSP" ? ` (Illustrative: assumes a flat $${ASSUMED_ANNUAL_INCOME.toLocaleString()}/year income — real RRSP room depends on your actual earned income each year.)` : ""}
      </p>
    </div>
  );
}

import { formatCurrency } from "@/lib/format";

const CHART_WIDTH = 560;
const CHART_HEIGHT = 180;
const PADDING_X = 8;
const PADDING_Y = 20;

function computeSeries(principal: number, annualRatePercent: number, years: number, annualContribution: number): number[] {
  const rate = annualRatePercent / 100;
  const series = [principal];
  for (let year = 1; year <= years; year += 1) {
    const previous = series[year - 1];
    series.push((previous + annualContribution) * (1 + rate));
  }
  return series;
}

/// A static illustrative line chart of compound growth — not a precision
/// calculator, just enough to show why the curve bends upward over time
/// instead of climbing in a straight line.
export function CompoundGrowthChart({
  principal = 1000,
  annualRatePercent = 7,
  years = 20,
  monthlyContribution = 0,
  label,
}: {
  principal?: number;
  annualRatePercent?: number;
  years?: number;
  monthlyContribution?: number;
  label?: string;
}) {
  const series = computeSeries(principal, annualRatePercent, years, monthlyContribution * 12);
  const max = Math.max(...series);
  const min = Math.min(...series);
  const range = max - min || 1;

  const points = series.map((value, index) => ({
    x: PADDING_X + (index / (series.length - 1)) * (CHART_WIDTH - PADDING_X * 2),
    y: PADDING_Y + (1 - (value - min) / range) * (CHART_HEIGHT - PADDING_Y * 2),
    value,
  }));

  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${CHART_HEIGHT - PADDING_Y} L ${points[0].x} ${CHART_HEIGHT - PADDING_Y} Z`;

  const finalValue = series[series.length - 1];
  const totalContributed = principal + monthlyContribution * 12 * years;
  const growthFromCompounding = finalValue - totalContributed;

  return (
    <div className="rounded-lg border border-border bg-background-inset p-4">
      <p className="mb-2 text-caption text-foreground-muted">
        {label ?? `${formatCurrency(principal)} at ${annualRatePercent}% annual return over ${years} years`}
        {monthlyContribution > 0 ? `, plus ${formatCurrency(monthlyContribution)}/month` : ""}
      </p>
      <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="w-full" role="img" aria-label={`Growth from ${formatCurrency(principal)} to ${formatCurrency(finalValue)} over ${years} years`}>
        <line x1={PADDING_X} x2={CHART_WIDTH - PADDING_X} y1={CHART_HEIGHT - PADDING_Y} y2={CHART_HEIGHT - PADDING_Y} stroke="var(--color-border)" strokeWidth={1} />
        <path d={areaPath} fill="var(--color-positive)" opacity={0.12} stroke="none" />
        <path d={linePath} fill="none" stroke="var(--color-positive)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={4} fill="var(--color-positive)" />
      </svg>
      <div className="mt-1 flex justify-between text-caption text-foreground-muted">
        <span>Year 0 — {formatCurrency(principal)}</span>
        <span>
          Year {years} — {formatCurrency(finalValue)}
        </span>
      </div>
      <p className="mt-3 text-caption text-foreground-subtle">
        You put in {formatCurrency(totalContributed)}; compounding added {formatCurrency(growthFromCompounding)} more —
        growth on top of growth, not just interest on the original amount.
      </p>
    </div>
  );
}

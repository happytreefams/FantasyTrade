const SIZE = 140;
const STROKE_WIDTH = 24;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const DEFAULT_COLORS: Record<string, string> = {
  Stocks: "var(--color-chart-1)",
  ETFs: "var(--color-chart-2)",
  Bonds: "var(--color-chart-3)",
  Commodities: "var(--color-chart-4)",
  Cash: "var(--color-chart-5)",
};
const FALLBACK_COLORS = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)", "var(--color-chart-5)"];

export type AllocationSlice = { label: string; percent: number; color?: string };

const DEFAULT_SEGMENTS: AllocationSlice[] = [
  { label: "Stocks", percent: 50 },
  { label: "Bonds", percent: 25 },
  { label: "ETFs", percent: 15 },
  { label: "Commodities", percent: 10 },
];

/// A percentage-based allocation donut + legend — for a *suggested* or
/// *sample* breakdown (a risk-profile recommendation, a lesson's
/// illustrative example), as opposed to `AllocationDonut`, which plots a
/// live portfolio's actual dollar-value holdings. Shared by the learning
/// portal's `::diagram[AssetAllocationPie]` embeds (via
/// `lesson-diagrams/index.ts`) and the risk-profile questionnaire's results
/// screen — kept at this top level, not under `lesson-diagrams/`, since
/// it's not lesson-specific content.
export function AssetAllocationPie({ segments = DEFAULT_SEGMENTS }: { segments?: AllocationSlice[] }) {
  const total = segments.reduce((sum, segment) => sum + segment.percent, 0) || 1;
  const arcs = segments.reduce<Array<{ length: number; offset: number }>>((acc, segment) => {
    const previous = acc[acc.length - 1];
    const offset = previous ? previous.offset + previous.length : 0;
    const length = (segment.percent / total) * CIRCUMFERENCE;
    return [...acc, { length, offset }];
  }, []);

  const summary = segments.map((segment) => `${segment.label} ${segment.percent}%`).join(", ");

  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-background-inset p-4 sm:flex-row sm:items-center sm:justify-center">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={`Sample allocation: ${summary}`} className="shrink-0 -rotate-90">
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="var(--color-border)" strokeWidth={STROKE_WIDTH} />
        {segments.map((segment, index) => {
          const { length, offset } = arcs[index];
          const dashOffset = -offset;
          const color = segment.color ?? DEFAULT_COLORS[segment.label] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
          return (
            <circle
              key={segment.label}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={color}
              strokeWidth={STROKE_WIDTH}
              strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
              strokeDashoffset={dashOffset}
            />
          );
        })}
      </svg>
      <ul className="flex flex-col gap-1.5">
        {segments.map((segment, index) => {
          const color = segment.color ?? DEFAULT_COLORS[segment.label] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
          return (
            <li key={segment.label} className="flex items-center gap-2 text-caption">
              <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-foreground-muted">{segment.label}</span>
              <span className="font-financial font-semibold text-foreground">{segment.percent}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

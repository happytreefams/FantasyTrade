const SIZE = 120;
const STROKE_WIDTH = 22;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const SEGMENT_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--color-accent)",
  "var(--color-positive)",
  "var(--color-border-strong)",
];

function MiniDonut({ slices, ariaLabel }: { slices: number[]; ariaLabel: string }) {
  const total = slices.reduce((sum, value) => sum + value, 0);
  const arcs = slices.reduce<Array<{ length: number; offset: number }>>((acc, value) => {
    const previous = acc[acc.length - 1];
    const offset = previous ? previous.offset + previous.length : 0;
    const length = (value / total) * CIRCUMFERENCE;
    return [...acc, { length, offset }];
  }, []);

  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={ariaLabel} className="-rotate-90">
      <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="var(--color-border)" strokeWidth={STROKE_WIDTH} />
      {arcs.map(({ length, offset }, index) => {
        const dashOffset = -offset;
        return (
          <circle
            key={index}
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={SEGMENT_COLORS[index % SEGMENT_COLORS.length]}
            strokeWidth={STROKE_WIDTH}
            strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
            strokeDashoffset={dashOffset}
          />
        );
      })}
    </svg>
  );
}

/// Side-by-side comparison of a concentrated portfolio (one dominant
/// holding) against a diversified one (many similarly-sized holdings) — the
/// visual point is that a bad quarter for one holding barely dents the
/// diversified side but sinks the concentrated one.
export function DiversificationDiagram({
  concentratedLabel = "1 company",
  diversifiedLabel = "20+ companies",
  diversifiedSegments = 8,
}: {
  concentratedLabel?: string;
  diversifiedLabel?: string;
  diversifiedSegments?: number;
}) {
  const evenSlices = Array.from({ length: diversifiedSegments }, () => 1);

  return (
    <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-background-inset p-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <MiniDonut slices={[85, 15]} ariaLabel={`Concentrated portfolio: 85% in ${concentratedLabel}`} />
        <p className="text-caption font-semibold text-foreground">Concentrated</p>
        <p className="text-caption text-foreground-muted">{concentratedLabel} dominates the portfolio</p>
      </div>
      <div className="flex flex-col items-center gap-2 text-center">
        <MiniDonut slices={evenSlices} ariaLabel={`Diversified portfolio: evenly split across ${diversifiedLabel}`} />
        <p className="text-caption font-semibold text-foreground">Diversified</p>
        <p className="text-caption text-foreground-muted">Spread evenly across {diversifiedLabel}</p>
      </div>
      <p className="col-span-2 text-caption text-foreground-subtle">
        One bad quarter sinks the concentrated portfolio — the same bad quarter barely moves the diversified one.
      </p>
    </div>
  );
}

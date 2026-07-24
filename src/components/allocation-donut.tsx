import { formatCurrency } from "@/lib/format";

export type AllocationSegment = {
  label: string;
  value: number;
  color: string;
};

const SIZE = 160;
const STROKE_WIDTH = 28;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/// Portfolio asset-allocation donut. A single donut is one "series" in
/// dataviz terms (no legend box needed for identity — the adjacent list of
/// labeled swatches serves as both legend and the accessible data table).
export function AllocationDonut({ segments }: { segments: AllocationSegment[] }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const nonZero = segments.filter((segment) => segment.value > 0);

  if (total <= 0 || nonZero.length === 0) {
    return <p className="text-body text-foreground-muted">No holdings to allocate yet.</p>;
  }

  const summaryText = nonZero
    .map((segment) => `${segment.label} ${((segment.value / total) * 100).toFixed(1)}%`)
    .join(", ");

  const arcs = nonZero.reduce<Array<{ segment: AllocationSegment; length: number; offset: number }>>((acc, segment) => {
    const previous = acc[acc.length - 1];
    const offset = previous ? previous.offset + previous.length : 0;
    const length = (segment.value / total) * CIRCUMFERENCE;
    return [...acc, { segment, length, offset }];
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={`Asset allocation: ${summaryText}`}
        className="shrink-0 -rotate-90"
      >
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="var(--color-border)" strokeWidth={STROKE_WIDTH} />
        {arcs.map(({ segment, length, offset }) => (
          <circle
            key={segment.label}
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={segment.color}
            strokeWidth={STROKE_WIDTH}
            strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
            strokeDashoffset={-offset}
          />
        ))}
      </svg>

      <ul className="flex w-full flex-col gap-1.5">
        {nonZero.map((segment) => (
          <li key={segment.label} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-body">
            <span className="flex items-center gap-2">
              <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} />
              <span className="text-foreground-muted">{segment.label}</span>
            </span>
            <span className="font-financial whitespace-nowrap">
              {formatCurrency(segment.value)}{" "}
              <span className="text-foreground-muted">({((segment.value / total) * 100).toFixed(1)}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

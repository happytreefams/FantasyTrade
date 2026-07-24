const WIDTH = 560;
const HEIGHT = 90;
const TRACK_Y = 40;
const PADDING = 32;

type SpectrumPoint = "CASH" | "BONDS" | "STOCKS" | "COMMODITIES";

const POINTS: { key: SpectrumPoint; label: string }[] = [
  { key: "CASH", label: "Cash" },
  { key: "BONDS", label: "Bonds" },
  { key: "STOCKS", label: "Stocks" },
  { key: "COMMODITIES", label: "Commodities" },
];

/// A left-to-right risk/return spectrum from cash (lowest, safest, barely
/// grows) to commodities (highest, most volatile) — the relative ordering
/// is the point, not precise numbers.
export function RiskReturnSpectrum({ highlight }: { highlight?: SpectrumPoint }) {
  const step = (WIDTH - PADDING * 2) / (POINTS.length - 1);

  return (
    <div className="rounded-lg border border-border bg-background-inset p-4">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Risk and return spectrum, lowest to highest: Cash, Bonds, Stocks, Commodities">
        <defs>
          <linearGradient id="risk-return-gradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--color-positive)" />
            <stop offset="100%" stopColor="var(--color-negative)" />
          </linearGradient>
        </defs>
        <line x1={PADDING} x2={WIDTH - PADDING} y1={TRACK_Y} y2={TRACK_Y} stroke="url(#risk-return-gradient)" strokeWidth={3} strokeLinecap="round" opacity={0.6} />
        {POINTS.map((point, index) => {
          const x = PADDING + index * step;
          const isHighlighted = highlight === point.key;
          return (
            <g key={point.key}>
              <circle cx={x} cy={TRACK_Y} r={isHighlighted ? 8 : 5.5} fill={isHighlighted ? "var(--color-accent)" : "var(--color-foreground-subtle)"} stroke="var(--color-background-inset)" strokeWidth={2} />
              <text x={x} y={TRACK_Y + 26} textAnchor="middle" className={isHighlighted ? "fill-accent" : "fill-foreground-muted"} style={{ fontSize: 12, fontWeight: isHighlighted ? 600 : 400 }}>
                {point.label}
              </text>
            </g>
          );
        })}
        <text x={PADDING} y={16} textAnchor="start" className="fill-foreground-subtle" style={{ fontSize: 10 }}>
          Lower risk / return
        </text>
        <text x={WIDTH - PADDING} y={16} textAnchor="end" className="fill-foreground-subtle" style={{ fontSize: 10 }}>
          Higher risk / return
        </text>
      </svg>
    </div>
  );
}

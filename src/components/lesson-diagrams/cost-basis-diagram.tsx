import { formatCurrency } from "@/lib/format";

const WIDTH = 480;
const BAR_HEIGHT = 28;
const GAP = 14;

function Bar({ y, width, maxWidth, color, label, value }: { y: number; width: number; maxWidth: number; color: string; label: string; value: string }) {
  return (
    <g>
      <rect x={0} y={y} width={maxWidth} height={BAR_HEIGHT} rx={4} fill="var(--color-border)" />
      <rect x={0} y={y} width={width} height={BAR_HEIGHT} rx={4} fill={color} />
      <text x={8} y={y + BAR_HEIGHT / 2 + 4} className="fill-background" style={{ fontSize: 12, fontWeight: 600 }}>
        {label}
      </text>
      <text x={maxWidth - 8} y={y + BAR_HEIGHT / 2 + 4} textAnchor="end" className="fill-foreground" style={{ fontSize: 12, fontWeight: 600 }}>
        {value}
      </text>
    </g>
  );
}

/// Two related visual grammars for portfolio math, sharing one bar-chart
/// style: `variant="lots"` shows individual purchase lots blending into one
/// weighted-average cost basis; `variant="value"` (default) shows a
/// cost-vs-value comparison that produces an unrealized gain/loss. `lots`
/// only has a sensible default (not a markdown-embeddable prop, since the
/// directive syntax doesn't encode arrays) — pass it directly when using
/// this component from a .tsx file instead of a lesson's `::diagram[]`.
export function CostBasisDiagram({
  variant = "value",
  lots = [
    { quantity: 10, price: 100 },
    { quantity: 10, price: 120 },
  ],
  costBasis = 1100,
  marketValue = 1300,
}: {
  variant?: "lots" | "value";
  lots?: { quantity: number; price: number }[];
  costBasis?: number;
  marketValue?: number;
}) {
  if (variant === "lots" && lots.length > 0) {
    const totalShares = lots.reduce((sum, lot) => sum + lot.quantity, 0);
    const totalCost = lots.reduce((sum, lot) => sum + lot.quantity * lot.price, 0);
    const average = totalCost / totalShares;
    const maxPrice = Math.max(...lots.map((lot) => lot.price), average);
    const height = lots.length * (BAR_HEIGHT + GAP) + GAP + BAR_HEIGHT;

    return (
      <div className="rounded-lg border border-border bg-background-inset p-4">
        <svg viewBox={`0 0 ${WIDTH} ${height}`} className="w-full" role="img" aria-label={`Lots averaging to ${formatCurrency(average)} per share`}>
          {lots.map((lot, index) => (
            <Bar
              key={index}
              y={index * (BAR_HEIGHT + GAP)}
              width={(lot.price / maxPrice) * WIDTH}
              maxWidth={WIDTH}
              color="var(--color-chart-1)"
              label={`${lot.quantity} shares @ ${formatCurrency(lot.price)}`}
              value={formatCurrency(lot.price)}
            />
          ))}
          <Bar
            y={lots.length * (BAR_HEIGHT + GAP) + GAP}
            width={(average / maxPrice) * WIDTH}
            maxWidth={WIDTH}
            color="var(--color-accent)"
            label={`Average cost basis (${totalShares} shares)`}
            value={formatCurrency(average)}
          />
        </svg>
      </div>
    );
  }

  const cost = costBasis;
  const value = marketValue;
  const maxValue = Math.max(cost, value);
  const isGain = value >= cost;
  const gain = value - cost;
  const gainPercent = cost !== 0 ? (gain / cost) * 100 : 0;

  return (
    <div className="rounded-lg border border-border bg-background-inset p-4">
      <svg viewBox={`0 0 ${WIDTH} ${BAR_HEIGHT * 2 + GAP}`} className="w-full" role="img" aria-label={`Cost basis ${formatCurrency(cost)}, market value ${formatCurrency(value)}, ${isGain ? "gain" : "loss"} of ${formatCurrency(Math.abs(gain))}`}>
        <Bar y={0} width={(cost / maxValue) * WIDTH} maxWidth={WIDTH} color="var(--color-border-strong)" label="Cost basis" value={formatCurrency(cost)} />
        <Bar y={BAR_HEIGHT + GAP} width={(value / maxValue) * WIDTH} maxWidth={WIDTH} color={isGain ? "var(--color-positive)" : "var(--color-negative)"} label="Market value" value={formatCurrency(value)} />
      </svg>
      <p className={`mt-2 text-caption font-semibold ${isGain ? "text-positive" : "text-negative"}`}>
        {isGain ? "+" : ""}
        {formatCurrency(gain)} ({isGain ? "+" : ""}
        {gainPercent.toFixed(1)}%) unrealized {isGain ? "gain" : "loss"}
      </p>
    </div>
  );
}

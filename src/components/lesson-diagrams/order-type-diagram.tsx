import { formatCurrency } from "@/lib/format";

const WIDTH = 560;
const HEIGHT = 110;
const AXIS_Y = 40;
const PADDING = 24;

/// A market order fills immediately at whatever the current price is; a
/// limit order sits and waits, filling only once the price crosses the
/// limit — this plots both on the same price axis so the gap between them
/// is visible, not just described.
export function OrderTypeDiagram({
  currentPrice = 100,
  limitPrice = 95,
  side = "BUY",
}: {
  currentPrice?: number;
  limitPrice?: number;
  side?: "BUY" | "SELL";
}) {
  const axisMin = Math.min(currentPrice, limitPrice) * 0.92;
  const axisMax = Math.max(currentPrice, limitPrice) * 1.08;
  const span = axisMax - axisMin || 1;

  const positionOf = (value: number) => PADDING + ((value - axisMin) / span) * (WIDTH - PADDING * 2);
  const currentX = positionOf(currentPrice);
  const limitX = positionOf(limitPrice);

  const fillsBelow = side === "BUY";
  const shadeStart = fillsBelow ? PADDING : limitX;
  const shadeEnd = fillsBelow ? limitX : WIDTH - PADDING;

  return (
    <div className="rounded-lg border border-border bg-background-inset p-4">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={`${side} order: market fills now at ${formatCurrency(currentPrice)}; limit order waits for ${formatCurrency(limitPrice)}`}>
        <rect x={shadeStart} y={AXIS_Y - 14} width={Math.max(shadeEnd - shadeStart, 0)} height={28} fill="var(--color-accent)" opacity={0.1} />
        <line x1={PADDING} x2={WIDTH - PADDING} y1={AXIS_Y} y2={AXIS_Y} stroke="var(--color-border-strong)" strokeWidth={1.5} />

        <line x1={currentX} x2={currentX} y1={AXIS_Y - 16} y2={AXIS_Y + 16} stroke="var(--color-foreground-subtle)" strokeWidth={2} />
        <circle cx={currentX} cy={AXIS_Y} r={5} fill="var(--color-foreground-subtle)" />
        <text x={currentX} y={AXIS_Y - 24} textAnchor="middle" className="fill-foreground-muted" style={{ fontSize: 11 }}>
          Market: fills now
        </text>
        <text x={currentX} y={AXIS_Y + 36} textAnchor="middle" className="fill-foreground" style={{ fontSize: 12, fontWeight: 600 }}>
          {formatCurrency(currentPrice)}
        </text>

        <line x1={limitX} x2={limitX} y1={AXIS_Y - 16} y2={AXIS_Y + 16} stroke="var(--color-accent)" strokeWidth={2} />
        <circle cx={limitX} cy={AXIS_Y} r={5} fill="var(--color-accent)" />
        <text x={limitX} y={AXIS_Y - 24} textAnchor="middle" className="fill-accent" style={{ fontSize: 11 }}>
          Limit: waits for this
        </text>
        <text x={limitX} y={AXIS_Y + 36} textAnchor="middle" className="fill-foreground" style={{ fontSize: 12, fontWeight: 600 }}>
          {formatCurrency(limitPrice)}
        </text>
      </svg>
      <p className="mt-2 text-caption text-foreground-subtle">
        {side === "BUY"
          ? `A market buy fills right away at ${formatCurrency(currentPrice)}. A limit buy at ${formatCurrency(limitPrice)} only fills if the price drops to (or below) that — it might never fill.`
          : `A market sell fills right away at ${formatCurrency(currentPrice)}. A limit sell at ${formatCurrency(limitPrice)} only fills if the price rises to (or above) that — it might never fill.`}
      </p>
    </div>
  );
}

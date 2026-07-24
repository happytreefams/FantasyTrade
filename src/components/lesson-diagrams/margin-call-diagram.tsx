import { MAINTENANCE_MARGIN_THRESHOLD } from "@/lib/constants";

const MAX_DISPLAY_PERCENT = 300;
const BAR_HEIGHT_PX = 140;

function Gauge({ label, equityPercent, thresholdPercent }: { label: string; equityPercent: number; thresholdPercent: number }) {
  const clamped = Math.min(equityPercent, MAX_DISPLAY_PERCENT);
  const barHeight = (clamped / MAX_DISPLAY_PERCENT) * BAR_HEIGHT_PX;
  const thresholdHeight = (thresholdPercent / MAX_DISPLAY_PERCENT) * BAR_HEIGHT_PX;
  const isHealthy = equityPercent >= thresholdPercent;

  return (
    <div className="flex flex-1 flex-col items-center gap-2">
      <div className="relative flex items-end" style={{ height: BAR_HEIGHT_PX, width: 56 }}>
        <div className="absolute inset-x-0 bottom-0 rounded-t bg-background-inset" style={{ height: BAR_HEIGHT_PX }} />
        <div
          className={`absolute inset-x-0 bottom-0 rounded-t ${isHealthy ? "bg-positive" : "bg-negative"}`}
          style={{ height: barHeight }}
        />
        <div
          className="absolute inset-x-0 border-t-2 border-dashed border-foreground-subtle"
          style={{ bottom: thresholdHeight }}
          title={`Maintenance threshold: ${thresholdPercent}%`}
        />
      </div>
      <p className="text-caption font-semibold text-foreground">{label}</p>
      <p className={`font-financial text-body font-semibold ${isHealthy ? "text-positive" : "text-negative"}`}>
        {equityPercent}% of requirement
      </p>
    </div>
  );
}

/// Account equity relative to the margin requirement, shown for a healthy
/// short position and one where the price has moved against it far enough
/// to fall below the maintenance threshold (the dashed line) — a margin
/// call. This app simulates the warning only; it never auto-liquidates, but
/// a real broker can and will sell positions without further notice once
/// equity falls this low.
export function MarginCallDiagram({
  healthyEquityPercent = 250,
  calledEquityPercent = 20,
}: {
  healthyEquityPercent?: number;
  calledEquityPercent?: number;
}) {
  const thresholdPercent = MAINTENANCE_MARGIN_THRESHOLD * 100;

  return (
    <div className="rounded-lg border border-border bg-background-inset p-4">
      <div className="flex items-end justify-center gap-8">
        <Gauge label="Healthy position" equityPercent={healthyEquityPercent} thresholdPercent={thresholdPercent} />
        <Gauge label="Margin call" equityPercent={calledEquityPercent} thresholdPercent={thresholdPercent} />
      </div>
      <p className="mt-4 text-center text-caption text-foreground-subtle">
        The dashed line is the maintenance threshold ({thresholdPercent}% of the margin requirement, in this app).
        As the price moves against a leveraged position, equity shrinks toward — and can fall below — that line.
      </p>
    </div>
  );
}

"use client";

import { useState } from "react";

import { formatCurrency, formatPercent } from "@/lib/format";

export type LineChartPoint = { date: string; value: number };

const CHART_WIDTH = 640;
const CHART_HEIGHT = 220;
const PADDING_X = 12;
const PADDING_Y = 24;
const SECONDARY_SERIES_COLOR = "var(--color-chart-1)";

function formatDateLabel(date: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" }).format(new Date(date));
}

/// A single-series area/line chart — used for the dashboard's portfolio
/// performance, a security's price history, and (with `secondarySeries`) the
/// /portfolio benchmark overlay. Colored green/red by whether the primary
/// series ended up or down; ships with a hover crosshair + tooltip.
///
/// `secondarySeries`, when provided, must be the same length as `data` and
/// index-aligned to it (same dates in the same order) — it's drawn as a
/// second line sharing the same y-scale, with no area fill of its own so it
/// doesn't visually compete with the primary series' fill.
export function LineChart({
  data,
  emptyMessage,
  singlePointHint,
  secondarySeries,
  primarySeriesLabel,
  secondarySeriesLabel,
}: {
  data: LineChartPoint[];
  emptyMessage: string;
  singlePointHint: string;
  secondarySeries?: LineChartPoint[];
  primarySeriesLabel?: string;
  secondarySeriesLabel?: string;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-center text-body text-foreground-muted">
        {emptyMessage}
      </div>
    );
  }

  if (data.length === 1) {
    return (
      <div className="flex h-56 flex-col items-center justify-center gap-1">
        <p className="font-financial text-title font-semibold">{formatCurrency(data[0].value)}</p>
        <p className="text-caption text-foreground-muted">
          {formatDateLabel(data[0].date)} — {singlePointHint}
        </p>
      </div>
    );
  }

  const hasSecondary = !!secondarySeries && secondarySeries.length === data.length;

  const values = data.map((point) => point.value);
  const secondaryValues = hasSecondary ? secondarySeries!.map((point) => point.value) : [];
  const combinedValues = hasSecondary ? [...values, ...secondaryValues] : values;
  const min = Math.min(...combinedValues);
  const max = Math.max(...combinedValues);
  const range = max - min || 1;

  const toPoint = (point: LineChartPoint, index: number) => ({
    ...point,
    x: PADDING_X + (index / (data.length - 1)) * (CHART_WIDTH - PADDING_X * 2),
    y: PADDING_Y + (1 - (point.value - min) / range) * (CHART_HEIGHT - PADDING_Y * 2),
  });

  const points = data.map(toPoint);
  const secondaryPoints = hasSecondary ? secondarySeries!.map(toPoint) : [];

  const isGain = values[values.length - 1] >= values[0];
  const seriesColor = isGain ? "var(--color-positive)" : "var(--color-negative)";

  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${CHART_HEIGHT - PADDING_Y} L ${points[0].x} ${CHART_HEIGHT - PADDING_Y} Z`;
  const secondaryLinePath = hasSecondary
    ? secondaryPoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ")
    : "";

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;
  const hoveredPrev = hoverIndex !== null && hoverIndex > 0 ? points[hoverIndex - 1] : null;
  const hoveredSecondary = hasSecondary && hoverIndex !== null ? secondaryPoints[hoverIndex] : null;

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const relativeX = ((event.clientX - rect.left) / rect.width) * CHART_WIDTH;

    let nearestIndex = 0;
    let nearestDistance = Infinity;
    points.forEach((point, index) => {
      const distance = Math.abs(point.x - relativeX);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });
    setHoverIndex(nearestIndex);
  }

  const lastPoint = points[points.length - 1];
  const tooltipLeftPercent = hovered ? Math.min(92, Math.max(8, (hovered.x / CHART_WIDTH) * 100)) : 0;

  const ariaLabel = hasSecondary
    ? `${primarySeriesLabel ?? "Primary series"} vs. ${secondarySeriesLabel ?? "secondary series"}, ${formatDateLabel(points[0].date)} to ${formatDateLabel(lastPoint.date)}`
    : `${formatDateLabel(points[0].date)} to ${formatDateLabel(lastPoint.date)}: ${formatCurrency(values[0])} to ${formatCurrency(values[values.length - 1])}`;

  return (
    <div className="relative">
      {hasSecondary ? (
        <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-caption text-foreground-muted">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: seriesColor }} />
            {primarySeriesLabel ?? "Portfolio"}
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SECONDARY_SERIES_COLOR }} />
            {secondarySeriesLabel ?? "Benchmark"}
          </span>
        </div>
      ) : null}

      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="w-full touch-none"
        role="img"
        aria-label={ariaLabel}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverIndex(null)}
      >
        <line
          x1={PADDING_X}
          x2={CHART_WIDTH - PADDING_X}
          y1={PADDING_Y}
          y2={PADDING_Y}
          stroke="var(--color-border)"
          strokeWidth={1}
        />
        <line
          x1={PADDING_X}
          x2={CHART_WIDTH - PADDING_X}
          y1={CHART_HEIGHT - PADDING_Y}
          y2={CHART_HEIGHT - PADDING_Y}
          stroke="var(--color-border)"
          strokeWidth={1}
        />

        <path d={areaPath} fill={seriesColor} opacity={0.1} stroke="none" />
        {hasSecondary ? (
          <path d={secondaryLinePath} fill="none" stroke={SECONDARY_SERIES_COLOR} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
        ) : null}
        <path d={linePath} fill="none" stroke={seriesColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        <circle cx={lastPoint.x} cy={lastPoint.y} r={5} fill={seriesColor} stroke="var(--color-bg-elevated)" strokeWidth={2} />
        {hasSecondary ? (
          <circle
            cx={secondaryPoints[secondaryPoints.length - 1].x}
            cy={secondaryPoints[secondaryPoints.length - 1].y}
            r={4}
            fill={SECONDARY_SERIES_COLOR}
            stroke="var(--color-bg-elevated)"
            strokeWidth={2}
          />
        ) : null}

        {hovered ? (
          <>
            <line
              x1={hovered.x}
              x2={hovered.x}
              y1={PADDING_Y}
              y2={CHART_HEIGHT - PADDING_Y}
              stroke="var(--color-border-strong)"
              strokeWidth={1}
            />
            <circle cx={hovered.x} cy={hovered.y} r={5} fill={seriesColor} stroke="var(--color-bg-elevated)" strokeWidth={2} />
            {hoveredSecondary ? (
              <circle cx={hoveredSecondary.x} cy={hoveredSecondary.y} r={4} fill={SECONDARY_SERIES_COLOR} stroke="var(--color-bg-elevated)" strokeWidth={2} />
            ) : null}
          </>
        ) : null}
      </svg>

      <div className="mt-1 flex justify-between text-caption text-foreground-muted">
        <span>{formatDateLabel(points[0].date)}</span>
        <span>{formatDateLabel(lastPoint.date)}</span>
      </div>

      {hovered ? (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+8px)] rounded-md border border-border bg-background-elevated px-2.5 py-1.5 text-caption whitespace-nowrap shadow-lg"
          style={{ left: `${tooltipLeftPercent}%`, top: 0 }}
        >
          {hasSecondary ? (
            <>
              <p className="text-foreground-muted">{formatDateLabel(hovered.date)}</p>
              <p className="font-financial font-semibold" style={{ color: seriesColor }}>
                {primarySeriesLabel ?? "Portfolio"}: {hovered.value.toFixed(1)}
              </p>
              {hoveredSecondary ? (
                <p className="font-financial font-semibold" style={{ color: SECONDARY_SERIES_COLOR }}>
                  {secondarySeriesLabel ?? "Benchmark"}: {hoveredSecondary.value.toFixed(1)}
                </p>
              ) : null}
            </>
          ) : (
            <>
              <p className="font-financial font-semibold text-foreground">{formatCurrency(hovered.value)}</p>
              <p className="text-foreground-muted">{formatDateLabel(hovered.date)}</p>
              {hoveredPrev ? (
                <p className={hovered.value >= hoveredPrev.value ? "text-positive" : "text-negative"}>
                  {formatCurrency(hovered.value - hoveredPrev.value)} (
                  {formatPercent(((hovered.value - hoveredPrev.value) / hoveredPrev.value) * 100)})
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

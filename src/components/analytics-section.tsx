"use client";

import { useMemo, useState } from "react";

import { GlossaryTerm } from "@/components/glossary-term";
import { LineChart, type LineChartPoint } from "@/components/line-chart";
import { formatAsOfDate, formatCurrency, formatMarketCap } from "@/lib/format";
import type { GlossaryTermRecord } from "@/lib/glossary";

type Period = "1D" | "5D" | "1M" | "6M" | "YTD" | "1Y" | "5Y";
const PERIODS: Period[] = ["1D", "5D", "1M", "6M", "YTD", "1Y", "5Y"];

export type AnalyticsFundamentals = {
  marketCap: string | null;
  week52High: string | null;
  week52Low: string | null;
  dividendYield: string | null;
  peRatio: string | null;
  analystTargetPrice: string | null;
  analystStrongBuy: number | null;
  analystBuy: number | null;
  analystHold: number | null;
  analystSell: number | null;
  analystStrongSell: number | null;
  updatedAt: string | null;
};

/// Splits `data` (ascending by date) down to the points within `period` of
/// the most recent date on record. `limited` flags when the request reaches
/// further back than the data actually goes, so the UI can say so instead of
/// silently showing a shorter range than the label implies.
function filterByPeriod(data: LineChartPoint[], period: Period): { points: LineChartPoint[]; limited: boolean } {
  if (data.length === 0) return { points: [], limited: false };

  if (period === "1D") {
    return { points: data.slice(-2), limited: data.length < 2 };
  }

  if (period === "5D") {
    const points = data.slice(-5);
    return { points, limited: points.length < 5 };
  }

  const lastDate = new Date(data[data.length - 1].date);
  const cutoff = new Date(lastDate);
  if (period === "1M") cutoff.setUTCMonth(cutoff.getUTCMonth() - 1);
  else if (period === "6M") cutoff.setUTCMonth(cutoff.getUTCMonth() - 6);
  else if (period === "YTD") {
    cutoff.setUTCMonth(0);
    cutoff.setUTCDate(1);
  } else if (period === "1Y") cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1);
  else if (period === "5Y") cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 5);

  const points = data.filter((point) => new Date(point.date) >= cutoff);
  const earliestAvailable = new Date(data[0].date);
  const limited = earliestAvailable > cutoff;
  return { points, limited };
}

type ConsensusLabel = "Strong Buy" | "Buy" | "Hold" | "Sell" | "Strong Sell";
const CONSENSUS_LABELS: ConsensusLabel[] = ["Strong Buy", "Buy", "Hold", "Sell", "Strong Sell"];
const CONSENSUS_WEIGHTS: Record<ConsensusLabel, number> = {
  "Strong Buy": 5,
  Buy: 4,
  Hold: 3,
  Sell: 2,
  "Strong Sell": 1,
};
const CONSENSUS_COLORS: Record<ConsensusLabel, string> = {
  "Strong Buy": "var(--color-positive)",
  Buy: "color-mix(in srgb, var(--color-positive) 65%, transparent)",
  Hold: "var(--color-border-strong)",
  Sell: "color-mix(in srgb, var(--color-negative) 65%, transparent)",
  "Strong Sell": "var(--color-negative)",
};

/// A weighted-average consensus (5 = Strong Buy .. 1 = Strong Sell) across
/// analyst rating counts — the same convention most finance sites use.
/// Returns null when there's no analyst coverage data at all (every count is
/// null or the total is zero either way).
function computeConsensus(
  fundamentals: AnalyticsFundamentals | null,
): { counts: Record<ConsensusLabel, number>; total: number; label: ConsensusLabel } | null {
  if (!fundamentals) return null;

  const counts: Record<ConsensusLabel, number> = {
    "Strong Buy": fundamentals.analystStrongBuy ?? 0,
    Buy: fundamentals.analystBuy ?? 0,
    Hold: fundamentals.analystHold ?? 0,
    Sell: fundamentals.analystSell ?? 0,
    "Strong Sell": fundamentals.analystStrongSell ?? 0,
  };

  const total = CONSENSUS_LABELS.reduce((sum, label) => sum + counts[label], 0);
  if (total === 0) return null;

  const weightedSum = CONSENSUS_LABELS.reduce((sum, label) => sum + counts[label] * CONSENSUS_WEIGHTS[label], 0);
  const average = weightedSum / total;
  const label: ConsensusLabel =
    average >= 4.5 ? "Strong Buy" : average >= 3.5 ? "Buy" : average >= 2.5 ? "Hold" : average >= 1.5 ? "Sell" : "Strong Sell";

  return { counts, total, label };
}

function Stat({ label, value }: { label: React.ReactNode; value: string }) {
  return (
    <div>
      <p className="text-caption text-foreground-muted">{label}</p>
      <p className="font-financial text-body font-semibold">{value}</p>
    </div>
  );
}

function AnalystRatings({ fundamentals }: { fundamentals: AnalyticsFundamentals | null }) {
  const consensus = useMemo(() => computeConsensus(fundamentals), [fundamentals]);

  if (!consensus) {
    return <p className="text-body text-foreground-muted">Unavailable — no analyst coverage data.</p>;
  }

  return (
    <div>
      <p className="mb-2 text-body">
        Consensus: <span className="font-semibold">{consensus.label}</span>{" "}
        <span className="text-foreground-muted">({consensus.total} analysts)</span>
      </p>
      <div className="flex h-3 overflow-hidden rounded-full bg-background-inset" role="img" aria-label={`Analyst ratings: ${CONSENSUS_LABELS.map((label) => `${consensus.counts[label]} ${label}`).join(", ")}`}>
        {CONSENSUS_LABELS.map((label) =>
          consensus.counts[label] > 0 ? (
            <div
              key={label}
              style={{ width: `${(consensus.counts[label] / consensus.total) * 100}%`, backgroundColor: CONSENSUS_COLORS[label] }}
            />
          ) : null,
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-caption">
        {CONSENSUS_LABELS.map((label) => (
          <span key={label} className="flex items-center gap-1.5 text-foreground-muted">
            <span
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: CONSENSUS_COLORS[label] }}
            />
            {label} ({consensus.counts[label]})
          </span>
        ))}
      </div>
    </div>
  );
}

/// Wraps a Stat's label in a glossary tooltip when a matching term is
/// available, falling back to the plain label text otherwise (e.g. when the
/// glossary table has no entry, or `glossaryTerms` wasn't passed at all).
function statLabel(text: string, glossaryTerms: GlossaryTermRecord[] | undefined): React.ReactNode {
  const entry = glossaryTerms?.find((term) => term.term.toLowerCase() === text.toLowerCase());
  if (!entry) return text;
  return (
    <GlossaryTerm term={entry.term} definition={entry.definition} lessonHref={entry.relatedLessonId ? `/learn/lessons/${entry.relatedLessonId}` : null}>
      {text}
    </GlossaryTerm>
  );
}

export function AnalyticsSection({
  priceHistory,
  fundamentals,
  glossaryTerms,
}: {
  priceHistory: LineChartPoint[];
  fundamentals: AnalyticsFundamentals | null;
  glossaryTerms?: GlossaryTermRecord[];
}) {
  const [period, setPeriod] = useState<Period>("1M");
  const { points, limited } = useMemo(() => filterByPeriod(priceHistory, period), [priceHistory, period]);

  const dividendYieldDisplay =
    fundamentals?.dividendYield != null ? `${(Number(fundamentals.dividendYield) * 100).toFixed(2)}%` : "Unavailable";
  const peRatioDisplay = fundamentals?.peRatio != null ? `${Number(fundamentals.peRatio).toFixed(2)}x` : "Unavailable";

  return (
    <section className="rounded-lg border border-border bg-background-elevated p-4 sm:p-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-title font-semibold">Analytics</h2>
        <div className="flex flex-wrap gap-1 rounded-md border border-border p-1" role="group" aria-label="Price chart period">
          {PERIODS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setPeriod(option)}
              aria-pressed={period === option}
              className={`rounded px-2.5 py-1 text-caption font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                period === option ? "bg-background-inset text-foreground" : "text-foreground-muted hover:text-foreground"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {period === "1D" ? (
        <p className="mb-2 text-caption text-foreground-subtle">
          Last close vs. prior close — intraday data not available in this app.
        </p>
      ) : limited ? (
        <p className="mb-2 text-caption text-foreground-subtle">Limited history available for this period.</p>
      ) : null}

      <LineChart
        data={points}
        emptyMessage="No price history recorded yet — run the daily-close job to record the first close."
        singlePointHint="check back after the next close for a trend line."
      />

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat label={statLabel("Market Cap", glossaryTerms)} value={fundamentals?.marketCap ? formatMarketCap(fundamentals.marketCap) : "Unavailable"} />
        <Stat
          label="52-Week High"
          value={fundamentals?.week52High != null ? formatCurrency(fundamentals.week52High) : "Unavailable"}
        />
        <Stat
          label="52-Week Low"
          value={fundamentals?.week52Low != null ? formatCurrency(fundamentals.week52Low) : "Unavailable"}
        />
        <Stat label={statLabel("Dividend Yield", glossaryTerms)} value={dividendYieldDisplay} />
        <Stat label={statLabel("P/E Ratio", glossaryTerms)} value={peRatioDisplay} />
        <Stat
          label="Analyst Target Price"
          value={fundamentals?.analystTargetPrice != null ? formatCurrency(fundamentals.analystTargetPrice) : "Unavailable"}
        />
      </div>

      <div className="mt-6">
        <h3 className="mb-2 text-body font-semibold">Analyst ratings</h3>
        <AnalystRatings fundamentals={fundamentals} />
      </div>

      <p className="mt-4 text-caption text-foreground-subtle">
        {fundamentals?.updatedAt
          ? `Fundamentals as of ${formatAsOfDate(fundamentals.updatedAt)}.`
          : "Fundamentals unavailable for this security — refreshed weekly where the pricing provider has coverage."}
      </p>
    </section>
  );
}

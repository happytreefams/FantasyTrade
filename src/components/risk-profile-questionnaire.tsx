"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { RiskCategory } from "@prisma/client";

import { AssetAllocationPie, type AllocationSlice } from "@/components/allocation-pie";
import { useToast } from "@/components/toast-provider";
import { formatCurrency } from "@/lib/format";
import type { SuggestedTradesResult } from "@/lib/risk-profile/model-portfolios";
import { RISK_CATEGORY_INFO, RISK_QUESTIONS } from "@/lib/risk-profile/questions";

export type RiskProfileSummary = { score: number; category: RiskCategory; completedAt: string };

type Step = "intro" | "questions" | "results" | "confirm-invest" | "invested";

type InvestedTrade = {
  symbol: string;
  label: string;
  shares: number;
  status: "FILLED" | "REJECTED" | "SKIPPED";
  rejectionReason?: string;
};

const STATUS_STYLE: Record<InvestedTrade["status"], string> = {
  FILLED: "text-positive",
  REJECTED: "text-negative",
  SKIPPED: "text-foreground-muted",
};

/// The risk-tolerance questionnaire and its results/invest flow, as a single
/// client component (mirroring `QuizRunner`'s forward-only, index-based
/// pattern rather than introducing the codebase's first modal/dialog).
/// Used both right after signup (`skipHref` set, so an escape hatch to the
/// dashboard is always visible) and from Settings to view or retake an
/// existing profile (`skipHref` null — there's nothing to skip, the user is
/// already where they'd land).
export function RiskProfileQuestionnaire({
  initialProfile,
  initialSuggestedTrades,
  cashBalance,
  skipHref,
}: {
  initialProfile: RiskProfileSummary | null;
  initialSuggestedTrades: SuggestedTradesResult | null;
  cashBalance: string;
  skipHref: string | null;
}) {
  const router = useRouter();
  const { showToast } = useToast();

  const [step, setStep] = useState<Step>(initialProfile ? "results" : "intro");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [profile, setProfile] = useState<RiskProfileSummary | null>(initialProfile);
  const [suggestedTrades, setSuggestedTrades] = useState<SuggestedTradesResult | null>(initialSuggestedTrades);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [investedTrades, setInvestedTrades] = useState<InvestedTrade[] | null>(null);
  const [totalSpent, setTotalSpent] = useState(0);

  const question = RISK_QUESTIONS[questionIndex];
  const isLastQuestion = questionIndex === RISK_QUESTIONS.length - 1;
  const selected = answers[question?.id ?? ""];

  function startQuestionnaire() {
    setAnswers({});
    setQuestionIndex(0);
    setStep("questions");
  }

  async function handleNext() {
    if (!isLastQuestion) {
      setQuestionIndex((current) => current + 1);
      return;
    }

    setIsSubmitting(true);
    const response = await fetch("/api/risk-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });
    const data = await response.json().catch(() => ({}));
    setIsSubmitting(false);

    if (!response.ok) {
      showToast("error", data.error ?? "Couldn't save your risk profile.");
      return;
    }

    setProfile({
      score: data.riskProfile.score,
      category: data.riskProfile.category,
      completedAt: data.riskProfile.completedAt,
    });
    setSuggestedTrades(data.suggestedTrades);
    setStep("results");
  }

  async function handleInvest() {
    setIsSubmitting(true);
    const response = await fetch("/api/risk-profile/invest", { method: "POST" });
    const data = await response.json().catch(() => ({}));
    setIsSubmitting(false);

    if (!response.ok) {
      showToast("error", data.error ?? "Couldn't place these trades.");
      return;
    }

    const trades: InvestedTrade[] = data.result.trades;
    setInvestedTrades(trades);
    setTotalSpent(data.result.totalSpent);
    setStep("invested");

    const filledCount = trades.filter((t) => t.status === "FILLED").length;
    showToast("success", `Invested according to your plan — ${filledCount} order${filledCount === 1 ? "" : "s"} filled.`);
    router.refresh();
  }

  if (step === "intro") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-background-elevated p-8 text-center">
        <h1 className="text-title font-semibold">What&apos;s your investing risk tolerance?</h1>
        <p className="max-w-md text-body text-foreground-muted">
          {`Answer ${RISK_QUESTIONS.length} quick questions about your goals, timeline, and comfort with market swings. We'll suggest a model portfolio that matches — you decide whether to invest in it.`}
        </p>
        <button
          type="button"
          onClick={startQuestionnaire}
          className="rounded-md bg-accent-solid px-4 py-2 text-body font-medium text-accent-foreground transition-colors hover:bg-accent-solid-hover"
        >
          Start questionnaire
        </button>
        {skipHref ? (
          <Link href={skipHref} className="text-caption text-foreground-muted hover:text-foreground hover:underline">
            Skip for now — I&apos;ll do this later from Settings
          </Link>
        ) : null}
      </div>
    );
  }

  if (step === "questions") {
    return (
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-background-elevated p-6">
        <div className="flex items-center justify-between text-caption text-foreground-muted">
          <span>
            Question {questionIndex + 1} of {RISK_QUESTIONS.length} — {question.dimension}
          </span>
          {skipHref ? (
            <Link href={skipHref} className="hover:text-foreground hover:underline">
              Skip for now
            </Link>
          ) : null}
        </div>

        <h2 className="text-title font-semibold">{question.question}</h2>

        <div className="flex flex-col gap-2" role="radiogroup" aria-label={question.question}>
          {question.options.map((option, optionIndex) => (
            <button
              key={optionIndex}
              type="button"
              role="radio"
              aria-checked={selected === optionIndex}
              onClick={() => setAnswers((current) => ({ ...current, [question.id]: optionIndex }))}
              className={`rounded-md border px-4 py-3 text-left text-body transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                selected === optionIndex
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border hover:border-border-strong hover:bg-background-inset"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleNext}
          disabled={selected === undefined || isSubmitting}
          className="self-start rounded-md bg-accent-solid px-3 py-2 text-body font-medium text-accent-foreground transition-colors hover:bg-accent-solid-hover disabled:opacity-50"
        >
          {isSubmitting ? "Scoring…" : isLastQuestion ? "See my results" : "Next question →"}
        </button>
      </div>
    );
  }

  if (step === "results" && profile && suggestedTrades) {
    const info = RISK_CATEGORY_INFO[profile.category];
    const segments: AllocationSlice[] = suggestedTrades.trades.map((t) => ({ label: t.symbol, percent: t.percent }));
    if (suggestedTrades.cashSleevePercent > 0) {
      segments.push({ label: "Cash", percent: suggestedTrades.cashSleevePercent });
    }
    const cashAmount = Number(cashBalance) * (suggestedTrades.cashSleevePercent / 100);
    const canInvest = suggestedTrades.trades.some((t) => t.shares > 0);

    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-lg border border-border bg-background-elevated p-6">
          <p className="text-caption text-foreground-muted">Your risk profile</p>
          <h1 className="text-hero font-semibold">{info.label}</h1>
          <p className="mt-1 text-body text-foreground-muted">{info.description}</p>
        </div>

        <div className="rounded-lg border border-border bg-background-elevated p-6">
          <h2 className="mb-4 text-title font-semibold">Suggested portfolio</h2>
          <AssetAllocationPie segments={segments} />

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-body">
              <thead>
                <tr className="border-b border-border text-left text-caption text-foreground-muted">
                  <th className="pb-2 font-medium">Holding</th>
                  <th className="pb-2 font-medium">Allocation</th>
                  <th className="pb-2 text-right font-medium">Target amount</th>
                  <th className="pb-2 text-right font-medium">Est. shares</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {suggestedTrades.trades.map((trade) => (
                  <tr key={trade.symbol}>
                    <td className="py-2">
                      <span className="font-medium">{trade.symbol}</span>{" "}
                      <span className="text-caption text-foreground-muted">{trade.label}</span>
                    </td>
                    <td className="py-2">{trade.percent}%</td>
                    <td className="py-2 text-right font-financial">{formatCurrency(trade.targetAmount)}</td>
                    <td className="py-2 text-right font-financial">{trade.shares}</td>
                  </tr>
                ))}
                {suggestedTrades.cashSleevePercent > 0 ? (
                  <tr>
                    <td className="py-2 font-medium">Cash</td>
                    <td className="py-2">{suggestedTrades.cashSleevePercent}%</td>
                    <td className="py-2 text-right font-financial">{formatCurrency(cashAmount)}</td>
                    <td className="py-2 text-right font-financial">—</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-caption text-foreground-muted">
            Based on your current cash balance of {formatCurrency(cashBalance)}. Orders can only be placed in whole
            shares, so {formatCurrency(suggestedTrades.leftoverCash)} would be left as cash after rounding.
          </p>
        </div>

        <p className="rounded-md bg-background-inset px-4 py-3 text-caption text-foreground-muted">
          This is a simplified educational tool for illustrating how risk tolerance maps to asset allocation — it is
          not personalized financial advice.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setStep("confirm-invest")}
            disabled={!canInvest}
            className="rounded-md bg-accent-solid px-4 py-2 text-body font-medium text-accent-foreground transition-colors hover:bg-accent-solid-hover disabled:opacity-50"
            title={canInvest ? undefined : "Not enough cash available to buy even one share of any holding."}
          >
            Invest according to this plan
          </button>
          <button
            type="button"
            onClick={startQuestionnaire}
            className="rounded-md border border-border px-4 py-2 text-body font-medium text-foreground transition-colors hover:border-border-strong hover:bg-background-inset"
          >
            Retake questionnaire
          </button>
          {skipHref ? (
            <Link
              href={skipHref}
              className="rounded-md px-4 py-2 text-body font-medium text-accent hover:underline"
            >
              Go to dashboard
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  if (step === "confirm-invest" && suggestedTrades) {
    const activeTrades = suggestedTrades.trades.filter((t) => t.shares > 0);

    return (
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-background-elevated p-6">
        <h2 className="text-title font-semibold">Confirm your investment</h2>
        <p className="text-body text-foreground-muted">
          This will place {activeTrades.length} market buy order{activeTrades.length === 1 ? "" : "s"} totaling{" "}
          <span className="font-financial font-medium text-foreground">{formatCurrency(suggestedTrades.totalEstimatedCost)}</span>{" "}
          using your available cash. These are real trades in the simulator and can&apos;t be undone with a single click.
        </p>

        <ul className="flex flex-col gap-1.5 rounded-md border border-border p-3 text-body">
          {activeTrades.map((trade) => (
            <li key={trade.symbol} className="flex items-center justify-between">
              <span>
                Buy {trade.shares} share{trade.shares === 1 ? "" : "s"} of <span className="font-medium">{trade.symbol}</span>
              </span>
              <span className="font-financial text-foreground-muted">{formatCurrency(trade.estimatedCost)}</span>
            </li>
          ))}
        </ul>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleInvest}
            disabled={isSubmitting}
            className="rounded-md bg-accent-solid px-4 py-2 text-body font-medium text-accent-foreground transition-colors hover:bg-accent-solid-hover disabled:opacity-50"
          >
            {isSubmitting ? "Placing orders…" : "Confirm and invest"}
          </button>
          <button
            type="button"
            onClick={() => setStep("results")}
            disabled={isSubmitting}
            className="rounded-md border border-border px-4 py-2 text-body font-medium text-foreground transition-colors hover:border-border-strong hover:bg-background-inset"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (step === "invested" && investedTrades) {
    return (
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-background-elevated p-6">
        <h2 className="text-title font-semibold">Invested according to your plan</h2>
        <p className="text-body text-foreground-muted">
          Total spent: <span className="font-financial font-medium text-foreground">{formatCurrency(totalSpent)}</span>
        </p>

        <ul className="flex flex-col gap-1.5 rounded-md border border-border p-3 text-body">
          {investedTrades.map((trade) => (
            <li key={trade.symbol} className="flex items-center justify-between">
              <span>
                {trade.symbol} — {trade.shares} share{trade.shares === 1 ? "" : "s"}
              </span>
              <span className={`text-caption font-medium ${STATUS_STYLE[trade.status]}`}>
                {trade.status === "FILLED" ? "Filled" : trade.status === "SKIPPED" ? "Skipped (too small)" : `Rejected — ${trade.rejectionReason ?? ""}`}
              </span>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/portfolio"
            className="rounded-md bg-accent-solid px-4 py-2 text-body font-medium text-accent-foreground transition-colors hover:bg-accent-solid-hover"
          >
            View portfolio
          </Link>
          {skipHref ? (
            <Link href={skipHref} className="rounded-md px-4 py-2 text-body font-medium text-accent hover:underline">
              Go to dashboard
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  return null;
}

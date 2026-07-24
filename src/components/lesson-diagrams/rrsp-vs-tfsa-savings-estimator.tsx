"use client";

import { useState } from "react";

import { formatCurrency } from "@/lib/format";

const MIN_CONTRIBUTION = 500;
const MAX_CONTRIBUTION = 15000;
const CONTRIBUTION_STEP = 500;
const DEFAULT_CONTRIBUTION = 5000;

const MIN_TAX_RATE = 20;
const MAX_TAX_RATE = 53;
const DEFAULT_TAX_RATE = 30;

/// Fixed illustrative growth assumption, matching `CompoundGrowthChart`'s
/// defaults elsewhere in this course library — not user-adjustable, since
/// this calculator's two sliders are about the RRSP/TFSA trade-off, not
/// projecting investment returns.
const ANNUAL_RETURN_PERCENT = 7;
const YEARS = 20;

function Slider({
  label,
  value,
  min,
  max,
  step,
  formatValue,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  formatValue: (value: number) => string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-caption text-foreground-muted">
      <span className="flex items-center justify-between">
        <span>{label}</span>
        <span className="font-financial font-semibold text-foreground">{formatValue(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ accentColor: "var(--color-accent)" }}
        className="w-full"
      />
    </label>
  );
}

/// An illustrative, educational-only calculator: given a hypothetical
/// contribution amount and marginal tax rate (both user-adjustable sliders,
/// never real tax data), it shows the RRSP's tax refund today against the
/// TFSA's tax-free growth later. Everything is computed client-side from
/// the two slider values — nothing is sent anywhere, stored, or requires
/// any real personal or financial information to use.
export function RRSPvsTFSASavingsEstimator() {
  const [contribution, setContribution] = useState(DEFAULT_CONTRIBUTION);
  const [taxRatePercent, setTaxRatePercent] = useState(DEFAULT_TAX_RATE);

  const taxRate = taxRatePercent / 100;
  const growthMultiple = Math.pow(1 + ANNUAL_RETURN_PERCENT / 100, YEARS);

  /// `contribution` is pre-tax dollars available to set aside this year.
  /// The RRSP can invest all of it (that's the deduction) and refunds the
  /// tax back separately. A TFSA can't accept pre-tax dollars — that same
  /// income has to be taxed first, so only the after-tax remainder is
  /// actually available to contribute. Modeling it this way (rather than
  /// investing the same nominal figure in both) is what makes the two
  /// come out mathematically equal when the tax rate doesn't change.
  const rrspRefundNow = contribution * taxRate;
  const rrspFutureValueAfterTax = contribution * growthMultiple * (1 - taxRate);

  const tfsaContribution = contribution * (1 - taxRate);
  const tfsaFutureValueTaxFree = tfsaContribution * growthMultiple;

  return (
    <div className="rounded-lg border border-border bg-background-inset p-4">
      <p className="mb-3 text-caption font-semibold tracking-wide text-accent uppercase">
        Educational estimate — not tax advice
      </p>

      <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
        <Slider
          label="Hypothetical contribution"
          value={contribution}
          min={MIN_CONTRIBUTION}
          max={MAX_CONTRIBUTION}
          step={CONTRIBUTION_STEP}
          formatValue={formatCurrency}
          onChange={setContribution}
        />
        <Slider
          label="Assumed marginal tax rate"
          value={taxRatePercent}
          min={MIN_TAX_RATE}
          max={MAX_TAX_RATE}
          step={1}
          formatValue={(value) => `${value}%`}
          onChange={setTaxRatePercent}
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-md border border-border bg-background-elevated p-4">
          <p className="text-caption font-semibold text-foreground">RRSP</p>
          <p className="mt-2 text-caption text-foreground-muted">Amount invested (pre-tax, fully deductible)</p>
          <p className="font-financial text-body font-semibold text-foreground">{formatCurrency(contribution)}</p>
          <p className="mt-3 text-caption text-foreground-muted">Tax refund this year</p>
          <p className="font-financial text-title font-semibold text-positive">{formatCurrency(rrspRefundNow)}</p>
          <p className="mt-3 text-caption text-foreground-muted">Estimated value in {YEARS} years (after tax on withdrawal)</p>
          <p className="font-financial text-body font-semibold text-foreground">{formatCurrency(rrspFutureValueAfterTax)}</p>
        </div>

        <div className="rounded-md border border-border bg-background-elevated p-4">
          <p className="text-caption font-semibold text-foreground">TFSA</p>
          <p className="mt-2 text-caption text-foreground-muted">Amount invested (same income, taxed first)</p>
          <p className="font-financial text-body font-semibold text-foreground">{formatCurrency(tfsaContribution)}</p>
          <p className="mt-3 text-caption text-foreground-muted">Tax refund this year</p>
          <p className="font-financial text-title font-semibold text-foreground-subtle">{formatCurrency(0)}</p>
          <p className="mt-3 text-caption text-foreground-muted">Estimated value in {YEARS} years (completely tax-free)</p>
          <p className="font-financial text-body font-semibold text-foreground">{formatCurrency(tfsaFutureValueTaxFree)}</p>
        </div>
      </div>

      <p className="mt-4 text-caption text-foreground-subtle">
        Both start from the same {formatCurrency(contribution)} of pre-tax income — the RRSP invests all of it and
        refunds the tax separately, while the TFSA can only invest what&apos;s left after tax comes off first. Assumes a{" "}
        {ANNUAL_RETURN_PERCENT}% annual return over {YEARS} years and the same tax rate now and at withdrawal — under
        that assumption the two come out equal, which is the point: RRSP vs. TFSA mostly comes down to whether you
        expect your tax rate to be higher or lower later, plus how much flexibility you want to withdraw early. This
        is a simplified illustration, not a projection of your actual taxes or returns.
      </p>
    </div>
  );
}

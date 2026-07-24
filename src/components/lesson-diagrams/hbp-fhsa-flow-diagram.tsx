import { FHSA, HBP } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";

function Box({ label, sublabel }: { label: string; sublabel?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-md border-2 border-border-strong bg-background-elevated px-4 py-3 text-center">
      <span className="text-caption font-semibold text-foreground">{label}</span>
      {sublabel ? <span className="text-caption text-foreground-muted">{sublabel}</span> : null}
    </div>
  );
}

function Arrow() {
  return (
    <svg width="40" height="24" viewBox="0 0 40 24" aria-hidden="true" className="shrink-0">
      <line x1="2" y1="12" x2="34" y2="12" stroke="var(--color-foreground-subtle)" strokeWidth="2" />
      <path d="M26 5 L34 12 L26 19" fill="none" stroke="var(--color-foreground-subtle)" strokeWidth="2" />
    </svg>
  );
}

/// Two separate paths into the same goal: an RRSP withdrawal via the Home
/// Buyers' Plan (borrowed from your own retirement savings, must be repaid)
/// and an FHSA (money you never have to pay back) both converging on a
/// first home purchase — the point is that they can be combined, not that
/// you have to pick one.
export function HBPFHSAFlowDiagram() {
  return (
    <div className="rounded-lg border border-border bg-background-inset p-4">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-3 gap-y-3">
        <Box label="RRSP" sublabel={`Home Buyers' Plan — withdraw up to ${formatCurrency(HBP.withdrawalLimit)} tax-free, repay over ${HBP.repaymentYears} years`} />
        <Arrow />
        <div className="row-span-2 self-center">
          <Box label="First home purchase" sublabel="Funds from both accounts can be combined" />
        </div>
        <Box label="FHSA" sublabel={`Tax-deductible in, tax-free out — up to ${formatCurrency(FHSA.lifetimeLimit)} lifetime`} />
        <Arrow />
      </div>
      <p className="mt-3 text-caption text-foreground-subtle">
        The HBP lends you your own RRSP money — skip a repayment and it becomes taxable income. The FHSA is money you
        never have to pay back, whether or not you end up buying a home with it.
      </p>
    </div>
  );
}

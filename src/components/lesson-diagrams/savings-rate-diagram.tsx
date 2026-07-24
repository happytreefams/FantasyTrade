import { formatCurrency } from "@/lib/format";

/// The 50/30/20 budgeting guideline as one stacked bar: needs, wants, then
/// savings & debt paydown. Percentages are props (not fixed at 50/30/20) so
/// the same component can also show a lesson example that deviates from the
/// guideline, with `monthlyIncome` optionally converting each slice to a
/// dollar-per-month figure.
export function SavingsRateDiagram({
  needsPercent = 50,
  wantsPercent = 30,
  savingsPercent = 20,
  monthlyIncome,
}: {
  needsPercent?: number;
  wantsPercent?: number;
  savingsPercent?: number;
  monthlyIncome?: number;
}) {
  const segments = [
    { label: "Needs", percent: needsPercent, color: "var(--color-chart-1)" },
    { label: "Wants", percent: wantsPercent, color: "var(--color-chart-2)" },
    { label: "Savings & debt paydown", percent: savingsPercent, color: "var(--color-positive)" },
  ];
  const total = segments.reduce((sum, segment) => sum + segment.percent, 0) || 1;
  const summary = segments.map((segment) => `${segment.label} ${segment.percent}%`).join(", ");

  return (
    <div className="rounded-lg border border-border bg-background-inset p-4">
      <div role="img" aria-label={`Budget split: ${summary}`} className="flex h-8 w-full overflow-hidden rounded-md">
        {segments.map((segment) => (
          <div key={segment.label} style={{ width: `${(segment.percent / total) * 100}%`, backgroundColor: segment.color }} />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-caption">
        {segments.map((segment) => (
          <li key={segment.label} className="flex items-center gap-2">
            <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} />
            <span className="text-foreground-muted">{segment.label}</span>
            <span className="font-financial font-semibold text-foreground">
              {segment.percent}%{monthlyIncome ? ` (${formatCurrency((segment.percent / 100) * monthlyIncome)}/mo)` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

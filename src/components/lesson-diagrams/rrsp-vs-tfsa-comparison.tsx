import { RRSP, TFSA } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";

type Highlight = "RRSP" | "TFSA";

const ROWS: { label: string; rrsp: string; tfsa: string }[] = [
  {
    label: "When you contribute",
    rrsp: "Deducted from taxable income — often a refund at tax time",
    tfsa: "No deduction — contributions are made with after-tax dollars",
  },
  {
    label: "While it grows",
    rrsp: "Tax-deferred — no tax on gains, dividends, or interest while invested",
    tfsa: "Tax-free — no tax on gains, dividends, or interest, ever",
  },
  {
    label: "When you withdraw",
    rrsp: "Fully taxed as regular income in the year you withdraw",
    tfsa: "Completely tax-free — and the room is added back the following year",
  },
  {
    label: "Contribution room",
    rrsp: `${RRSP.contributionPercentOfEarnedIncome}% of earned income, up to ${formatCurrency(RRSP.annualDollarCap)}/year`,
    tfsa: `${formatCurrency(TFSA.annualLimit)}/year, regardless of income`,
  },
];

/// A side-by-side RRSP/TFSA comparison across the three moments that matter
/// for tax treatment (contribute, grow, withdraw) plus how room is
/// calculated. `highlight` emphasizes one column for a lesson that's making
/// a specific point about one account type without hiding the other.
export function RRSPvsTFSAComparison({ highlight }: { highlight?: Highlight }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-background-inset p-4">
      <table className="w-full text-body">
        <thead>
          <tr className="text-left text-caption text-foreground-muted">
            <th className="pb-2 pr-4 font-medium"> </th>
            <th className={`pb-2 pr-4 font-semibold ${highlight === "RRSP" ? "text-accent" : "text-foreground"}`}>RRSP</th>
            <th className={`pb-2 font-semibold ${highlight === "TFSA" ? "text-accent" : "text-foreground"}`}>TFSA</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {ROWS.map((row) => (
            <tr key={row.label}>
              <td className="py-2 pr-4 text-caption font-medium text-foreground-muted">{row.label}</td>
              <td className={`py-2 pr-4 text-caption ${highlight === "RRSP" ? "text-foreground" : "text-foreground-muted"}`}>{row.rrsp}</td>
              <td className={`py-2 text-caption ${highlight === "TFSA" ? "text-foreground" : "text-foreground-muted"}`}>{row.tfsa}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import { PERSONAL_FINANCE_SOURCE_YEAR } from "@/lib/constants";

/// Shown at the top of every lesson in the Personal Finance category —
/// contribution limits and program rules (TFSA, RRSP, FHSA, HBP, RESP)
/// change year to year and can't be pulled live, so every lesson makes that
/// explicit rather than only the constants file that backs the numbers.
export function PersonalFinanceDisclaimerBanner() {
  return (
    <div role="note" className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-body text-foreground">
      <span className="font-semibold">Illustrative figures.</span> Figures shown are illustrative for{" "}
      {PERSONAL_FINANCE_SOURCE_YEAR} and may not reflect current limits — verify with the CRA or a licensed advisor
      before making real financial decisions.
    </div>
  );
}

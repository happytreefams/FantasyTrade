import { RiskProfileQuestionnaire } from "@/components/risk-profile-questionnaire";
import { requireAccount } from "@/lib/current-account";
import { getPortfolioSummary } from "@/lib/portfolio";
import { getRiskProfile, getSuggestedTrades } from "@/lib/risk-profile";

export default async function RiskProfileOnboardingPage() {
  const { account } = await requireAccount();
  const [summary, riskProfile] = await Promise.all([getPortfolioSummary(account.id), getRiskProfile(account.id)]);
  const suggestedTrades = riskProfile ? await getSuggestedTrades(account.id, riskProfile.category) : null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <RiskProfileQuestionnaire
        initialProfile={
          riskProfile
            ? { score: riskProfile.score, category: riskProfile.category, completedAt: riskProfile.completedAt.toISOString() }
            : null
        }
        initialSuggestedTrades={suggestedTrades}
        cashBalance={summary.cashBalance.toString()}
        skipHref="/dashboard"
      />
    </div>
  );
}

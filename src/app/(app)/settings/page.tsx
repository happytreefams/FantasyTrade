import Link from "next/link";

import { BadgeShelf } from "@/components/badge-shelf";
import { JoinGroupForm } from "@/components/join-group-form";
import { LeaderboardSettingsToggle } from "@/components/leaderboard-settings-toggle";
import { MarginSettingsToggle } from "@/components/margin-settings-toggle";
import { RiskProfileQuestionnaire } from "@/components/risk-profile-questionnaire";
import { getBadgeDisplayList } from "@/lib/badges";
import { getCertificates } from "@/lib/certificates";
import { requireAccount } from "@/lib/current-account";
import { formatAsOfDate, formatCurrency } from "@/lib/format";
import { getGroup } from "@/lib/groups";
import { getLeaderboardSettings } from "@/lib/leaderboard";
import { hasCompletedAdvancedTradingEducation, LEARNING_LINKS } from "@/lib/learning";
import { getPortfolioSummary } from "@/lib/portfolio";
import { getRiskProfile, getSuggestedTrades } from "@/lib/risk-profile";

export default async function SettingsPage() {
  const { session, account } = await requireAccount();
  const [summary, riskProfile, hasCompletedEducation, certificates, leaderboardSettings, group, badges] = await Promise.all([
    getPortfolioSummary(account.id),
    getRiskProfile(account.id),
    hasCompletedAdvancedTradingEducation(session.user.id),
    getCertificates(session.user.id),
    getLeaderboardSettings(account.id, session.user.id),
    account.groupId ? getGroup(account.groupId) : Promise.resolve(null),
    getBadgeDisplayList(session.user.id),
  ]);
  const suggestedTrades = riskProfile ? await getSuggestedTrades(account.id, riskProfile.category) : null;
  const advancedTradingLessonHrefs = LEARNING_LINKS.advancedTradingLessons.lessonIds.map((id) => `/learn/lessons/${id}`);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-display font-semibold tracking-tight">Account Settings</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-title font-semibold">Risk Profile</h2>
        <RiskProfileQuestionnaire
          initialProfile={
            riskProfile
              ? { score: riskProfile.score, category: riskProfile.category, completedAt: riskProfile.completedAt.toISOString() }
              : null
          }
          initialSuggestedTrades={suggestedTrades}
          cashBalance={summary.cashBalance.toString()}
          skipHref={null}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-title font-semibold">Short Selling &amp; Margin</h2>
        <MarginSettingsToggle
          hasCompletedEducation={hasCompletedEducation}
          marginEnabled={account.marginEnabled}
          lessonHrefs={advancedTradingLessonHrefs}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-title font-semibold">Classroom</h2>
        {group ? (
          <div className="rounded-lg border border-border bg-background-elevated p-4">
            <p className="text-body font-medium text-foreground">{group.name}</p>
            <p className="text-caption text-foreground-muted">
              Starting cash {formatCurrency(group.startingCash.toString())}
            </p>
          </div>
        ) : (
          <JoinGroupForm />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-title font-semibold">Leaderboard</h2>
        <LeaderboardSettingsToggle
          initialIsPublic={leaderboardSettings.isPublicOnLeaderboard}
          initialDisplayName={leaderboardSettings.displayName}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-title font-semibold">My Badges</h2>
        <BadgeShelf badges={badges} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-title font-semibold">My Certificates</h2>
        {certificates.length === 0 ? (
          <p className="text-body text-foreground-muted">
            Complete every lesson and quiz in a course (or every course in a category) to earn your first certificate.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-background-elevated">
            {certificates.map((certificate) => (
              <li key={certificate.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-body font-medium text-foreground">{certificate.title}</p>
                  <p className="text-caption text-foreground-subtle">
                    {certificate.scope === "CATEGORY" ? "Category" : "Course"} · Issued{" "}
                    {formatAsOfDate(certificate.issuedAt)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-4">
                  <Link href={`/learn/certificates/${certificate.id}`} className="text-caption text-accent hover:underline">
                    View
                  </Link>
                  <a href={`/api/certificates/${certificate.id}/pdf`} download className="text-caption text-accent hover:underline">
                    Download PDF
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

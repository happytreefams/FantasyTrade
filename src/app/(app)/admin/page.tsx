import { redirect } from "next/navigation";

import { AddSecurityForm } from "@/components/admin/add-security-form";
import { BackfillTrigger } from "@/components/admin/backfill-trigger";
import { DailyCloseTrigger } from "@/components/admin/daily-close-trigger";
import { FeatureFlagToggle } from "@/components/admin/feature-flag-toggle";
import { FundamentalsTrigger } from "@/components/admin/fundamentals-trigger";
import { CreateChallengeForm } from "@/components/create-challenge-form";
import { AdminAccessError, listSecurities, listUsers, requireAdmin } from "@/lib/admin";
import { getAllFeatureFlags } from "@/lib/feature-flags";
import { formatAsOfDate, formatCurrency } from "@/lib/format";

export default async function AdminPage() {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AdminAccessError) {
      redirect("/dashboard");
    }
    throw error;
  }

  const [users, securities, flags] = await Promise.all([listUsers(), listSecurities(), getAllFeatureFlags()]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-display font-semibold tracking-tight">Admin</h1>
        <p className="text-body text-foreground-muted">
          Internal tools — not linked from anywhere a non-admin can reach. This is a stub: enough to operate the app
          day to day, not a full back office.
        </p>
      </div>

      <section className="rounded-lg border border-border bg-background-elevated p-6">
        <h2 className="mb-1 text-title font-semibold">Daily close job</h2>
        <p className="mb-4 text-body text-foreground-muted">
          Refreshes closing prices, resolves pending limit orders, and snapshots every account&apos;s value. Runs
          automatically overnight in production; trigger it manually here for testing or to catch up.
        </p>
        <DailyCloseTrigger />
      </section>

      <section className="rounded-lg border border-border bg-background-elevated p-6">
        <h2 className="mb-1 text-title font-semibold">Fundamentals &amp; history</h2>
        <p className="mb-4 text-body text-foreground-muted">
          Market cap, valuation ratios, and analyst ratings refresh weekly (separately from the daily price job,
          since they change slowly) — power each security&apos;s Analytics section. Price history backfill pulls
          full daily-close history for charting further back than the daily job alone provides.
        </p>
        <div className="flex flex-wrap gap-3">
          <FundamentalsTrigger />
          <BackfillTrigger />
        </div>
      </section>

      <section className="rounded-lg border border-border bg-background-elevated p-6">
        <h2 className="mb-1 text-title font-semibold">Feature flags</h2>
        <p className="mb-4 text-body text-foreground-muted">
          Off by default. Flip one on here, then check <code className="text-caption">isFeatureEnabled(key)</code>{" "}
          from <code className="text-caption">@/lib/feature-flags</code> wherever that feature&apos;s code needs to
          gate on it.
        </p>
        <ul className="flex flex-col divide-y divide-border">
          {flags.map((flag) => (
            <li key={flag.key} className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="font-medium text-body">{flag.key}</p>
                <p className="text-caption text-foreground-muted">{flag.description}</p>
              </div>
              <FeatureFlagToggle flagKey={flag.key} initialEnabled={flag.enabled} />
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-border bg-background-elevated p-6">
        <h2 className="mb-1 text-title font-semibold">Open challenges</h2>
        <p className="mb-4 text-body text-foreground-muted">
          Global challenges (visible to every user, not scoped to a classroom). Teachers create classroom-scoped
          challenges from their own group&apos;s roster page instead.
        </p>
        <CreateChallengeForm />
      </section>

      <section className="rounded-lg border border-border bg-background-elevated p-6">
        <h2 className="mb-1 text-title font-semibold">Securities ({securities.length})</h2>
        <p className="mb-4 text-body text-foreground-muted">
          Every tradable security, with its most recent recorded close. Add one below — the next daily-close run
          gives it a price.
        </p>
        <div className="mb-4">
          <AddSecurityForm />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-body">
            <thead>
              <tr className="border-b border-border text-left text-caption text-foreground-muted">
                <th className="py-2 pr-4">Symbol</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Exchange</th>
                <th className="py-2 pr-4">Last close</th>
                <th className="py-2">As of</th>
              </tr>
            </thead>
            <tbody>
              {securities.map((security) => (
                <tr key={security.id} className="border-b border-border last:border-0">
                  <td className="py-2 pr-4 font-medium">{security.symbol}</td>
                  <td className="py-2 pr-4 text-foreground-muted">{security.name}</td>
                  <td className="py-2 pr-4 text-foreground-muted">{security.assetType}</td>
                  <td className="py-2 pr-4 text-foreground-muted">{security.exchange}</td>
                  <td className="py-2 pr-4 font-financial">
                    {security.lastClose ? formatCurrency(security.lastClose.toString()) : "—"}
                  </td>
                  <td className="py-2 text-caption text-foreground-muted">
                    {formatAsOfDate(security.lastCloseDate) ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-background-elevated p-6">
        <h2 className="mb-4 text-title font-semibold">Users ({users.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-body">
            <thead>
              <tr className="border-b border-border text-left text-caption text-foreground-muted">
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Cash balance</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-border last:border-0">
                  <td className="py-2 pr-4 font-medium">{user.email}</td>
                  <td className="py-2 pr-4 text-foreground-muted">{user.name ?? "—"}</td>
                  <td className="py-2 pr-4 font-financial">
                    {user.cashBalance ? formatCurrency(user.cashBalance.toString()) : "—"}
                  </td>
                  <td className="py-2 pr-4 text-foreground-muted">{user.role}</td>
                  <td className="py-2 text-caption text-foreground-muted">{formatAsOfDate(user.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

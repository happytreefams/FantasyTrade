import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { MarginCallBanner } from "@/components/margin-call-banner";
import { auth } from "@/lib/auth";
import { formatAsOfDate } from "@/lib/format";
import { getLatestPricingDate } from "@/lib/market-data";
import { getPortfolioSummary } from "@/lib/portfolio";
import { prisma } from "@/lib/prisma";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const userLabel = session.user.name || session.user.email || "Account";
  const account = await prisma.account.findUniqueOrThrow({ where: { userId: session.user.id } });
  const [summary, pricesAsOf] = await Promise.all([
    getPortfolioSummary(account.id),
    getLatestPricingDate().then(formatAsOfDate),
  ]);

  return (
    <div className="flex min-h-screen flex-1 flex-col md:flex-row">
      <AppSidebar role={session.user.role} />
      <div className="flex flex-1 flex-col">
        <AppHeader
          userLabel={userLabel}
          cashBalance={summary.cashBalance.toString()}
          portfolioValue={summary.totalPortfolioValue.toString()}
          pricesAsOf={pricesAsOf}
        />
        {account.marginCallActive ? <MarginCallBanner /> : null}
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

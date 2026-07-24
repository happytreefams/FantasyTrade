import { TradeTicket } from "@/components/trade-ticket";
import { requireAccount } from "@/lib/current-account";
import { formatAsOfDate } from "@/lib/format";
import { getLatestPricingDate } from "@/lib/market-data";

export default async function TradePage({
  searchParams,
}: {
  searchParams: Promise<{ symbol?: string }>;
}) {
  const { account } = await requireAccount();
  const pricesAsOf = formatAsOfDate(await getLatestPricingDate());
  const { symbol } = await searchParams;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-display font-semibold tracking-tight">Trade</h1>
      <TradeTicket cashBalance={account.cashBalance.toString()} pricesAsOf={pricesAsOf} initialSymbol={symbol} />
    </div>
  );
}

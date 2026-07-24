"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useToast } from "@/components/toast-provider";
import { formatCurrency, formatPercent, formatShares } from "@/lib/format";

export type PositionRow = {
  id: string;
  securityId: string;
  symbol: string;
  name: string;
  assetType: "STOCK" | "ETF" | "BOND" | "COMMODITY" | "CRYPTO";
  quantity: string;
  avgCostBasis: string;
  dripEnabled: boolean;
  lastClose: string | null;
  marketValue: string;
  unrealizedGain: string;
  unrealizedGainPercent: string;
};

const ASSET_TYPE_TABS = [
  { value: "ALL", label: "All" },
  { value: "STOCK", label: "Stocks" },
  { value: "ETF", label: "ETFs" },
  { value: "BOND", label: "Bonds" },
  { value: "COMMODITY", label: "Commodities" },
  { value: "CRYPTO", label: "Crypto" },
] as const;

type AssetTypeTab = (typeof ASSET_TYPE_TABS)[number]["value"];

export function PositionsTable({ positions }: { positions: PositionRow[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [filter, setFilter] = useState<AssetTypeTab>("ALL");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const visible = filter === "ALL" ? positions : positions.filter((position) => position.assetType === filter);

  async function toggleDrip(position: PositionRow) {
    setTogglingId(position.id);
    const response = await fetch("/api/portfolio/positions/drip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ securityId: position.securityId, enabled: !position.dripEnabled }),
    });
    const data = await response.json().catch(() => ({}));
    setTogglingId(null);

    if (!response.ok) {
      showToast("error", data.error ?? "Couldn't update dividend reinvestment.");
      return;
    }

    showToast(
      "success",
      data.dripEnabled
        ? `Dividend reinvestment enabled for ${position.symbol} — future dividends buy more shares instead of sitting as cash.`
        : `Dividend reinvestment disabled for ${position.symbol}.`,
    );
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 border-b border-border px-4 py-3">
        {ASSET_TYPE_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setFilter(tab.value)}
            aria-pressed={filter === tab.value}
            className={`rounded-full border px-3 py-1 text-caption transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              filter === tab.value
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-foreground-muted hover:border-border-strong hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="p-4 text-body text-foreground-muted">
          {positions.length === 0
            ? "You don't hold any positions yet. Head to Trade to buy your first share."
            : "No positions in this category."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-body">
            <thead>
              <tr className="text-caption text-foreground-muted">
                <th className="px-4 py-2 text-left">Symbol</th>
                <th className="px-4 py-2 text-right">Quantity</th>
                <th className="px-4 py-2 text-right">Avg cost</th>
                <th className="px-4 py-2 text-right">Last close</th>
                <th className="px-4 py-2 text-right">Market value</th>
                <th className="px-4 py-2 text-right">Gain/loss</th>
                <th className="px-4 py-2 text-left">DRIP</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((position) => {
                const isGain = Number(position.unrealizedGain) >= 0;
                const isShort = Number(position.quantity) < 0;
                return (
                  <tr key={position.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/security/${encodeURIComponent(position.symbol)}`}
                          className="font-medium hover:text-accent hover:underline"
                        >
                          {position.symbol}
                        </Link>
                        {isShort ? (
                          <span className="rounded bg-negative-bg px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-negative uppercase">
                            Short
                          </span>
                        ) : null}
                      </div>
                      <div className="text-caption text-foreground-muted">{position.name}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-financial">{formatShares(position.quantity)}</td>
                    <td className="px-4 py-3 text-right font-financial">{formatCurrency(position.avgCostBasis)}</td>
                    <td className="px-4 py-3 text-right font-financial">
                      {position.lastClose ? formatCurrency(position.lastClose) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-financial">{formatCurrency(position.marketValue)}</td>
                    <td
                      className={`px-4 py-3 text-right font-financial ${isGain ? "text-positive" : "text-negative"}`}
                    >
                      {formatCurrency(position.unrealizedGain)} ({formatPercent(position.unrealizedGainPercent)})
                    </td>
                    <td className="px-4 py-3">
                      {isShort ? (
                        <span className="text-caption text-foreground-subtle">—</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleDrip(position)}
                          disabled={togglingId === position.id}
                          aria-pressed={position.dripEnabled}
                          title="Reinvest this security's dividends into more shares automatically"
                          className={`rounded-full border px-2.5 py-1 text-caption font-medium transition-colors disabled:opacity-50 ${
                            position.dripEnabled
                              ? "border-accent bg-accent/10 text-accent"
                              : "border-border text-foreground-muted hover:border-border-strong hover:text-foreground"
                          }`}
                        >
                          {togglingId === position.id ? "…" : position.dripEnabled ? "On" : "Off"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

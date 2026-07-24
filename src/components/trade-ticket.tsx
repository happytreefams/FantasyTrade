"use client";

import { useEffect, useState } from "react";

import { OrderForm } from "@/components/order-form";
import { StarButton } from "@/components/star-button";
import { formatCurrency } from "@/lib/format";

type SecurityResult = {
  id: string;
  symbol: string;
  name: string;
  assetType: "STOCK" | "ETF" | "BOND" | "COMMODITY" | "CRYPTO";
  exchange: string;
  lastClose: string | null;
  isWatched: boolean;
};

const ASSET_TYPE_FILTERS = [
  { value: "ALL", label: "All" },
  { value: "STOCK", label: "Stocks" },
  { value: "ETF", label: "ETFs" },
  { value: "BOND", label: "Bonds" },
  { value: "COMMODITY", label: "Commodities" },
  { value: "CRYPTO", label: "Crypto" },
] as const;

type AssetTypeFilter = (typeof ASSET_TYPE_FILTERS)[number]["value"];

export function TradeTicket({
  cashBalance,
  pricesAsOf,
  initialSymbol,
}: {
  cashBalance: string;
  pricesAsOf: string | null;
  initialSymbol?: string;
}) {
  const [query, setQuery] = useState(initialSymbol ?? "");
  const [assetTypeFilter, setAssetTypeFilter] = useState<AssetTypeFilter>("ALL");
  const [results, setResults] = useState<SecurityResult[]>([]);
  const [selected, setSelected] = useState<SecurityResult | null>(null);

  const hasQuery = query.trim().length > 0;
  const browsing = hasQuery || assetTypeFilter !== "ALL";

  useEffect(() => {
    if (selected || !browsing) {
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set("q", query.trim());
        if (assetTypeFilter !== "ALL") params.set("type", assetTypeFilter);

        const response = await fetch(`/api/securities/search?${params.toString()}`, {
          signal: controller.signal,
        });
        if (response.ok) setResults(await response.json());
      } catch {
        // request was superseded or aborted — ignore
      }
    }, 250);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query, selected, assetTypeFilter, browsing]);

  const visibleResults = selected || !browsing ? [] : results;

  function selectSecurity(security: SecurityResult) {
    setSelected(security);
    setResults([]);
    setQuery("");
  }

  function selectAssetTypeFilter(value: AssetTypeFilter) {
    setAssetTypeFilter(value);
    setSelected(null);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="rounded-lg border border-border bg-background-elevated p-6">
        <div className="mb-3 flex flex-wrap gap-2">
          {ASSET_TYPE_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => selectAssetTypeFilter(filter.value)}
              aria-pressed={assetTypeFilter === filter.value}
              className={`rounded-full border px-3 py-1 text-caption transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                assetTypeFilter === filter.value
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-foreground-muted hover:border-border-strong hover:text-foreground"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <label htmlFor="trade-search" className="flex flex-col gap-1.5 text-caption text-foreground-muted">
          Symbol or company name
          <input
            id="trade-search"
            type="text"
            value={selected ? `${selected.symbol} — ${selected.name}` : query}
            onChange={(event) => {
              setSelected(null);
              setQuery(event.target.value);
            }}
            placeholder="e.g. AAPL or Apple"
            className="rounded-md border border-border bg-background-inset px-3 py-2 text-body text-foreground outline-none focus:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
        </label>

        {visibleResults.length > 0 ? (
          <ul className="mt-2 max-h-80 divide-y divide-border overflow-y-auto rounded-md border border-border">
            {visibleResults.map((result) => (
              <li key={result.id} className="flex items-center gap-1 pr-2">
                <button
                  type="button"
                  onClick={() => selectSecurity(result)}
                  className="flex flex-1 items-center justify-between px-3 py-2 text-left text-body hover:bg-background-inset"
                >
                  <span>
                    <span className="font-medium">{result.symbol}</span>{" "}
                    <span className="text-foreground-muted">{result.name}</span>
                  </span>
                  {result.lastClose ? (
                    <span className="font-financial text-foreground-muted">{formatCurrency(result.lastClose)}</span>
                  ) : null}
                </button>
                <StarButton securityId={result.id} symbol={result.symbol} initialWatched={result.isWatched} size="sm" />
              </li>
            ))}
          </ul>
        ) : null}

        {!selected && browsing && results.length === 0 ? (
          <p className="mt-2 text-caption text-foreground-muted">No matching securities.</p>
        ) : null}
      </div>

      <OrderForm security={selected} cashBalance={cashBalance} pricesAsOf={pricesAsOf} />
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type SecurityResult = { id: string; symbol: string; name: string };

export function QuickTradeCard() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SecurityResult[]>([]);

  useEffect(() => {
    if (!query.trim()) {
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(`/api/securities/search?q=${encodeURIComponent(query)}`, {
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
  }, [query]);

  const visibleResults = query.trim() ? results : [];

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-background-elevated p-6">
      <h2 className="text-title font-semibold">Quick trade</h2>
      <label htmlFor="quick-trade-search" className="flex flex-col gap-1.5 text-caption text-foreground-muted">
        Jump to a symbol
        <input
          id="quick-trade-search"
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="e.g. AAPL"
          className="rounded-md border border-border bg-background-inset px-3 py-2 text-body text-foreground outline-none focus:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
      </label>

      {visibleResults.length > 0 ? (
        <ul className="divide-y divide-border overflow-hidden rounded-md border border-border">
          {visibleResults.map((result) => (
            <li key={result.id}>
              <button
                type="button"
                onClick={() => router.push(`/trade?symbol=${encodeURIComponent(result.symbol)}`)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-body hover:bg-background-inset"
              >
                <span>
                  <span className="font-medium">{result.symbol}</span>{" "}
                  <span className="text-foreground-muted">{result.name}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <Link href="/trade" className="text-center text-caption text-accent hover:underline">
        Or open the full trade ticket →
      </Link>
    </div>
  );
}

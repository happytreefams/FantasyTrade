"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/toast-provider";

const ASSET_TYPES = ["STOCK", "ETF", "BOND", "COMMODITY", "CRYPTO"] as const;

export function AddSecurityForm() {
  const router = useRouter();
  const { showToast } = useToast();
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [assetType, setAssetType] = useState<(typeof ASSET_TYPES)[number]>("STOCK");
  const [exchange, setExchange] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    const response = await fetch("/api/admin/securities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol, name, assetType, exchange }),
    });

    const data = await response.json().catch(() => ({}));
    setIsSubmitting(false);

    if (!response.ok) {
      showToast("error", data.error ?? "Couldn't add security.");
      return;
    }

    const historyNote =
      data.historyDaysBackfilled > 0
        ? `Backfilled ${data.historyDaysBackfilled} days of price history.`
        : "No price history available from the provider yet — it'll get a price on the next daily-close run.";
    showToast("success", `Added ${data.security.symbol}. ${historyNote}`);
    setSymbol("");
    setName("");
    setExchange("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-caption text-foreground-muted">
        Symbol
        <input
          value={symbol}
          onChange={(event) => setSymbol(event.target.value)}
          required
          maxLength={10}
          className="w-28 rounded-md border border-border bg-background-inset px-3 py-1.5 text-body text-foreground outline-none focus:border-accent"
          placeholder="TICK"
        />
      </label>

      <label className="flex flex-col gap-1 text-caption text-foreground-muted">
        Name
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          className="w-48 rounded-md border border-border bg-background-inset px-3 py-1.5 text-body text-foreground outline-none focus:border-accent"
          placeholder="Company or fund name"
        />
      </label>

      <label className="flex flex-col gap-1 text-caption text-foreground-muted">
        Asset type
        <select
          value={assetType}
          onChange={(event) => setAssetType(event.target.value as (typeof ASSET_TYPES)[number])}
          className="rounded-md border border-border bg-background-inset px-3 py-1.5 text-body text-foreground outline-none focus:border-accent"
        >
          {ASSET_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-caption text-foreground-muted">
        Exchange
        <input
          value={exchange}
          onChange={(event) => setExchange(event.target.value)}
          required
          className="w-32 rounded-md border border-border bg-background-inset px-3 py-1.5 text-body text-foreground outline-none focus:border-accent"
          placeholder="NASDAQ"
        />
      </label>

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-md bg-accent-solid px-3 py-1.5 text-body font-medium text-accent-foreground transition-colors hover:bg-accent-solid-hover disabled:opacity-50"
      >
        {isSubmitting ? "Adding…" : "Add security"}
      </button>
    </form>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/toast-provider";

/// Manually fires the overnight valuation job from the browser — the same
/// three-step routine (`@/lib/daily-close`) the nightly CLI script runs.
/// Useful in a demo/local-dev setting where there's no real cron.
export function DailyCloseTrigger() {
  const router = useRouter();
  const { showToast } = useToast();
  const [isRunning, setIsRunning] = useState(false);

  async function handleClick() {
    setIsRunning(true);
    const response = await fetch("/api/admin/daily-close", { method: "POST" });
    const data = await response.json().catch(() => ({}));
    setIsRunning(false);

    if (!response.ok) {
      showToast("error", data.error ?? "Daily close job failed.");
      return;
    }

    const { priceUpdate, pendingOrders, dividends, marginMaintenance, accountsSnapshotted } = data.summary;
    showToast(
      "success",
      `Daily close complete: ${priceUpdate.fetchedFromApi.length} live prices, ${priceUpdate.synthetic.length} synthetic, ${pendingOrders.filled.length} pending orders filled, ${dividends.paid.length} dividends posted, ${marginMaintenance.flagged.length} margin call(s) flagged, ${accountsSnapshotted} account(s) snapshotted.`,
    );
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isRunning}
      className="rounded-md bg-accent-solid px-3 py-2 text-body font-medium text-accent-foreground transition-colors hover:bg-accent-solid-hover disabled:opacity-50"
    >
      {isRunning ? "Running daily close…" : "Run daily close now"}
    </button>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/toast-provider";

/// Manually fires the weekly fundamentals refresh from the browser — the
/// same routine (`updateAllFundamentals`) the `job:weekly-fundamentals` CLI
/// script runs.
export function FundamentalsTrigger() {
  const router = useRouter();
  const { showToast } = useToast();
  const [isRunning, setIsRunning] = useState(false);

  async function handleClick() {
    setIsRunning(true);
    const response = await fetch("/api/admin/weekly-fundamentals", { method: "POST" });
    const data = await response.json().catch(() => ({}));
    setIsRunning(false);

    if (!response.ok) {
      showToast("error", data.error ?? "Fundamentals refresh failed.");
      return;
    }

    const { updated, unavailable } = data.summary;
    showToast("success", `Fundamentals refreshed: ${updated.length} updated, ${unavailable.length} unavailable.`);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isRunning}
      className="rounded-md bg-accent-solid px-3 py-2 text-body font-medium text-accent-foreground transition-colors hover:bg-accent-solid-hover disabled:opacity-50"
    >
      {isRunning ? "Refreshing fundamentals…" : "Refresh fundamentals now"}
    </button>
  );
}

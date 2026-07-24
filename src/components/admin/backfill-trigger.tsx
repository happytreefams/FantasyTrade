"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/toast-provider";

/// Manually fires a bulk price-history backfill from the browser — for
/// catching up securities that predate the backfill feature. New securities
/// added via the form above get backfilled automatically.
export function BackfillTrigger() {
  const router = useRouter();
  const { showToast } = useToast();
  const [isRunning, setIsRunning] = useState(false);

  async function handleClick() {
    setIsRunning(true);
    const response = await fetch("/api/admin/backfill-history", { method: "POST" });
    const data = await response.json().catch(() => ({}));
    setIsRunning(false);

    if (!response.ok) {
      showToast("error", data.error ?? "Backfill failed.");
      return;
    }

    const { backfilled, unavailable } = data.summary;
    showToast("success", `History backfilled: ${backfilled.length} securities, ${unavailable.length} unavailable.`);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isRunning}
      className="rounded-md border border-border px-3 py-2 text-body font-medium text-foreground transition-colors hover:bg-background-inset disabled:opacity-50"
    >
      {isRunning ? "Backfilling history…" : "Backfill all price history"}
    </button>
  );
}

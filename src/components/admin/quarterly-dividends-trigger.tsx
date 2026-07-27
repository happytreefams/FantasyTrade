"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/toast-provider";

/// Manually fires the quarterly dividend check from the browser — the same
/// routine `/api/cron/quarterly-dividends` runs on Vercel's schedule.
export function QuarterlyDividendsTrigger() {
  const router = useRouter();
  const { showToast } = useToast();
  const [isRunning, setIsRunning] = useState(false);

  async function handleClick() {
    setIsRunning(true);
    const response = await fetch("/api/admin/quarterly-dividends", { method: "POST" });
    const data = await response.json().catch(() => ({}));
    setIsRunning(false);

    if (!response.ok) {
      showToast("error", data.error ?? "Quarterly dividend check failed.");
      return;
    }

    const { paid } = data.summary;
    showToast("success", `Dividend check complete: ${paid.length} dividend(s) posted.`);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isRunning}
      className="rounded-md bg-accent-solid px-3 py-2 text-body font-medium text-accent-foreground transition-colors hover:bg-accent-solid-hover disabled:opacity-50"
    >
      {isRunning ? "Checking dividends…" : "Run dividend check now"}
    </button>
  );
}

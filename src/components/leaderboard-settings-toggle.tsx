"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useToast } from "@/components/toast-provider";

export function LeaderboardSettingsToggle({
  initialIsPublic,
  initialDisplayName,
}: {
  initialIsPublic: boolean;
  initialDisplayName: string | null;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [displayName, setDisplayName] = useState(initialDisplayName ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function save(nextIsPublic: boolean) {
    if (nextIsPublic && !displayName.trim()) {
      showToast("error", "Set a display name before opting in — it's what other traders will see.");
      return;
    }

    setIsSubmitting(true);
    const response = await fetch("/api/leaderboard/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublicOnLeaderboard: nextIsPublic, displayName: displayName.trim() || null }),
    });
    const data = await response.json().catch(() => ({}));
    setIsSubmitting(false);

    if (!response.ok) {
      showToast("error", data.error ?? "Couldn't update leaderboard settings.");
      return;
    }

    setIsPublic(nextIsPublic);
    showToast("success", nextIsPublic ? "You're now visible on the public leaderboard." : "Removed from the public leaderboard.");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-background-elevated p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-body font-medium text-foreground">Public leaderboard</p>
          <p className="text-caption text-foreground-muted">
            Off by default. Portfolio performance is sensitive — turning this on shows only your display name (never
            your email or real name) alongside your % return.
          </p>
        </div>
        <button
          type="button"
          onClick={() => save(!isPublic)}
          disabled={isSubmitting}
          className={`shrink-0 rounded-md border px-3 py-1.5 text-caption font-medium transition-colors disabled:opacity-50 ${
            isPublic
              ? "border-border text-foreground-muted hover:border-negative hover:text-negative"
              : "border-border text-foreground hover:border-border-strong"
          }`}
        >
          {isPublic ? "Turn off" : "Turn on"}
        </button>
      </div>

      <label className="flex flex-col gap-1.5 text-caption text-foreground-muted">
        Display name
        <input
          type="text"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          onBlur={() => {
            if (isPublic) save(true);
          }}
          placeholder="e.g. TradeWithTaylor"
          maxLength={40}
          className="rounded-md border border-border bg-background-inset px-3 py-2 text-body text-foreground outline-none focus:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
      </label>
    </div>
  );
}

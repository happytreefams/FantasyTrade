"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useToast } from "@/components/toast-provider";

export function StarButton({
  securityId,
  symbol,
  initialWatched,
  size = "md",
}: {
  securityId: string;
  symbol: string;
  initialWatched: boolean;
  size?: "sm" | "md";
}) {
  const { showToast } = useToast();
  const router = useRouter();
  const [watched, setWatched] = useState(initialWatched);
  const [isPending, setIsPending] = useState(false);

  async function toggle(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (isPending) return;

    const nextWatched = !watched;
    setIsPending(true);
    setWatched(nextWatched);

    const response = await fetch("/api/watchlist", {
      method: nextWatched ? "POST" : "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ securityId }),
    });

    setIsPending(false);

    if (!response.ok) {
      setWatched(watched);
      showToast("error", "Couldn't update your watchlist. Please try again.");
      return;
    }

    showToast("success", nextWatched ? `Added ${symbol} to your watchlist.` : `Removed ${symbol} from your watchlist.`);
    router.refresh();
  }

  const sizeClass = size === "sm" ? "h-6 w-6 text-body" : "h-8 w-8 text-title";

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      aria-pressed={watched}
      aria-label={watched ? `Remove ${symbol} from watchlist` : `Add ${symbol} to watchlist`}
      title={watched ? "Remove from watchlist" : "Add to watchlist"}
      className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-md leading-none transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50 ${
        watched ? "text-warning" : "text-foreground-subtle hover:text-foreground-muted"
      }`}
    >
      <span aria-hidden="true">{watched ? "★" : "☆"}</span>
    </button>
  );
}

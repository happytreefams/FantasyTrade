"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useToast } from "@/components/toast-provider";

export function JoinChallengeButton({ challengeId }: { challengeId: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleJoin() {
    setIsSubmitting(true);
    const response = await fetch(`/api/challenges/${challengeId}/join`, { method: "POST" });
    const data = await response.json().catch(() => ({}));
    setIsSubmitting(false);

    if (!response.ok) {
      showToast("error", data.error ?? "Couldn't join this challenge.");
      return;
    }

    showToast("success", "Joined — your current portfolio value is now your baseline.");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleJoin}
      disabled={isSubmitting}
      className="shrink-0 rounded-md bg-accent-solid px-3 py-1.5 text-caption font-medium text-accent-foreground transition-colors hover:bg-accent-solid-hover disabled:opacity-50"
    >
      {isSubmitting ? "Joining…" : "Join"}
    </button>
  );
}

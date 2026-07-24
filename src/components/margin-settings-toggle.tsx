"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useToast } from "@/components/toast-provider";

/// The Settings toggle for short selling & margin trading — gated behind
/// the two Advanced Trading lessons (with their quizzes) and, once
/// unlocked, a one-time explicit risk acknowledgment before it can actually
/// be turned on. This UI is a courtesy, not the enforcement: the real gate
/// is `POST /api/account/margin` re-checking education completion
/// server-side, and `@/lib/trading`'s `applySell` refusing to open a short
/// at all unless the account's `marginEnabled` is already true in the
/// database.
export function MarginSettingsToggle({
  hasCompletedEducation,
  marginEnabled,
  lessonHrefs,
}: {
  hasCompletedEducation: boolean;
  marginEnabled: boolean;
  lessonHrefs: string[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [showAcknowledgment, setShowAcknowledgment] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function setEnabled(enabled: boolean, ack?: boolean) {
    setIsSubmitting(true);
    const response = await fetch("/api/account/margin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled, acknowledged: ack }),
    });
    const data = await response.json().catch(() => ({}));
    setIsSubmitting(false);

    if (!response.ok) {
      showToast("error", data.error ?? "Couldn't update this setting.");
      return;
    }

    showToast("success", enabled ? "Short selling & margin trading enabled." : "Short selling & margin trading disabled.");
    setShowAcknowledgment(false);
    setAcknowledged(false);
    router.refresh();
  }

  if (!hasCompletedEducation) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-background-elevated p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-body font-medium text-foreground">Enable short selling &amp; margin trading</p>
          <span className="shrink-0 rounded-full bg-background-inset px-3 py-1 text-caption text-foreground-muted">Locked</span>
        </div>
        <p className="text-caption text-foreground-muted">
          Complete both Advanced Trading lessons (and their quizzes) to unlock this setting.
        </p>
        <div className="flex flex-wrap gap-4">
          {lessonHrefs.map((href, index) => (
            <Link key={href} href={href} className="text-caption text-accent hover:underline">
              Lesson {index + 1} →
            </Link>
          ))}
        </div>
      </div>
    );
  }

  if (marginEnabled) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background-elevated p-4">
        <div>
          <p className="text-body font-medium text-foreground">Short selling &amp; margin trading</p>
          <p className="text-caption text-foreground-muted">
            Enabled — you can sell beyond your holdings to open a short position.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEnabled(false)}
          disabled={isSubmitting}
          className="rounded-md border border-border px-3 py-1.5 text-caption font-medium text-foreground-muted transition-colors hover:border-negative hover:text-negative disabled:opacity-50"
        >
          Disable
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-background-elevated p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-body font-medium text-foreground">Enable short selling &amp; margin trading</p>
        <button
          type="button"
          onClick={() => setShowAcknowledgment((current) => !current)}
          aria-pressed={showAcknowledgment}
          className="rounded-md border border-border px-3 py-1.5 text-caption font-medium text-foreground transition-colors hover:border-border-strong"
        >
          {showAcknowledgment ? "Cancel" : "Enable"}
        </button>
      </div>

      {showAcknowledgment ? (
        <div className="flex flex-col gap-3 rounded-md bg-background-inset p-3">
          <label className="flex items-start gap-2 text-caption text-foreground">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
              className="mt-0.5 shrink-0"
            />
            I understand short selling and margin trading carry the risk of losses greater than my initial investment.
          </label>
          <button
            type="button"
            onClick={() => setEnabled(true, true)}
            disabled={!acknowledged || isSubmitting}
            className="self-start rounded-md bg-accent-solid px-3 py-1.5 text-caption font-medium text-accent-foreground transition-colors hover:bg-accent-solid-hover disabled:opacity-50"
          >
            {isSubmitting ? "Enabling…" : "Confirm and enable"}
          </button>
        </div>
      ) : (
        <p className="text-caption text-foreground-muted">
          Allows SELL orders beyond your holdings (opening a short position) and reserves a margin requirement
          against your buying power.
        </p>
      )}
    </div>
  );
}

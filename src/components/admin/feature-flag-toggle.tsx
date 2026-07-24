"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/toast-provider";

export function FeatureFlagToggle({ flagKey, initialEnabled }: { flagKey: string; initialEnabled: boolean }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isSaving, setIsSaving] = useState(false);

  async function handleToggle() {
    const nextEnabled = !enabled;
    setIsSaving(true);

    const response = await fetch("/api/admin/feature-flags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: flagKey, enabled: nextEnabled }),
    });

    setIsSaving(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      showToast("error", data.error ?? "Couldn't update flag.");
      return;
    }

    setEnabled(nextEnabled);
    router.refresh();
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={handleToggle}
      disabled={isSaving}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
        enabled ? "bg-accent-solid" : "bg-background-inset"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-background-elevated shadow transition-transform ${
          enabled ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

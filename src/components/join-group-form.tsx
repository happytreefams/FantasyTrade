"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useToast } from "@/components/toast-provider";

export function JoinGroupForm() {
  const router = useRouter();
  const { showToast } = useToast();
  const [joinCode, setJoinCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);

    const response = await fetch("/api/groups/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ joinCode }),
    });
    const data = await response.json().catch(() => ({}));
    setIsSubmitting(false);

    if (!response.ok) {
      showToast("error", data.error ?? "Couldn't join that classroom.");
      return;
    }

    showToast("success", `Joined ${data.group.name}.`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1.5 text-caption text-foreground-muted">
        Classroom join code
        <input
          type="text"
          value={joinCode}
          onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
          placeholder="e.g. AB3XQ9"
          required
          maxLength={20}
          className="rounded-md border border-border bg-background-inset px-3 py-2 font-financial text-body uppercase text-foreground outline-none focus:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
      </label>
      <button
        type="submit"
        disabled={isSubmitting || !joinCode.trim()}
        className="rounded-md bg-accent-solid px-3 py-2 text-body font-medium text-accent-foreground transition-colors hover:bg-accent-solid-hover disabled:opacity-50"
      >
        {isSubmitting ? "Joining…" : "Join classroom"}
      </button>
    </form>
  );
}

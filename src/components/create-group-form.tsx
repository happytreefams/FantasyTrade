"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";

import { useToast } from "@/components/toast-provider";

export function CreateGroupForm() {
  const { update } = useSession();
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [startingCash, setStartingCash] = useState("1000000");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);

    const response = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, startingCash: Number(startingCash) }),
    });
    const data = await response.json().catch(() => ({}));
    setIsSubmitting(false);

    if (!response.ok) {
      showToast("error", data.error ?? "Couldn't create the classroom.");
      return;
    }

    showToast("success", `Classroom created — join code ${data.group.joinCode}.`);
    // Refreshes the session's role claim in-place — without this, the
    // still-STUDENT-tagged session would get bounced off /teacher/[groupId]
    // by middleware until the next login (see auth.config.ts's jwt callback).
    // A hard navigation (not router.push) after the update guarantees the
    // very next request — middleware included — reads the freshly-set
    // session cookie rather than a client-router-cached RSC payload from
    // before the role changed.
    await update({ role: "TEACHER" });
    window.location.href = `/teacher/${data.group.id}`;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-border bg-background-elevated p-4">
      <h3 className="text-body font-semibold">Create a classroom</h3>

      <label className="flex flex-col gap-1.5 text-caption text-foreground-muted">
        Classroom name
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Period 3 Investing Club"
          required
          maxLength={100}
          className="rounded-md border border-border bg-background-inset px-3 py-2 text-body text-foreground outline-none focus:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-caption text-foreground-muted">
        Starting cash per student
        <input
          type="number"
          value={startingCash}
          onChange={(event) => setStartingCash(event.target.value)}
          min={1}
          step="0.01"
          required
          className="rounded-md border border-border bg-background-inset px-3 py-2 font-financial text-body text-foreground outline-none focus:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
        <span className="text-foreground-subtle">Defaults to the platform&apos;s normal $1,000,000 — override if you want.</span>
      </label>

      <button
        type="submit"
        disabled={isSubmitting || !name.trim()}
        className="self-start rounded-md bg-accent-solid px-3 py-2 text-body font-medium text-accent-foreground transition-colors hover:bg-accent-solid-hover disabled:opacity-50"
      >
        {isSubmitting ? "Creating…" : "Create classroom"}
      </button>
    </form>
  );
}

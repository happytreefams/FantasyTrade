"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useToast } from "@/components/toast-provider";

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/// `groupId`, when provided, scopes the created challenge to that classroom
/// (the teacher-dashboard use case); omitted, it creates an open/global
/// challenge (the admin-only use case) — see `POST /api/challenges`'s doc
/// comment for which callers are authorized for each.
export function CreateChallengeForm({ groupId }: { groupId?: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const today = new Date();
  const nextMonth = new Date(today);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(toDateInputValue(today));
  const [endDate, setEndDate] = useState(toDateInputValue(nextMonth));
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);

    const response = await fetch("/api/challenges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, startDate, endDate, groupId: groupId ?? null }),
    });
    const data = await response.json().catch(() => ({}));
    setIsSubmitting(false);

    if (!response.ok) {
      showToast("error", data.error ?? "Couldn't create the challenge.");
      return;
    }

    showToast("success", `Challenge "${data.challenge.name}" created.`);
    setName("");
    setDescription("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-border bg-background-elevated p-4">
      <h3 className="text-body font-semibold">Create a challenge</h3>

      <label className="flex flex-col gap-1.5 text-caption text-foreground-muted">
        Name
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Spring Trading Sprint"
          required
          maxLength={100}
          className="rounded-md border border-border bg-background-inset px-3 py-2 text-body text-foreground outline-none focus:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-caption text-foreground-muted">
        Description
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="What's the goal? Any rules?"
          required
          maxLength={500}
          rows={2}
          className="rounded-md border border-border bg-background-inset px-3 py-2 text-body text-foreground outline-none focus:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
      </label>

      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1.5 text-caption text-foreground-muted">
          Start date
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            required
            className="rounded-md border border-border bg-background-inset px-3 py-2 text-body text-foreground outline-none focus:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-caption text-foreground-muted">
          End date
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            required
            className="rounded-md border border-border bg-background-inset px-3 py-2 text-body text-foreground outline-none focus:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !name.trim() || !description.trim()}
        className="self-start rounded-md bg-accent-solid px-3 py-2 text-body font-medium text-accent-foreground transition-colors hover:bg-accent-solid-hover disabled:opacity-50"
      >
        {isSubmitting ? "Creating…" : "Create challenge"}
      </button>
    </form>
  );
}

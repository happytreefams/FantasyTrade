"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useToast } from "@/components/toast-provider";

export function LessonActions({
  lessonId,
  initialCompleted,
  quizId,
}: {
  lessonId: string;
  initialCompleted: boolean;
  quizId: string | null;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [completed, setCompleted] = useState(initialCompleted);
  const [isPending, setIsPending] = useState(false);

  async function markComplete() {
    if (completed || isPending) return;
    setIsPending(true);

    const response = await fetch("/api/learn/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId }),
    });

    setIsPending(false);

    if (!response.ok) {
      showToast("error", "Couldn't mark this lesson complete. Please try again.");
      return;
    }

    setCompleted(true);
    showToast("success", "Lesson marked complete.");

    const data: { certificatesIssued?: { id: string; title: string }[] } = await response.json().catch(() => ({}));
    for (const cert of data.certificatesIssued ?? []) {
      showToast("success", `Certificate earned: ${cert.title}!`);
    }

    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={markComplete}
        disabled={completed || isPending}
        className={`rounded-md px-3 py-2 text-body font-medium transition-colors disabled:opacity-70 ${
          completed
            ? "bg-positive-bg text-positive"
            : "bg-accent-solid text-accent-foreground hover:bg-accent-solid-hover"
        }`}
      >
        {completed ? "✓ Completed" : isPending ? "Saving…" : "Mark complete"}
      </button>

      {quizId ? (
        <Link
          href={`/learn/quizzes/${quizId}`}
          className="rounded-md border border-border px-3 py-2 text-body font-medium text-foreground transition-colors hover:border-border-strong hover:bg-background-inset"
        >
          Take quiz →
        </Link>
      ) : null}
    </div>
  );
}

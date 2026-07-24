"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { GlossaryTermRecord } from "@/lib/glossary";

export function GlossarySearch({ terms }: { terms: GlossaryTermRecord[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return terms;
    return terms.filter(
      (entry) => entry.term.toLowerCase().includes(normalized) || entry.definition.toLowerCase().includes(normalized),
    );
  }, [terms, query]);

  return (
    <div className="flex flex-col gap-4">
      <label htmlFor="glossary-search" className="flex flex-col gap-1.5 text-caption text-foreground-muted">
        Search terms
        <input
          id="glossary-search"
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="e.g. margin, diversification, RRSP"
          className="rounded-md border border-border bg-background-inset px-3 py-2 text-body text-foreground outline-none focus:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
      </label>

      {filtered.length === 0 ? (
        <p className="text-body text-foreground-muted">No terms match &quot;{query}&quot;.</p>
      ) : (
        <dl className="flex flex-col divide-y divide-border rounded-lg border border-border bg-background-elevated">
          {filtered.map((entry) => (
            <div key={entry.id} className="flex flex-col gap-1 p-4">
              <dt className="text-body font-semibold text-foreground">{entry.term}</dt>
              <dd className="text-body text-foreground-muted">{entry.definition}</dd>
              {entry.relatedLessonId ? (
                <Link href={`/learn/lessons/${entry.relatedLessonId}`} className="mt-1 w-fit text-caption text-accent hover:underline">
                  Related lesson →
                </Link>
              ) : null}
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

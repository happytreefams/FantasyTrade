"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type GlossaryTermProps = {
  term: string;
  definition: string;
  lessonHref?: string | null;
  children: React.ReactNode;
};

/// Wraps a snippet of text (or any inline content, e.g. an Analytics stat
/// label) with a dotted underline that reveals a definition tooltip on
/// hover (desktop) or tap (touch) — click-outside and Escape both close it,
/// since a tap has no natural "mouseleave" to fall back on.
export function GlossaryTerm({ term, definition, lessonHref, children }: GlossaryTermProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <span
      ref={containerRef}
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="cursor-help underline decoration-dotted decoration-foreground-muted underline-offset-2"
        aria-expanded={open}
        aria-label={`Definition of ${term}`}
        onClick={(event) => {
          event.stopPropagation();
          // Always opens (never toggles closed) — a mouse click fires right
          // after mouseenter already opened it, so a toggle here would
          // immediately close what hovering just opened. Closing is handled
          // by mouseleave, an outside click/tap, or Escape instead.
          setOpen(true);
        }}
      >
        {children}
      </button>

      {open ? (
        <span
          role="tooltip"
          className="absolute bottom-[calc(100%+8px)] left-1/2 z-20 w-64 -translate-x-1/2 rounded-md border border-border bg-background-elevated p-3 text-left text-caption shadow-lg"
        >
          <span className="mb-1 block font-medium text-foreground">{term}</span>
          <span className="block text-foreground-muted">{definition}</span>
          {lessonHref ? (
            <Link
              href={lessonHref}
              className="mt-2 inline-block text-accent hover:underline"
              onClick={(event) => event.stopPropagation()}
            >
              Learn more →
            </Link>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}

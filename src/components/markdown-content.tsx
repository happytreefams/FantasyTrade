import Link from "next/link";

import { LESSON_DIAGRAMS } from "@/components/lesson-diagrams";
import { GlossaryTerm } from "@/components/glossary-term";
import type { GlossaryTermRecord } from "@/lib/glossary";

type GlossaryContext = {
  terms: GlossaryTermRecord[];
  pattern: RegExp;
  usedTermIds: Set<string>;
};

/// Builds a single case-insensitive alternation regex from every glossary
/// term, longest-first so e.g. a hypothetical "Stop" wouldn't shadow
/// "Stop-Loss" when both start at the same position.
function buildGlossaryPattern(terms: GlossaryTermRecord[]): RegExp | null {
  if (terms.length === 0) return null;
  const escaped = [...terms]
    .sort((a, b) => b.term.length - a.term.length)
    .map((entry) => entry.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`\\b(${escaped.join("|")})\\b`, "i");
}

/// Scans a plain-text segment (never one already inside **bold**/*italic*/
/// a [link](href)) for glossary terms, wrapping only the first occurrence
/// of each term across the whole lesson (tracked via the shared
/// `usedTermIds` set) so a heavily-repeated term like "diversification"
/// doesn't turn every sentence into a wall of tooltips.
function wrapGlossaryTerms(text: string, glossary: GlossaryContext, keyPrefix: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const match = remaining.match(glossary.pattern);
    if (!match || match.index === undefined) {
      parts.push(remaining);
      break;
    }

    if (match.index > 0) {
      parts.push(remaining.slice(0, match.index));
    }

    const matchedText = match[0];
    const termRecord = glossary.terms.find((entry) => entry.term.toLowerCase() === matchedText.toLowerCase());

    if (!termRecord || glossary.usedTermIds.has(termRecord.id)) {
      parts.push(matchedText);
    } else {
      glossary.usedTermIds.add(termRecord.id);
      parts.push(
        <GlossaryTerm
          key={`${keyPrefix}-gt-${key}`}
          term={termRecord.term}
          definition={termRecord.definition}
          lessonHref={termRecord.relatedLessonId ? `/learn/lessons/${termRecord.relatedLessonId}` : null}
        >
          {matchedText}
        </GlossaryTerm>,
      );
      key += 1;
    }

    remaining = remaining.slice(match.index + matchedText.length);
  }

  return parts;
}

/// Renders the small markdown subset used by lesson content: paragraphs
/// separated by blank lines, "## " subheadings, "- " bullet lists, inline
/// **bold** / *italic* / [link text](/href), "::diagram[Name]{prop=val|prop2=val2}"
/// embeds (looked up in LESSON_DIAGRAMS), and "::callout[Title]" boxes (a
/// title line followed by paragraph/bullet lines in the same block).
/// Deliberately not a full markdown or MDX parser — lesson content is
/// authored by us, so we only need what we actually use.
function parseInline(text: string, keyPrefix: string, glossary?: GlossaryContext | null): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/;

  function pushPlainText(segment: string) {
    if (segment.length === 0) return;
    if (glossary) {
      parts.push(...wrapGlossaryTerms(segment, glossary, `${keyPrefix}-${key}`));
      key += 1;
    } else {
      parts.push(segment);
    }
  }

  while (remaining.length > 0) {
    const match = remaining.match(pattern);
    if (!match || match.index === undefined) {
      pushPlainText(remaining);
      break;
    }
    if (match.index > 0) {
      pushPlainText(remaining.slice(0, match.index));
    }
    const token = match[0];
    if (token.startsWith("**")) {
      parts.push(
        <strong key={`${keyPrefix}-${key}`} className="font-semibold text-foreground">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("[")) {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        const [, linkText, href] = linkMatch;
        parts.push(
          <Link key={`${keyPrefix}-${key}`} href={href} className="text-accent hover:underline">
            {linkText}
          </Link>,
        );
      }
    } else {
      parts.push(
        <em key={`${keyPrefix}-${key}`} className="italic">
          {token.slice(1, -1)}
        </em>,
      );
    }
    key += 1;
    remaining = remaining.slice(match.index + token.length);
  }

  return parts;
}

/// Splits a line list into a leading paragraph (non-bullet lines, joined
/// with a space) and a trailing bullet list ("- " lines) — enough for a
/// callout body of "intro sentence" and/or "a few bullets" without needing
/// arbitrary interleaving.
function renderBodyLines(lines: string[], keyPrefix: string, glossary?: GlossaryContext | null): React.ReactNode {
  const paragraphLines: string[] = [];
  const bulletLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith("- ")) bulletLines.push(line.slice(2));
    else if (line.length > 0) paragraphLines.push(line);
  }

  return (
    <>
      {paragraphLines.length > 0 ? <p>{parseInline(paragraphLines.join(" "), `${keyPrefix}-p`, glossary)}</p> : null}
      {bulletLines.length > 0 ? (
        <ul className="list-disc space-y-1 pl-5">
          {bulletLines.map((line, index) => (
            <li key={index}>{parseInline(line, `${keyPrefix}-li-${index}`, glossary)}</li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

/// Parses "key=value|key2=value2" into a props object, coercing numeric-
/// looking values to numbers so diagram components can declare `number`
/// prop types without parsing strings themselves.
const SEGMENT_LIST_PATTERN = /^[^:,]+:[^:,]+(,[^:,]+:[^:,]+)*$/;

/// A prop value shaped like "Stocks:60,Bonds:25,Cash:15" becomes an array of
/// { label, percent } objects — enough to pass custom breakdowns to a
/// component like AssetAllocationPie without a full array/object syntax.
function parseSegmentList(rawValue: string): { label: string; percent: number | string }[] {
  return rawValue.split(",").map((entry) => {
    const [label, value] = entry.split(":");
    const num = Number(value);
    return { label: label.trim(), percent: Number.isFinite(num) ? num : value.trim() };
  });
}

function parseDiagramProps(raw: string | undefined): Record<string, string | number | { label: string; percent: number | string }[]> {
  if (!raw) return {};
  const props: Record<string, string | number | { label: string; percent: number | string }[]> = {};
  for (const pair of raw.split("|")) {
    const eqIndex = pair.indexOf("=");
    if (eqIndex === -1) continue;
    const key = pair.slice(0, eqIndex).trim();
    const rawValue = pair.slice(eqIndex + 1).trim();
    if (SEGMENT_LIST_PATTERN.test(rawValue)) {
      props[key] = parseSegmentList(rawValue);
    } else if (/^-?\d+(\.\d+)?$/.test(rawValue)) {
      props[key] = Number(rawValue);
    } else {
      props[key] = rawValue;
    }
  }
  return props;
}

const DIAGRAM_PATTERN = /^::diagram\[([A-Za-z0-9_]+)\](?:\{(.+)\})?\s*$/;
const CALLOUT_PATTERN = /^::callout\[(.+?)\]\s*$/;

export function MarkdownContent({ content, glossaryTerms }: { content: string; glossaryTerms?: GlossaryTermRecord[] }) {
  const blocks = content.trim().split(/\n\s*\n/);
  const pattern = glossaryTerms ? buildGlossaryPattern(glossaryTerms) : null;
  const glossary: GlossaryContext | null = pattern && glossaryTerms ? { terms: glossaryTerms, pattern, usedTermIds: new Set() } : null;

  return (
    <div className="flex flex-col gap-4 text-body leading-relaxed text-foreground-muted">
      {blocks.map((block, blockIndex) => {
        const trimmed = block.trim();
        const lines = trimmed.split("\n").map((line) => line.trim());
        const [firstLine, ...restLines] = lines;

        const diagramMatch = firstLine.match(DIAGRAM_PATTERN);
        if (diagramMatch) {
          const [, name, rawProps] = diagramMatch;
          const Diagram = LESSON_DIAGRAMS[name];
          if (!Diagram) {
            console.warn(`MarkdownContent: unknown diagram "${name}"`);
            return null;
          }
          return <Diagram key={blockIndex} {...parseDiagramProps(rawProps)} />;
        }

        const calloutMatch = firstLine.match(CALLOUT_PATTERN);
        if (calloutMatch) {
          const [, title] = calloutMatch;
          return (
            <div key={blockIndex} className="rounded-lg border-l-4 border-accent bg-accent/5 p-4">
              <p className="mb-1.5 text-caption font-semibold tracking-wide text-accent uppercase">{title}</p>
              <div className="flex flex-col gap-2 text-body text-foreground">
                {renderBodyLines(restLines, `callout-${blockIndex}`, glossary)}
              </div>
            </div>
          );
        }

        if (trimmed.startsWith("## ")) {
          return (
            <h3 key={blockIndex} className="mt-4 border-t border-border pt-4 text-title font-semibold text-foreground first:mt-0 first:border-0 first:pt-0">
              {parseInline(trimmed.slice(3), `h-${blockIndex}`, glossary)}
            </h3>
          );
        }

        if (lines.length > 0 && lines.every((line) => line.startsWith("- "))) {
          return (
            <ul key={blockIndex} className="list-disc space-y-1.5 pl-5">
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>{parseInline(line.slice(2), `li-${blockIndex}-${lineIndex}`, glossary)}</li>
              ))}
            </ul>
          );
        }

        return <p key={blockIndex}>{parseInline(trimmed, `p-${blockIndex}`, glossary)}</p>;
      })}
    </div>
  );
}

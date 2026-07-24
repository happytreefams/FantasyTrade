import type { BadgeDisplayEntry } from "@/lib/badges";
import { formatAsOfDate } from "@/lib/format";

/// A grid of every seeded badge — earned ones full-color with their earned
/// date, locked ones greyed out with their `description` doing double duty
/// as the unlock criteria. A light engagement nudge, not a gate: nothing
/// here is clickable.
export function BadgeShelf({ badges }: { badges: BadgeDisplayEntry[] }) {
  if (badges.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {badges.map((badge) => (
        <div
          key={badge.code}
          className={`flex flex-col items-center gap-1.5 rounded-lg border p-4 text-center ${
            badge.earned ? "border-border bg-background-elevated" : "border-border bg-background-inset opacity-50"
          }`}
        >
          <span aria-hidden="true" className="text-hero">
            {badge.icon}
          </span>
          <p className="text-body font-semibold text-foreground">{badge.name}</p>
          <p className="text-caption text-foreground-muted">{badge.description}</p>
          <p className="text-caption text-foreground-subtle">
            {badge.earned && badge.earnedAt ? `Earned ${formatAsOfDate(badge.earnedAt)}` : "Locked"}
          </p>
        </div>
      ))}
    </div>
  );
}

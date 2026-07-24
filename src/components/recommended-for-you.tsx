import Link from "next/link";

import type { Recommendations } from "@/lib/learning";

/// Renders nothing when there's nothing to recommend (a brand-new user, or
/// one with no below-threshold quiz scores and no finished course yet) —
/// the full catalog below already covers that case.
export function RecommendedForYou({ recommendations }: { recommendations: Recommendations }) {
  const { reviewLessons, nextCourse } = recommendations;
  if (reviewLessons.length === 0 && !nextCourse) return null;

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-accent/30 bg-accent/5 p-5">
      <h2 className="text-title font-semibold">Recommended for You</h2>

      {reviewLessons.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-caption font-medium tracking-wide text-foreground-muted uppercase">Review these lessons</p>
          <ul className="flex flex-col gap-1.5">
            {reviewLessons.map((rec) => (
              <li key={rec.lessonId} className="text-body">
                <Link href={`/learn/lessons/${rec.lessonId}`} className="text-accent hover:underline">
                  {rec.lessonTitle}
                </Link>
                <span className="ml-2 text-caption text-foreground-subtle">
                  ({rec.courseTitle} · scored {rec.score}%)
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {nextCourse ? (
        <div className="flex flex-col gap-2">
          <p className="text-caption font-medium tracking-wide text-foreground-muted uppercase">Continue your learning</p>
          <Link
            href={`/learn/${nextCourse.courseId}`}
            className="flex flex-col gap-1 rounded-md border border-border bg-background-elevated p-4 transition-colors hover:border-border-strong"
          >
            <span className="text-body font-semibold">{nextCourse.courseTitle}</span>
            <span className="text-caption text-foreground-muted">{nextCourse.courseDescription}</span>
          </Link>
        </div>
      ) : null}
    </section>
  );
}

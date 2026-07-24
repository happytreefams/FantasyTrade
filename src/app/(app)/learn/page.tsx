import Link from "next/link";
import { redirect } from "next/navigation";
import type { CourseCategory } from "@prisma/client";

import { RecommendedForYou } from "@/components/recommended-for-you";
import { auth } from "@/lib/auth";
import { COURSE_CATEGORY_LABELS, getCourseCatalog, getRecommendations } from "@/lib/learning";

export default async function LearnCatalogPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const [courses, recommendations] = await Promise.all([
    getCourseCatalog(session.user.id),
    getRecommendations(session.user.id),
  ]);

  const grouped = new Map<CourseCategory, typeof courses>();
  for (const course of courses) {
    const list = grouped.get(course.category) ?? [];
    list.push(course);
    grouped.set(course.category, list);
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-display font-semibold tracking-tight">Learn</h1>
          <p className="mt-1 text-body text-foreground-muted">
            Short lessons and quizzes covering the basics of investing — stocks, bonds, ETFs, commodities, risk, and
            how this app itself works.
          </p>
        </div>
        <Link
          href="/learn/glossary"
          className="shrink-0 rounded-md border border-border px-3 py-1.5 text-caption font-medium text-foreground-muted transition-colors hover:border-border-strong hover:text-foreground"
        >
          Glossary
        </Link>
      </div>

      <RecommendedForYou recommendations={recommendations} />

      {[...grouped.entries()].map(([category, categoryCourses]) => (
        <section key={category} className="flex flex-col gap-3">
          <h2 className="text-title font-semibold">{COURSE_CATEGORY_LABELS[category]}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categoryCourses.map((course) => (
              <Link
                key={course.id}
                href={`/learn/${course.id}`}
                className="flex flex-col gap-2 rounded-lg border border-border bg-background-elevated p-5 transition-colors hover:border-border-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <h3 className="text-body font-semibold">{course.title}</h3>
                <p className="text-caption text-foreground-muted">{course.description}</p>
                <div className="mt-2">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-background-inset">
                    <div
                      className="h-full rounded-full bg-positive transition-[width]"
                      style={{ width: `${course.percentComplete}%` }}
                    />
                  </div>
                  <p className="mt-1 text-caption text-foreground-subtle">
                    {course.completedCount}/{course.lessonCount} lessons · {course.percentComplete}% complete
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

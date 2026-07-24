import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { estimateReadMinutes, getCourseDetail } from "@/lib/learning";

export default async function CourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const course = await getCourseDetail(courseId, session.user.id);
  if (!course) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/learn" className="text-caption text-foreground-muted hover:text-foreground">
          ← All courses
        </Link>
        <h1 className="mt-1 text-display font-semibold tracking-tight">{course.title}</h1>
        <p className="mt-1 text-body text-foreground-muted">{course.description}</p>
        <div className="mt-3 max-w-sm">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-background-inset">
            <div className="h-full rounded-full bg-positive transition-[width]" style={{ width: `${course.percentComplete}%` }} />
          </div>
          <p className="mt-1 text-caption text-foreground-subtle">{course.percentComplete}% complete</p>
        </div>
      </div>

      <ol className="flex flex-col gap-2">
        {course.lessons.map((lesson, index) => (
          <li key={lesson.id}>
            <Link
              href={`/learn/lessons/${lesson.id}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background-elevated px-4 py-3 transition-colors hover:border-border-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <span className="flex items-center gap-3">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-caption ${
                    lesson.completed ? "bg-positive-bg text-positive" : "bg-background-inset text-foreground-muted"
                  }`}
                  aria-hidden="true"
                >
                  {lesson.completed ? "✓" : index + 1}
                </span>
                <span className="flex flex-col">
                  <span className="text-body font-medium">{lesson.title}</span>
                  <span className="text-caption text-foreground-subtle">~{estimateReadMinutes(lesson.content)} min read</span>
                </span>
              </span>
              {lesson.completed ? <span className="text-caption text-positive">Completed</span> : null}
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

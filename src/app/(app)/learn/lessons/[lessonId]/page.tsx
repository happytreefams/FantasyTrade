import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { LessonActions } from "@/components/lesson-actions";
import { MarkdownContent } from "@/components/markdown-content";
import { PersonalFinanceDisclaimerBanner } from "@/components/personal-finance-disclaimer-banner";
import { auth } from "@/lib/auth";
import { getGlossaryTerms } from "@/lib/glossary";
import { estimateReadMinutes, getLessonDetail } from "@/lib/learning";

export default async function LessonReaderPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const lesson = await getLessonDetail(lessonId, session.user.id);
  if (!lesson) {
    notFound();
  }

  const glossaryTerms = await getGlossaryTerms();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <Link href={`/learn/${lesson.courseId}`} className="text-caption text-foreground-muted hover:text-foreground">
          ← {lesson.course.title}
        </Link>
        <h1 className="mt-1 text-display font-semibold tracking-tight">{lesson.title}</h1>
        <p className="mt-1 text-caption text-foreground-subtle">~{estimateReadMinutes(lesson.content)} min read</p>
      </div>

      {lesson.course.category === "PERSONAL_FINANCE" ? <PersonalFinanceDisclaimerBanner /> : null}

      <MarkdownContent content={lesson.content} glossaryTerms={glossaryTerms} />

      <LessonActions lessonId={lesson.id} initialCompleted={lesson.completed} quizId={lesson.quizId} />

      <nav className="flex items-center justify-between border-t border-border pt-4 text-body">
        {lesson.previousLessonId ? (
          <Link href={`/learn/lessons/${lesson.previousLessonId}`} className="text-accent hover:underline">
            ← Previous lesson
          </Link>
        ) : (
          <span />
        )}
        {lesson.nextLessonId ? (
          <Link href={`/learn/lessons/${lesson.nextLessonId}`} className="text-accent hover:underline">
            Next lesson →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}

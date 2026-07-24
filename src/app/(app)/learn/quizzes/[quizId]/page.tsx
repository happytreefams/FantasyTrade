import { notFound, redirect } from "next/navigation";

import { QuizRunner } from "@/components/quiz-runner";
import { auth } from "@/lib/auth";
import { getQuiz } from "@/lib/learning";

export default async function QuizPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = await params;
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const quiz = await getQuiz(quizId);
  if (!quiz) {
    notFound();
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>
        <p className="text-caption text-foreground-muted">{quiz.lessonTitle}</p>
        <h1 className="text-display font-semibold tracking-tight">{quiz.title}</h1>
      </div>
      <QuizRunner
        quizId={quiz.id}
        lessonId={quiz.lessonId}
        courseId={quiz.courseId}
        questions={quiz.questions.map((question) => ({
          id: question.id,
          question: question.question,
          choices: question.choices as string[],
          correctAnswerIndex: question.correctAnswerIndex,
          explanation: question.explanation,
        }))}
      />
    </div>
  );
}

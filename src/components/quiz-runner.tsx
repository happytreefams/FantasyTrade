"use client";

import Link from "next/link";
import { useState } from "react";

import { useToast } from "@/components/toast-provider";

type Question = {
  id: string;
  question: string;
  choices: string[];
  correctAnswerIndex: number;
  explanation: string;
};

export function QuizRunner({
  quizId,
  lessonId,
  courseId,
  questions,
}: {
  quizId: string;
  lessonId: string;
  courseId: string;
  questions: Question[];
}) {
  const { showToast } = useToast();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(false);

  const question = questions[index];
  const isLast = index === questions.length - 1;
  const isAnswered = selected !== null;
  const isCorrect = isAnswered && selected === question.correctAnswerIndex;

  function selectChoice(choiceIndex: number) {
    if (isAnswered) return;
    setSelected(choiceIndex);
    if (choiceIndex === question.correctAnswerIndex) {
      setCorrectCount((count) => count + 1);
    }
  }

  async function handleNext() {
    if (!isLast) {
      setIndex((current) => current + 1);
      setSelected(null);
      return;
    }

    setFinished(true);
    if (!hasRecorded) {
      setHasRecorded(true);
      const score = Math.round((correctCount / questions.length) * 100);
      const response = await fetch("/api/learn/quiz-attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId, score }),
      }).catch(() => null);

      const data: { certificatesIssued?: { id: string; title: string }[] } | null = response
        ? await response.json().catch(() => null)
        : null;
      for (const cert of data?.certificatesIssued ?? []) {
        showToast("success", `Certificate earned: ${cert.title}!`);
      }
    }
  }

  function retake() {
    setIndex(0);
    setSelected(null);
    setCorrectCount(0);
    setFinished(false);
    setHasRecorded(false);
  }

  if (finished) {
    const score = Math.round((correctCount / questions.length) * 100);
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-background-elevated p-8 text-center">
        <p className="text-caption text-foreground-muted">Quiz complete</p>
        <p className="font-financial text-hero font-semibold">{score}%</p>
        <p className="text-body text-foreground-muted">
          {correctCount} of {questions.length} correct
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={retake}
            className="rounded-md border border-border px-3 py-2 text-body font-medium text-foreground transition-colors hover:border-border-strong hover:bg-background-inset"
          >
            Retake quiz
          </button>
          <Link
            href={`/learn/lessons/${lessonId}`}
            className="rounded-md bg-accent-solid px-3 py-2 text-body font-medium text-accent-foreground transition-colors hover:bg-accent-solid-hover"
          >
            Back to lesson
          </Link>
          <Link href={`/learn/${courseId}`} className="rounded-md px-3 py-2 text-body font-medium text-accent hover:underline">
            Course overview
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-background-elevated p-6">
      <div className="flex items-center justify-between text-caption text-foreground-muted">
        <span>
          Question {index + 1} of {questions.length}
        </span>
        <span>{correctCount} correct so far</span>
      </div>

      <h2 className="text-title font-semibold">{question.question}</h2>

      <div className="flex flex-col gap-2" role="radiogroup" aria-label={question.question}>
        {question.choices.map((choice, choiceIndex) => {
          const isThisCorrect = choiceIndex === question.correctAnswerIndex;
          const isThisSelected = choiceIndex === selected;

          let style = "border-border hover:border-border-strong hover:bg-background-inset";
          if (isAnswered) {
            if (isThisCorrect) {
              style = "border-positive bg-positive-bg text-positive";
            } else if (isThisSelected) {
              style = "border-negative bg-negative-bg text-negative";
            } else {
              style = "border-border opacity-60";
            }
          }

          return (
            <button
              key={choiceIndex}
              type="button"
              role="radio"
              aria-checked={isThisSelected}
              onClick={() => selectChoice(choiceIndex)}
              disabled={isAnswered}
              className={`rounded-md border px-4 py-3 text-left text-body transition-colors disabled:cursor-default focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${style}`}
            >
              {choice}
            </button>
          );
        })}
      </div>

      {isAnswered ? (
        <div
          role="status"
          className={`rounded-md px-3 py-2 text-caption ${isCorrect ? "bg-positive-bg text-positive" : "bg-negative-bg text-negative"}`}
        >
          {isCorrect ? "Correct! " : "Not quite. "}
          {question.explanation}
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleNext}
        disabled={!isAnswered}
        className="self-start rounded-md bg-accent-solid px-3 py-2 text-body font-medium text-accent-foreground transition-colors hover:bg-accent-solid-hover disabled:opacity-50"
      >
        {isLast ? "See results" : "Next question →"}
      </button>
    </div>
  );
}

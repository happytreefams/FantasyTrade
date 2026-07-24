import type { Course, CourseCategory, Lesson, QuizQuestion } from "@prisma/client";

import { LEARNING_LINKS } from "@/lib/learning/links";
import { prisma as defaultPrisma } from "@/lib/prisma";

export type CourseWithProgress = Course & {
  lessonCount: number;
  completedCount: number;
  percentComplete: number;
};

/// All courses, grouped by category in the order they should be displayed,
/// annotated with each course's completion percentage for `userId`.
export async function getCourseCatalog(userId: string, client = defaultPrisma): Promise<CourseWithProgress[]> {
  const courses = await client.course.findMany({
    orderBy: { order: "asc" },
    include: { lessons: { select: { id: true } } },
  });

  const progress = await client.userProgress.findMany({
    where: { userId, lesson: { courseId: { in: courses.map((course) => course.id) } } },
    select: { lessonId: true },
  });
  const completedLessonIds = new Set(progress.map((row) => row.lessonId));

  return courses.map((course) => {
    const lessonCount = course.lessons.length;
    const completedCount = course.lessons.filter((lesson) => completedLessonIds.has(lesson.id)).length;
    return {
      ...course,
      lessonCount,
      completedCount,
      percentComplete: lessonCount === 0 ? 0 : Math.round((completedCount / lessonCount) * 100),
    };
  });
}

export type LessonSummary = Lesson & { completed: boolean };

export type CourseDetail = Course & {
  lessons: LessonSummary[];
  percentComplete: number;
};

export async function getCourseDetail(courseId: string, userId: string, client = defaultPrisma): Promise<CourseDetail | null> {
  const course = await client.course.findUnique({
    where: { id: courseId },
    include: { lessons: { orderBy: { order: "asc" } } },
  });
  if (!course) return null;

  const progress = await client.userProgress.findMany({
    where: { userId, lessonId: { in: course.lessons.map((lesson) => lesson.id) } },
    select: { lessonId: true },
  });
  const completedLessonIds = new Set(progress.map((row) => row.lessonId));

  const lessons = course.lessons.map((lesson) => ({ ...lesson, completed: completedLessonIds.has(lesson.id) }));
  const percentComplete =
    lessons.length === 0 ? 0 : Math.round((lessons.filter((lesson) => lesson.completed).length / lessons.length) * 100);

  return { ...course, lessons, percentComplete };
}

export type LessonDetail = Lesson & {
  course: Course;
  completed: boolean;
  quizId: string | null;
  previousLessonId: string | null;
  nextLessonId: string | null;
};

export async function getLessonDetail(lessonId: string, userId: string, client = defaultPrisma): Promise<LessonDetail | null> {
  const lesson = await client.lesson.findUnique({
    where: { id: lessonId },
    include: { course: { include: { lessons: { orderBy: { order: "asc" }, select: { id: true } } } }, quiz: { select: { id: true } } },
  });
  if (!lesson) return null;

  const completedRow = await client.userProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
  });

  const orderedIds = lesson.course.lessons.map((row) => row.id);
  const index = orderedIds.indexOf(lessonId);

  return {
    ...lesson,
    completed: !!completedRow,
    quizId: lesson.quiz?.id ?? null,
    previousLessonId: index > 0 ? orderedIds[index - 1] : null,
    nextLessonId: index >= 0 && index < orderedIds.length - 1 ? orderedIds[index + 1] : null,
  };
}

export async function markLessonComplete(userId: string, lessonId: string, client = defaultPrisma): Promise<void> {
  await client.userProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    update: {},
    create: { userId, lessonId },
  });
}

export type QuizDetail = {
  id: string;
  title: string;
  lessonId: string;
  lessonTitle: string;
  courseId: string;
  questions: Array<Pick<QuizQuestion, "id" | "question" | "choices" | "correctAnswerIndex" | "explanation">>;
};

export async function getQuiz(quizId: string, client = defaultPrisma): Promise<QuizDetail | null> {
  const quiz = await client.quiz.findUnique({
    where: { id: quizId },
    include: { questions: true, lesson: { select: { id: true, title: true, courseId: true } } },
  });
  if (!quiz) return null;

  return {
    id: quiz.id,
    title: quiz.title,
    lessonId: quiz.lesson.id,
    lessonTitle: quiz.lesson.title,
    courseId: quiz.lesson.courseId,
    questions: quiz.questions,
  };
}

export async function recordQuizAttempt(userId: string, quizId: string, score: number, client = defaultPrisma): Promise<void> {
  await client.userQuizAttempt.create({ data: { userId, quizId, score: Math.round(score) } });
}

export type LearningStats = {
  totalLessons: number;
  completedLessons: number;
  percentComplete: number;
};

/// Powers the lightweight dashboard progress badge.
export async function getLearningStats(userId: string, client = defaultPrisma): Promise<LearningStats> {
  const [totalLessons, completedLessons] = await Promise.all([
    client.lesson.count(),
    client.userProgress.count({ where: { userId } }),
  ]);

  return {
    totalLessons,
    completedLessons,
    percentComplete: totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100),
  };
}

/// The mandatory education gate for short selling & margin: both Advanced
/// Trading lessons must be marked read, and both of their quizzes must have
/// at least one recorded attempt (this app has no other "passing score"
/// gate anywhere else to borrow from, so "completed" here means read +
/// attempted, same as how completion is treated everywhere else in the
/// learning portal). Checked server-side by the margin-enable API route —
/// never trust the Settings toggle's disabled state alone.
export async function hasCompletedAdvancedTradingEducation(userId: string, client = defaultPrisma): Promise<boolean> {
  const { lessonIds, quizIds } = LEARNING_LINKS.advancedTradingLessons;

  const [completedLessons, attemptedQuizzes] = await Promise.all([
    client.userProgress.count({ where: { userId, lessonId: { in: lessonIds } } }),
    client.userQuizAttempt.groupBy({ by: ["quizId"], where: { userId, quizId: { in: quizIds } } }),
  ]);

  return completedLessons >= lessonIds.length && attemptedQuizzes.length >= quizIds.length;
}

const AVERAGE_WORDS_PER_MINUTE = 200;
const SECONDS_PER_DIAGRAM = 15;

/// A rough "~N min read" estimate from lesson content. Strips "::diagram"/
/// "::callout" directive lines and markdown punctuation before counting
/// words, since those aren't prose — a diagram takes a moment to look at
/// rather than read, so each one adds a flat 15 seconds instead of being
/// word-counted.
export function estimateReadMinutes(content: string): number {
  const diagramCount = (content.match(/^::diagram\[/gm) ?? []).length;

  const wordCount = content
    .split("\n")
    .filter((line) => !line.trim().startsWith("::"))
    .join(" ")
    .replace(/[#*-]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;

  const minutes = wordCount / AVERAGE_WORDS_PER_MINUTE + (diagramCount * SECONDS_PER_DIAGRAM) / 60;
  return Math.max(1, Math.ceil(minutes));
}

/// The minimum quiz score (out of 100) treated as "passing" across the
/// learning portal — below this, a lesson gets flagged for review by
/// `getRecommendations`, and above/at this a lesson counts as "passed" for
/// certificate eligibility.
export const QUIZ_PASSING_SCORE = 70;

export type LessonReviewRecommendation = {
  lessonId: string;
  lessonTitle: string;
  courseId: string;
  courseTitle: string;
  score: number;
};

export type NextCourseRecommendation = {
  courseId: string;
  courseTitle: string;
  courseDescription: string;
  category: CourseCategory;
};

export type Recommendations = {
  reviewLessons: LessonReviewRecommendation[];
  nextCourse: NextCourseRecommendation | null;
};

/// Personalized "Recommended for You" data for the top of /learn: lessons
/// whose most recent quiz attempt scored below `QUIZ_PASSING_SCORE` (flagged
/// for review), and — only once the user has finished at least one course,
/// so a brand-new user isn't nudged toward something the full catalog
/// already shows them — the next not-yet-started course in catalog order.
export async function getRecommendations(userId: string, client = defaultPrisma): Promise<Recommendations> {
  const attempts = await client.userQuizAttempt.findMany({
    where: { userId },
    orderBy: { completedAt: "desc" },
    include: { quiz: { include: { lesson: { include: { course: { select: { id: true, title: true } } } } } } },
  });

  const latestAttemptByQuiz = new Map<string, (typeof attempts)[number]>();
  for (const attempt of attempts) {
    if (!latestAttemptByQuiz.has(attempt.quizId)) {
      latestAttemptByQuiz.set(attempt.quizId, attempt);
    }
  }

  const reviewLessons: LessonReviewRecommendation[] = [];
  for (const attempt of latestAttemptByQuiz.values()) {
    if (attempt.score < QUIZ_PASSING_SCORE) {
      reviewLessons.push({
        lessonId: attempt.quiz.lesson.id,
        lessonTitle: attempt.quiz.lesson.title,
        courseId: attempt.quiz.lesson.course.id,
        courseTitle: attempt.quiz.lesson.course.title,
        score: attempt.score,
      });
    }
  }

  const catalog = await getCourseCatalog(userId, client);
  const hasCompletedAnyCourse = catalog.some((course) => course.percentComplete === 100);
  const nextCourseEntry = hasCompletedAnyCourse ? (catalog.find((course) => course.percentComplete === 0) ?? null) : null;
  const nextCourse: NextCourseRecommendation | null = nextCourseEntry
    ? {
        courseId: nextCourseEntry.id,
        courseTitle: nextCourseEntry.title,
        courseDescription: nextCourseEntry.description,
        category: nextCourseEntry.category,
      }
    : null;

  return { reviewLessons, nextCourse };
}

export const COURSE_CATEGORY_LABELS: Record<CourseCategory, string> = {
  INVESTING_BASICS: "Investing Basics",
  STOCKS: "Stocks",
  BONDS: "Bonds",
  ETFS: "ETFs",
  RISK_DIVERSIFICATION: "Risk & Diversification",
  COMMODITIES: "Commodities",
  MARKET_MECHANICS: "Market Mechanics",
  PERSONAL_FINANCE: "Personal Finance",
  ADVANCED_TRADING: "Advanced Trading",
};

export { LEARNING_LINKS } from "@/lib/learning/links";

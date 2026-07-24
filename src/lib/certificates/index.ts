import type { Certificate, CourseCategory, PrismaClient, Prisma } from "@prisma/client";

import { COURSE_CATEGORY_LABELS, QUIZ_PASSING_SCORE } from "@/lib/learning";
import { prisma as defaultPrisma } from "@/lib/prisma";

type Client = PrismaClient | Prisma.TransactionClient;

/// A course counts as complete when every one of its lessons has been marked
/// read AND every one of its quizzes has at least one attempt scoring at or
/// above `QUIZ_PASSING_SCORE` — a passing score earned on any attempt counts
/// (not just the most recent), so a later low-scoring retake can't revoke an
/// already-earned certificate.
async function isCourseComplete(userId: string, courseId: string, client: Client): Promise<boolean> {
  const course = await client.course.findUnique({
    where: { id: courseId },
    include: { lessons: { include: { quiz: { select: { id: true } } } } },
  });
  if (!course || course.lessons.length === 0) return false;

  const lessonIds = course.lessons.map((lesson) => lesson.id);
  const quizIds = course.lessons.map((lesson) => lesson.quiz?.id).filter((id): id is string => Boolean(id));

  const [completedLessonCount, passingQuizzes] = await Promise.all([
    client.userProgress.count({ where: { userId, lessonId: { in: lessonIds } } }),
    client.userQuizAttempt.groupBy({
      by: ["quizId"],
      where: { userId, quizId: { in: quizIds }, score: { gte: QUIZ_PASSING_SCORE } },
    }),
  ]);

  return completedLessonCount >= lessonIds.length && passingQuizzes.length >= quizIds.length;
}

async function isCategoryComplete(userId: string, category: CourseCategory, client: Client): Promise<boolean> {
  const courses = await client.course.findMany({ where: { category }, select: { id: true } });
  if (courses.length === 0) return false;

  const results = await Promise.all(courses.map((course) => isCourseComplete(userId, course.id, client)));
  return results.every(Boolean);
}

/// Checks every course and category for `userId` against the completion
/// rules above and issues any Certificate rows that don't already exist yet
/// — cheap enough (15 courses / ~9 categories) to run in full on every call
/// rather than needing the caller to say which course/category just changed.
/// Called after marking a lesson complete or recording a quiz attempt, since
/// either action could be the one that finishes a course or category.
export async function checkAndIssueCertificates(userId: string, client: Client = defaultPrisma): Promise<Certificate[]> {
  const courses = await client.course.findMany({ select: { id: true, title: true, category: true } });
  const categories = [...new Set(courses.map((course) => course.category))];

  const newlyIssued: Certificate[] = [];

  for (const course of courses) {
    const complete = await isCourseComplete(userId, course.id, client);
    if (!complete) continue;

    const existing = await client.certificate.findFirst({
      where: { userId, scope: "COURSE", courseId: course.id, category: null },
    });
    if (existing) continue;

    const created = await client.certificate.create({
      data: { userId, scope: "COURSE", courseId: course.id, category: null, title: course.title },
    });
    newlyIssued.push(created);
  }

  for (const category of categories) {
    const complete = await isCategoryComplete(userId, category, client);
    if (!complete) continue;

    const existing = await client.certificate.findFirst({
      where: { userId, scope: "CATEGORY", courseId: null, category },
    });
    if (existing) continue;

    const created = await client.certificate.create({
      data: { userId, scope: "CATEGORY", courseId: null, category, title: COURSE_CATEGORY_LABELS[category] },
    });
    newlyIssued.push(created);
  }

  return newlyIssued;
}

export async function getCertificates(userId: string, client: Client = defaultPrisma): Promise<Certificate[]> {
  return client.certificate.findMany({ where: { userId }, orderBy: { issuedAt: "desc" } });
}

/// Fetches a single certificate, scoped to `userId` so one user can never
/// view or download another user's certificate by guessing/incrementing an id.
export async function getCertificate(id: string, userId: string, client: Client = defaultPrisma): Promise<Certificate | null> {
  return client.certificate.findFirst({ where: { id, userId } });
}

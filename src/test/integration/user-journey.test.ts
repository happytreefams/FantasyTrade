import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { POST as signup } from "@/app/api/signup/route";
import { getCourseDetail, getLearningStats, markLessonComplete, recordQuizAttempt } from "@/lib/learning";
import { getAccountValueHistory, getPortfolioSummary, recordAccountValueSnapshot } from "@/lib/portfolio";
import { prisma } from "@/lib/prisma";
import { placeOrder } from "@/lib/trading";

// Runs against a real Postgres database (the same one `pnpm dev`/`pnpm db:seed`
// use) rather than the fake in-memory client `src/lib/trading/index.test.ts`
// uses — the point is to catch things a fake client can't: real Prisma
// constraints, real Decimal precision, and the actual handoff between
// modules. Every fixture below is created fresh and torn down in `afterAll`,
// so this suite is safe to run against a database that already has seeded
// data (it never touches anyone else's rows) but does require
// `DATABASE_URL` to point at a running Postgres.
//
// `login` isn't simulated by going through NextAuth/cookies — that's
// framework session machinery, not app logic. Instead it verifies the one
// thing that actually matters for the signup -> login handoff: the password
// hash signup wrote is the same one login's credential check reads.
describe("full user journey (integration, real database)", () => {
  const runId = Date.now();
  const testEmail = `journey-${runId}@example.test`;
  const testPassword = "IntegrationTest123!";

  let userId: string;
  let accountId: string;
  let securityId: string;
  let courseId: string;
  let lessonId: string;
  let quizId: string;
  let questionId: string;

  beforeAll(async () => {
    const security = await prisma.security.create({
      data: { symbol: `JRNY${runId % 100000}`, name: "Journey Test Co.", assetType: "STOCK", exchange: "TEST" },
    });
    securityId = security.id;
    await prisma.priceHistory.create({
      data: { securityId, date: new Date("2026-01-01"), closePrice: new Prisma.Decimal("100") },
    });

    const course = await prisma.course.create({
      data: {
        id: `test-journey-course-${runId}`,
        title: "Journey Test Course",
        description: "Integration-test-only course.",
        category: "INVESTING_BASICS",
        order: 999,
      },
    });
    courseId = course.id;

    const lesson = await prisma.lesson.create({
      data: { id: `${courseId}-l1`, courseId, title: "Journey Test Lesson", content: "Test content.", order: 1 },
    });
    lessonId = lesson.id;

    const quiz = await prisma.quiz.create({ data: { id: `${lessonId}-quiz`, lessonId, title: "Journey Test Quiz" } });
    quizId = quiz.id;

    const question = await prisma.quizQuestion.create({
      data: {
        id: `${quizId}-q1`,
        quizId,
        question: "2 + 2?",
        choices: ["3", "4", "5"],
        correctAnswerIndex: 1,
        explanation: "Basic arithmetic.",
      },
    });
    questionId = question.id;
  });

  afterAll(async () => {
    if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    await prisma.quizQuestion.delete({ where: { id: questionId } }).catch(() => {});
    await prisma.quiz.delete({ where: { id: quizId } }).catch(() => {});
    await prisma.lesson.delete({ where: { id: lessonId } }).catch(() => {});
    await prisma.course.delete({ where: { id: courseId } }).catch(() => {});
    await prisma.priceHistory.deleteMany({ where: { securityId } }).catch(() => {});
    await prisma.security.delete({ where: { id: securityId } }).catch(() => {});
  });

  it(
    "signs up a new user through the real signup route, creating a User + brokerage Account",
    async () => {
      const request = new Request("http://localhost/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Journey Tester", email: testEmail, password: testPassword }),
      });

      const response = await signup(request);
      expect(response.status).toBe(201);

      const body = await response.json();
      userId = body.id;

      const account = await prisma.account.findUniqueOrThrow({ where: { userId } });
      accountId = account.id;
      expect(account.cashBalance.toString()).toBe("1000000");
    },
    15000,
  );

  it("logs in with the stored credentials (the signup hash validates the signup password)", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    expect(await bcrypt.compare(testPassword, user.hashedPassword)).toBe(true);
    expect(await bcrypt.compare("wrong-password", user.hashedPassword)).toBe(false);
  });

  it("places a market buy order, debiting cash and opening a position", async () => {
    const result = await placeOrder({ accountId, securityId, side: "BUY", quantity: 10 });
    expect(result.status).toBe("FILLED");

    const account = await prisma.account.findUniqueOrThrow({ where: { id: accountId } });
    expect(account.cashBalance.toString()).toBe("999000"); // 1,000,000 - 10 * 100
  });

  it("revalues the portfolio after a new closing price and snapshots it (the daily-close job's per-account step)", async () => {
    await prisma.priceHistory.create({
      data: { securityId, date: new Date("2026-01-02"), closePrice: new Prisma.Decimal("150") },
    });

    const summary = await getPortfolioSummary(accountId);
    const position = summary.positions.find((p) => p.security.id === securityId);
    expect(position?.marketValue.toString()).toBe("1500"); // 10 * 150
    expect(position?.unrealizedGain.toString()).toBe("500"); // 1500 - 1000

    await recordAccountValueSnapshot(accountId, new Date("2026-01-02"), summary.totalPortfolioValue);
    const history = await getAccountValueHistory(accountId, 30);
    expect(history.some((snapshot) => snapshot.totalValue.toString() === summary.totalPortfolioValue.toString())).toBe(
      true,
    );
  });

  it("completes a lesson and its quiz, reflected in learning progress and stats", async () => {
    await markLessonComplete(userId, lessonId);
    const courseDetail = await getCourseDetail(courseId, userId);
    expect(courseDetail?.lessons.find((lesson) => lesson.id === lessonId)?.completed).toBe(true);
    expect(courseDetail?.percentComplete).toBe(100);

    await recordQuizAttempt(userId, quizId, 100);
    const stats = await getLearningStats(userId);
    expect(stats.completedLessons).toBeGreaterThanOrEqual(1);
  });
});

import { Prisma, type JobRunStatus, type PrismaClient } from "@prisma/client";

import { prisma as defaultPrisma } from "@/lib/prisma";

type Client = PrismaClient | Prisma.TransactionClient;

export type JobRunResult = {
  status: JobRunStatus;
  symbolsProcessed?: number;
};

/// Creates the JobRun row marking a job invocation as started — before any
/// real work happens, so even a run that never finishes (a duration
/// timeout, a crash the route's own try/catch never gets to run for) still
/// leaves a visible row: `finishedAt` stays null forever, which the admin
/// Job History panel surfaces as "never finished" rather than silently
/// having no record at all.
export async function startJobRun(jobName: string, client: Client = defaultPrisma): Promise<string> {
  const run = await client.jobRun.create({ data: { jobName } });
  return run.id;
}

export async function finishJobRun(
  id: string,
  data: { status: JobRunStatus; symbolsProcessed?: number; errorMessage?: string },
  client: Client = defaultPrisma,
): Promise<void> {
  await client.jobRun.update({
    where: { id },
    data: {
      finishedAt: new Date(),
      status: data.status,
      symbolsProcessed: data.symbolsProcessed,
      errorMessage: data.errorMessage,
    },
  });
}

/// Wraps a job function with JobRun bookkeeping: a row is created before
/// `fn` runs and marked finished afterward — SUCCESS/PARTIAL (from
/// `toResult`, computed from `fn`'s own return value) on success, FAILED
/// with the error message if `fn` throws. Re-throws so the caller's
/// existing error handling (a cron route's 500 response, an admin route's
/// error toast) is unaffected — this only adds observability around it,
/// never changes behavior.
export async function withJobRun<T>(
  jobName: string,
  fn: () => Promise<T>,
  toResult: (result: T) => JobRunResult,
  client: Client = defaultPrisma,
): Promise<T> {
  const id = await startJobRun(jobName, client);

  let result: T;
  try {
    result = await fn();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    // Best-effort — if this write itself fails (e.g. the DB connection that
    // just broke is what caused `fn` to throw), don't mask the original error.
    await finishJobRun(id, { status: "FAILED", errorMessage }, client).catch(() => {});
    throw error;
  }

  await finishJobRun(id, toResult(result), client);
  return result;
}

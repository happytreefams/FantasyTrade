/// Next.js calls `register()` once per server instance at boot (App Router's
/// documented instrumentation hook — no extra next.config flag needed as of
/// Next 15+). Importing `@/lib/env` here runs its module-level validation
/// immediately: a missing/malformed production env var throws here, on
/// startup, with a clear message — not three requests later as an obscure
/// `PrismaClientInitializationError` or a silently-unauthenticated cron
/// route. Guarded to the Node.js runtime instance only; the Edge runtime
/// instance (middleware) never touches Prisma/DATABASE_URL and doesn't need
/// this check.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("@/lib/env");
  }
}

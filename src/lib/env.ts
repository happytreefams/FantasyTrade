import { z } from "zod";

const isProduction = process.env.NODE_ENV === "production";

/// The single source of truth for every environment variable this app reads
/// — validated once, at boot (see `src/instrumentation.ts`), so a missing or
/// malformed value fails immediately with a clear message instead of
/// surfacing later as an obscure runtime error (a `PrismaClientInitializationError`
/// three requests in, a silently-unauthenticated cron route, etc.). Values
/// required only in production are optional in development, since local dev
/// already has its own documented defaults (see .env.example).
///
/// See .env.production.example for what each variable is, where its value
/// comes from, and how to generate the generated ones.
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  /// Neon's pooled connection string (via PgBouncer) — what the running app
  /// uses for every query. Required everywhere, dev included.
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required (the pooled Postgres connection string)."),

  /// Neon's unpooled/direct connection string — only `prisma migrate deploy`
  /// (run during the Vercel build, and manually for the one-time seed) uses
  /// this; the running app never reads it. Required in production so builds
  /// don't fail obscurely mid-migration; optional locally since Docker
  /// Postgres has no pooler to route around in the first place.
  DIRECT_URL: isProduction
    ? z.string().min(1, "DIRECT_URL is required in production (Neon's unpooled connection string, used by `prisma migrate deploy`).")
    : z.string().min(1).optional(),

  NEXTAUTH_SECRET: z.string().min(
    32,
    "NEXTAUTH_SECRET must be at least 32 characters — generate one with `openssl rand -base64 32`.",
  ),

  /// The exact https:// origin of the deployed app (custom domain in
  /// production) — NextAuth uses this for callback/redirect URLs and cookie
  /// scoping. Optional locally (defaults to http://localhost:3000 territory
  /// via NextAuth's own dev inference); required in production since a
  /// missing/wrong value here silently breaks sign-in redirects.
  NEXTAUTH_URL: isProduction
    ? z.string().url("NEXTAUTH_URL must be the full https:// URL of the production custom domain.")
    : z.string().url().optional(),

  /// Alpha Vantage key for real EOD prices/fundamentals/news. Deliberately
  /// optional even in production: every provider method already resolves to
  /// null (never throws) when it's missing, per the MarketDataProvider
  /// contract — the app degrades to synthetic prices rather than failing.
  MARKET_DATA_API_KEY: z.string().min(1).optional(),
  MARKET_DATA_MAX_DAILY_CALLS: z.coerce.number().int().positive().optional(),
  MARKET_DATA_MAX_WEEKLY_CALLS: z.coerce.number().int().positive().optional(),

  /// Twelve Data key for daily EOD price fetching (see
  /// lib/market-data/providers/twelve-data.ts) — Alpha Vantage above stays in
  /// use for fundamentals/news. Same null-on-missing-key degrade-to-synthetic
  /// contract as MARKET_DATA_API_KEY, so this is optional too.
  TWELVE_DATA_API_KEY: z.string().min(1).optional(),

  /// Shared secret the /api/cron/* routes check against — required in
  /// production since an unprotected cron route would let anyone trigger
  /// (and exhaust the free-tier API budget of) the price/fundamentals jobs.
  /// Vercel automatically sends this as `Authorization: Bearer <value>` to
  /// its own scheduled invocations once the env var is set (see
  /// DEPLOYMENT.md); the admin dashboard's manual triggers pass it too.
  ///
  /// `.trim()`'d after validation: a value pasted into Vercel's dashboard
  /// from `openssl rand -base64 32 | pbcopy`-style commands can pick up a
  /// trailing newline or stray whitespace, which would otherwise make every
  /// strict `===` comparison in `@/lib/cron-auth` fail silently (the cron
  /// route 401s on every scheduled invocation, with nothing to indicate why
  /// — see DEPLOYMENT.md's diagnosed-incident writeup). Trimming here closes
  /// that failure class regardless of how the value was pasted in.
  CRON_SECRET: isProduction
    ? z.string().min(16, "CRON_SECRET is required in production — generate one with `openssl rand -hex 32`.").transform((value) => value.trim())
    : z
        .string()
        .min(1)
        .optional()
        .transform((value) => value?.trim()),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`).join("\n");
    throw new Error(
      `Invalid or missing environment variables:\n${issues}\n\nSee .env.production.example for the full list and where each value comes from.`,
    );
  }
  return parsed.data;
}

export const env = loadEnv();

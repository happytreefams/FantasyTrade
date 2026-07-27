import { env } from "@/lib/env";

/// Shared guard for every /api/cron/* route. Vercel automatically sends
/// `Authorization: Bearer <CRON_SECRET>` to its own scheduled invocations
/// once the env var is set (no extra Vercel-side config needed) — a
/// `?secret=` query param is also accepted, for a quick manual `curl`/browser
/// check per DEPLOYMENT.md. `env.ts` already makes CRON_SECRET required in
/// production, so the only way this resolves to "unprotected" is running
/// locally without ever having set it, which logs a warning rather than
/// silently doing nothing — a missing secret should be obvious, not quiet.
export function isAuthorizedCronRequest(request: Request): boolean {
  if (!env.CRON_SECRET) {
    console.warn("[cron] CRON_SECRET is not set — allowing an unauthenticated request. Do not deploy like this.");
    return true;
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${env.CRON_SECRET}`) return true;

  const url = new URL(request.url);
  if (url.searchParams.get("secret") === env.CRON_SECRET) return true;

  return false;
}

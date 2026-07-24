/// Just the stable cross-link IDs, with zero server-only dependencies (no
/// Prisma import) — safe to import from Client Components. The full
/// `@/lib/learning` module re-exports this too, for server-side callers.
export { LEARNING_LINKS } from "../../../prisma/seed-learning";

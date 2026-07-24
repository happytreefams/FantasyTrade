/// Simplified margin-trading assumptions — a real broker's margin math
/// (Reg T, portfolio margin, house requirements that vary by security) is
/// far more involved than this. These are fixed, clearly-labeled
/// illustrative constants for the simulator, not a real margin schedule.

/// Reserved against every open short position's current market value —
/// e.g. a $10,000 short market value reserves $15,000 of margin at 1.5x,
/// reducing buying power by that amount. Recomputed (not incrementally
/// tracked) after every trade and by the nightly job — see
/// `recomputeMarginUsed` in `@/lib/trading`.
export const MARGIN_REQUIREMENT_MULTIPLIER = 1.5;

/// If account equity relative to `marginUsed` falls below this fraction,
/// the nightly maintenance check flags the account with a margin call
/// warning (simulated only — this app never auto-liquidates).
export const MAINTENANCE_MARGIN_THRESHOLD = 0.3;

import Link from "next/link";

/// Shown across every page when the nightly maintenance-margin check has
/// flagged the account (`Account.marginCallActive`) — equity has fallen too
/// low relative to the margin reserved against open short positions.
/// Simulated only: this app never auto-liquidates a flagged account, so the
/// banner is purely informational, pointing the user to /portfolio to see
/// (and, if they choose, close) the short position(s) causing it.
export function MarginCallBanner() {
  return (
    <div role="alert" className="border-b border-negative/40 bg-negative-bg px-4 py-2.5 text-center text-caption text-negative sm:px-6">
      <span className="font-semibold">Margin call:</span> your account equity has fallen below the maintenance
      margin requirement on an open short position.{" "}
      <Link href="/portfolio" className="underline hover:no-underline">
        Review your positions
      </Link>{" "}
      — this is a simulated warning; nothing is auto-liquidated.
    </div>
  );
}

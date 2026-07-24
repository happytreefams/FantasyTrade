"use client";

import { useState } from "react";

/// Toggles between the Positions/Order history view, the Tax Lots &
/// Realized Gains report, and standing Pending Orders. All three panels are
/// server-rendered ahead of time and passed in as already-built React trees
/// — this component only decides which one is visible, so switching tabs
/// never triggers a fetch.
export function PortfolioTabs({
  positionsPanel,
  taxLotsPanel,
  pendingOrdersPanel,
}: {
  positionsPanel: React.ReactNode;
  taxLotsPanel: React.ReactNode;
  pendingOrdersPanel: React.ReactNode;
}) {
  const [tab, setTab] = useState<"positions" | "tax-lots" | "pending-orders">("positions");

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Portfolio detail" className="flex w-fit flex-wrap rounded-md border border-border p-1">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "positions"}
          onClick={() => setTab("positions")}
          className={`rounded px-3 py-1.5 text-body font-medium transition-colors ${
            tab === "positions" ? "bg-background-inset text-foreground" : "text-foreground-muted hover:text-foreground"
          }`}
        >
          Positions &amp; Orders
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "pending-orders"}
          onClick={() => setTab("pending-orders")}
          className={`rounded px-3 py-1.5 text-body font-medium transition-colors ${
            tab === "pending-orders" ? "bg-background-inset text-foreground" : "text-foreground-muted hover:text-foreground"
          }`}
        >
          Pending Orders
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "tax-lots"}
          onClick={() => setTab("tax-lots")}
          className={`rounded px-3 py-1.5 text-body font-medium transition-colors ${
            tab === "tax-lots" ? "bg-background-inset text-foreground" : "text-foreground-muted hover:text-foreground"
          }`}
        >
          Tax Lots &amp; Realized Gains
        </button>
      </div>

      {tab === "positions" ? positionsPanel : tab === "pending-orders" ? pendingOrdersPanel : taxLotsPanel}
    </div>
  );
}

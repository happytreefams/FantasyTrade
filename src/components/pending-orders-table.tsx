"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useToast } from "@/components/toast-provider";
import { formatCurrency, formatShares } from "@/lib/format";

export type PendingOrderRow = {
  id: string;
  symbol: string;
  name: string;
  side: "BUY" | "SELL";
  orderType: "LIMIT" | "STOP_LOSS" | "STOP_LIMIT";
  triggerPrice: string;
  limitPrice: string | null;
  quantity: string;
  createdAt: string;
  expiresAt: string | null;
};

const ORDER_TYPE_LABELS: Record<PendingOrderRow["orderType"], string> = {
  LIMIT: "Limit",
  STOP_LOSS: "Stop-loss",
  STOP_LIMIT: "Stop-limit",
};

/// Standing LIMIT/STOP_LOSS/STOP_LIMIT orders still awaiting their trigger —
/// each can be cancelled here before a future daily-close run evaluates it.
export function PendingOrdersTable({ orders }: { orders: PendingOrderRow[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  async function handleCancel(id: string) {
    setCancellingId(id);
    const response = await fetch(`/api/trade/pending/${id}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    setCancellingId(null);

    if (!response.ok) {
      showToast("error", data.error ?? "Couldn't cancel this order.");
      return;
    }

    showToast("success", "Order cancelled.");
    router.refresh();
  }

  if (orders.length === 0) {
    return <p className="p-4 text-body text-foreground-muted">No standing orders — limit, stop-loss, and stop-limit orders you place will show up here until they fill, expire, or you cancel them.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-body">
        <thead>
          <tr className="text-caption text-foreground-muted">
            <th className="px-4 py-2 text-left">Symbol</th>
            <th className="px-4 py-2 text-left">Side</th>
            <th className="px-4 py-2 text-left">Type</th>
            <th className="px-4 py-2 text-right">Quantity</th>
            <th className="px-4 py-2 text-right">Trigger</th>
            <th className="px-4 py-2 text-right">Limit</th>
            <th className="px-4 py-2 text-left">Placed</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-t border-border">
              <td className="px-4 py-3">
                <Link href={`/security/${encodeURIComponent(order.symbol)}`} className="font-medium hover:text-accent hover:underline">
                  {order.symbol}
                </Link>
                <div className="text-caption text-foreground-muted">{order.name}</div>
              </td>
              <td className={`px-4 py-3 ${order.side === "BUY" ? "text-positive" : "text-negative"}`}>{order.side}</td>
              <td className="px-4 py-3 text-caption text-foreground-muted">{ORDER_TYPE_LABELS[order.orderType]}</td>
              <td className="px-4 py-3 text-right font-financial">{formatShares(order.quantity)}</td>
              <td className="px-4 py-3 text-right font-financial">{formatCurrency(order.triggerPrice)}</td>
              <td className="px-4 py-3 text-right font-financial">{order.limitPrice ? formatCurrency(order.limitPrice) : "—"}</td>
              <td className="px-4 py-3 text-caption text-foreground-muted">{new Date(order.createdAt).toLocaleDateString("en-US")}</td>
              <td className="px-4 py-3 text-right">
                <button
                  type="button"
                  onClick={() => handleCancel(order.id)}
                  disabled={cancellingId === order.id}
                  className="rounded-md border border-border px-2.5 py-1 text-caption font-medium text-foreground-muted transition-colors hover:border-negative hover:text-negative disabled:opacity-50"
                >
                  {cancellingId === order.id ? "Cancelling…" : "Cancel"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

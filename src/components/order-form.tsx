"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useToast } from "@/components/toast-provider";
import { formatCurrency } from "@/lib/format";
import { LEARNING_LINKS } from "@/lib/learning/links";

export type OrderableSecurity = { id: string; symbol: string; lastClose: string | null };

type OrderType = "MARKET" | "LIMIT" | "STOP_LOSS" | "STOP_LIMIT";
type AmountMode = "SHARES" | "DOLLARS";

const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  MARKET: "Market",
  LIMIT: "Limit",
  STOP_LOSS: "Stop-loss",
  STOP_LIMIT: "Stop-limit",
};

const ORDER_TYPE_HELP: Record<OrderType, string> = {
  MARKET: "Fills immediately at the last close.",
  LIMIT: "Queues until a daily close meets your limit price or better, then fills at that close — otherwise stays pending.",
  STOP_LOSS: "Queues until a daily close crosses your stop price, then fills at that close like a market order — otherwise stays pending.",
  STOP_LIMIT: "Queues until a daily close crosses your stop price, then fills only if that same close is also within your limit — otherwise stays pending.",
};

/// The buy/sell order ticket itself — side, order type (market, limit,
/// stop-loss, stop-limit), an amount entered either in shares or in a
/// dollar amount (converted to fractional shares at the last close), and
/// whatever trigger/limit prices the chosen order type needs. Shared by the
/// Trade page's ticket (paired with a symbol search) and a security detail
/// page's panel (already scoped to one security). MARKET orders resolve
/// immediately; every other type is placed as a standing order and resolved
/// by a later daily-close run — see `@/lib/trading`.
export function OrderForm({
  security,
  cashBalance,
  pricesAsOf,
}: {
  security: OrderableSecurity | null;
  cashBalance: string;
  pricesAsOf?: string | null;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] = useState<OrderType>("MARKET");
  const [amountMode, setAmountMode] = useState<AmountMode>("SHARES");
  const [amount, setAmount] = useState("");
  const [triggerPrice, setTriggerPrice] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const lastClose = security?.lastClose ? Number(security.lastClose) : null;
  const needsTriggerPrice = orderType !== "MARKET";
  const needsLimitPrice = orderType === "STOP_LIMIT";

  const quantity = useMemo(() => {
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) return null;
    if (amountMode === "SHARES") return amountNum;
    if (!lastClose || lastClose <= 0) return null;
    return amountNum / lastClose;
  }, [amount, amountMode, lastClose]);

  const referencePrice = orderType === "MARKET" ? lastClose : Number(triggerPrice) || null;
  const estimatedTotal = useMemo(() => {
    if (!quantity || !referencePrice || referencePrice <= 0) return null;
    return quantity * referencePrice;
  }, [quantity, referencePrice]);

  function selectSide(next: "BUY" | "SELL") {
    setSide(next);
    if (next === "SELL") setAmountMode("SHARES");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!security || !quantity) return;
    if (needsTriggerPrice && !triggerPrice) return;
    if (needsLimitPrice && !limitPrice) return;

    setIsSubmitting(true);

    const response = await fetch("/api/trade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        securityId: security.id,
        side,
        quantity,
        orderType,
        ...(needsTriggerPrice ? { triggerPrice: Number(triggerPrice) } : {}),
        ...(needsLimitPrice ? { limitPrice: Number(limitPrice) } : {}),
      }),
    });

    const data = await response.json().catch(() => ({}));
    setIsSubmitting(false);

    if (!response.ok) {
      showToast("error", data.error ?? "Order failed.");
      return;
    }

    const shareLabel = quantity === 1 ? "share" : "shares";
    const shareCount = amountMode === "DOLLARS" ? quantity.toFixed(6) : amount;

    if (data.pendingOrder) {
      showToast(
        "info",
        `${ORDER_TYPE_LABELS[orderType]} order queued: ${side === "BUY" ? "buy" : "sell"} ${shareCount} ${shareLabel} of ${security.symbol}. It'll fill (or expire) on a future daily close.`,
      );
    } else {
      const verb = side === "BUY" ? "Bought" : "Sold";
      showToast("success", `${verb} ${shareCount} ${shareLabel} of ${security.symbol} at ${formatCurrency(security.lastClose ?? 0)}.`);
    }

    setAmount("");
    setTriggerPrice("");
    setLimitPrice("");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex h-fit flex-col gap-4 rounded-lg border border-border bg-background-elevated p-6"
    >
      <h2 className="text-title font-semibold">Order ticket</h2>

      <div className="flex rounded-md border border-border p-1" role="group" aria-label="Order side">
        {(["BUY", "SELL"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => selectSide(option)}
            aria-pressed={side === option}
            className={`flex-1 rounded px-3 py-1.5 text-body font-medium transition-colors ${
              side === option
                ? option === "BUY"
                  ? "bg-positive-bg text-positive"
                  : "bg-negative-bg text-negative"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            {option === "BUY" ? "Buy" : "Sell"}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap rounded-md border border-border p-1" role="group" aria-label="Order type">
        {(["MARKET", "LIMIT", "STOP_LOSS", "STOP_LIMIT"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setOrderType(option)}
            aria-pressed={orderType === option}
            className={`flex-1 rounded px-2 py-1.5 text-caption font-medium whitespace-nowrap transition-colors ${
              orderType === option ? "bg-background-inset text-foreground" : "text-foreground-muted hover:text-foreground"
            }`}
          >
            {ORDER_TYPE_LABELS[option]}
          </button>
        ))}
      </div>

      <Link
        href={`/learn/lessons/${LEARNING_LINKS.limitOrdersLesson}`}
        className="-mt-2 self-start text-caption text-accent hover:underline"
      >
        What&apos;s a limit order?
      </Link>

      <div className="text-body">
        <span className="text-foreground-muted">Symbol: </span>
        <span className="font-medium">{security ? security.symbol : "—"}</span>
      </div>

      {side === "BUY" ? (
        <div className="flex rounded-md border border-border p-1" role="group" aria-label="Amount entry mode">
          {(["SHARES", "DOLLARS"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setAmountMode(option)}
              aria-pressed={amountMode === option}
              className={`flex-1 rounded px-3 py-1.5 text-caption font-medium transition-colors ${
                amountMode === option ? "bg-background-inset text-foreground" : "text-foreground-muted hover:text-foreground"
              }`}
            >
              {option === "SHARES" ? "Buy in shares" : "Buy in $"}
            </button>
          ))}
        </div>
      ) : null}

      <label htmlFor="order-amount" className="flex flex-col gap-1.5 text-caption text-foreground-muted">
        {amountMode === "DOLLARS" ? "Amount ($)" : "Quantity (shares)"}
        <input
          id="order-amount"
          type="number"
          min={amountMode === "DOLLARS" ? 0.01 : 0.000001}
          step={amountMode === "DOLLARS" ? 0.01 : "any"}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className="rounded-md border border-border bg-background-inset px-3 py-2 text-body text-foreground outline-none focus:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          placeholder={amountMode === "DOLLARS" ? "0.00" : "0"}
        />
        {amountMode === "DOLLARS" && quantity ? (
          <span className="text-caption text-foreground-subtle">
            ≈ {quantity.toFixed(6)} shares at the last close{lastClose ? ` (${formatCurrency(lastClose)})` : ""}
          </span>
        ) : null}
      </label>

      {needsTriggerPrice ? (
        <label htmlFor="order-trigger-price" className="flex flex-col gap-1.5 text-caption text-foreground-muted">
          {orderType === "LIMIT" ? "Limit price" : "Stop price"}
          <input
            id="order-trigger-price"
            type="number"
            min={0.01}
            step={0.01}
            value={triggerPrice}
            onChange={(event) => setTriggerPrice(event.target.value)}
            className="rounded-md border border-border bg-background-inset px-3 py-2 text-body text-foreground outline-none focus:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            placeholder="0.00"
          />
        </label>
      ) : null}

      {needsLimitPrice ? (
        <label htmlFor="order-limit-price" className="flex flex-col gap-1.5 text-caption text-foreground-muted">
          Limit price (once stop triggers)
          <input
            id="order-limit-price"
            type="number"
            min={0.01}
            step={0.01}
            value={limitPrice}
            onChange={(event) => setLimitPrice(event.target.value)}
            className="rounded-md border border-border bg-background-inset px-3 py-2 text-body text-foreground outline-none focus:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            placeholder="0.00"
          />
        </label>
      ) : null}

      <div className="flex items-center justify-between text-body">
        <span className="text-foreground-muted">Estimated {side === "BUY" ? "cost" : "proceeds"}</span>
        <span className="font-financial font-medium">{estimatedTotal !== null ? formatCurrency(estimatedTotal) : "—"}</span>
      </div>

      <div className="flex items-center justify-between text-caption text-foreground-muted">
        <span>Cash available</span>
        <span className="font-financial">{formatCurrency(cashBalance)}</span>
      </div>

      <p className="rounded-md bg-background-inset px-3 py-2 text-caption text-foreground-muted">
        {orderType === "MARKET"
          ? `Prices shown are the most recent close, not real-time${pricesAsOf ? ` — as of ${pricesAsOf} close` : ""}.`
          : ORDER_TYPE_HELP[orderType]}
      </p>

      <button
        type="submit"
        disabled={!security || !quantity || (needsTriggerPrice && !triggerPrice) || (needsLimitPrice && !limitPrice) || isSubmitting}
        className="rounded-md bg-accent-solid px-3 py-2 text-body font-medium text-accent-foreground transition-colors hover:bg-accent-solid-hover disabled:opacity-50"
      >
        {isSubmitting
          ? "Placing order…"
          : `${side === "BUY" ? "Buy" : "Sell"} shares${orderType === "MARKET" ? "" : ` (${ORDER_TYPE_LABELS[orderType].toLowerCase()})`}`}
      </button>
    </form>
  );
}

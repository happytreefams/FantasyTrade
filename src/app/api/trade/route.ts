import { NextResponse } from "next/server";
import { z } from "zod";

import { checkTradeBadges } from "@/lib/badges";
import { requireAccount } from "@/lib/current-account";
import { placeOrder, placePendingOrder, TradingError } from "@/lib/trading";

const tradeSchema = z.object({
  securityId: z.string().min(1),
  side: z.enum(["BUY", "SELL"]),
  quantity: z.number().positive(),
  orderType: z.enum(["MARKET", "LIMIT", "STOP_LOSS", "STOP_LIMIT"]).default("MARKET"),
  /// The limit price for a LIMIT order, or the stop price for STOP_LOSS/STOP_LIMIT.
  triggerPrice: z.number().positive().optional(),
  /// Only meaningful (and required) for STOP_LIMIT — the price to use once the stop triggers.
  limitPrice: z.number().positive().optional(),
  /// Omit for a good-until-cancelled standing order.
  expiresAt: z.string().datetime().optional(),
});

export async function POST(request: Request) {
  const { session, account } = await requireAccount().catch(() => ({ session: null, account: null }));
  if (!session || !account) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = tradeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please provide a security, side, and a positive quantity." }, { status: 400 });
  }

  const { securityId, side, quantity, orderType, triggerPrice, limitPrice, expiresAt } = parsed.data;

  if (orderType !== "MARKET" && triggerPrice === undefined) {
    return NextResponse.json({ error: "A trigger price is required for this order type." }, { status: 400 });
  }
  if (orderType === "STOP_LIMIT" && limitPrice === undefined) {
    return NextResponse.json({ error: "A limit price is required for stop-limit orders." }, { status: 400 });
  }

  try {
    if (orderType === "MARKET") {
      const result = await placeOrder({ accountId: account.id, securityId, side, quantity });

      if (result.status === "REJECTED") {
        return NextResponse.json({ error: result.rejectionReason, order: result.order }, { status: 422 });
      }

      await checkTradeBadges(session.user.id, account.id);
      return NextResponse.json({ order: result.order }, { status: 201 });
    }

    const pendingOrder = await placePendingOrder({
      accountId: account.id,
      securityId,
      side,
      orderType,
      triggerPrice: triggerPrice!,
      limitPrice,
      quantity,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });

    return NextResponse.json({ pendingOrder }, { status: 201 });
  } catch (error) {
    if (error instanceof TradingError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}

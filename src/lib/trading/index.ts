import {
  Prisma,
  type Order,
  type OrderSide,
  type PendingOrder,
  type PendingOrderStatus,
  type PendingOrderType,
  type PrismaClient,
  type TaxTerm,
} from "@prisma/client";

import { MAINTENANCE_MARGIN_THRESHOLD, MARGIN_REQUIREMENT_MULTIPLIER } from "@/lib/constants";
import { getLatestPrice } from "@/lib/market-data";
import { getPortfolioSummary } from "@/lib/portfolio";
import { prisma as defaultPrisma } from "@/lib/prisma";

const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;
const LONG_TERM_HOLDING_DAYS = 365;

export type TradingErrorCode =
  | "SECURITY_NOT_FOUND"
  | "NO_PRICE_DATA"
  | "INVALID_QUANTITY"
  | "INVALID_LIMIT_PRICE"
  | "PENDING_ORDER_NOT_FOUND"
  | "NOT_PENDING";

export class TradingError extends Error {
  code: TradingErrorCode;

  constructor(code: TradingErrorCode, message: string) {
    super(message);
    this.name = "TradingError";
    this.code = code;
  }
}

export type PlaceOrderInput = {
  accountId: string;
  securityId: string;
  side: OrderSide;
  quantity: Prisma.Decimal.Value;
};

export type PlaceOrderResult = {
  order: Order;
  status: "FILLED" | "REJECTED";
  rejectionReason?: string;
};

/// Recomputes the aggregate Position row for (accountId, securityId) from
/// its currently-open PositionLots — quantity and average cost basis are
/// always derived from lots, never written independently, so Position stays
/// a display-only cache. `quantity` is signed: long lots minus short lots,
/// so a net-short security shows a negative Position.quantity. In steady
/// state only one direction has open lots at a time (BUY consumes SHORT
/// lots before opening LONG ones, and vice versa for SELL — see applyBuy/
/// applySell), so `avgCostBasis` is simply the weighted average of
/// whichever side is currently open. Removes the Position row once flat.
async function syncPositionFromLots(
  tx: Prisma.TransactionClient,
  accountId: string,
  securityId: string,
): Promise<void> {
  const openLots = await tx.positionLot.findMany({ where: { accountId, securityId, quantity: { gt: 0 } } });

  const longLots = openLots.filter((lot) => lot.direction === "LONG");
  const shortLots = openLots.filter((lot) => lot.direction === "SHORT");
  const longQuantity = longLots.reduce((sum, lot) => sum.plus(lot.quantity), new Prisma.Decimal(0));
  const shortQuantity = shortLots.reduce((sum, lot) => sum.plus(lot.quantity), new Prisma.Decimal(0));
  const netQuantity = longQuantity.minus(shortQuantity);

  if (netQuantity.isZero()) {
    await tx.position.deleteMany({ where: { accountId, securityId } });
    return;
  }

  const activeLots = netQuantity.greaterThan(0) ? longLots : shortLots;
  const activeQuantity = netQuantity.greaterThan(0) ? longQuantity : shortQuantity;
  const totalCost = activeLots.reduce((sum, lot) => sum.plus(lot.quantity.times(lot.costBasis)), new Prisma.Decimal(0));
  const avgCostBasis = totalCost.dividedBy(activeQuantity);

  await tx.position.upsert({
    where: { accountId_securityId: { accountId, securityId } },
    create: { accountId, securityId, quantity: netQuantity, avgCostBasis },
    update: { quantity: netQuantity, avgCostBasis },
  });
}

/// Marks every open short position's current margin requirement to market
/// and writes the total to `Account.marginUsed` — deliberately recomputed
/// from scratch rather than incrementally tracked (self-correcting, and
/// realistic: real margin requirements move with the price every day, not
/// just when a trade happens). Called after any trade that could change a
/// short position, and by the nightly maintenance check for every
/// margin-enabled account. A no-op (marginUsed → 0) once no shorts remain.
export async function recomputeMarginUsed(tx: Prisma.TransactionClient, accountId: string): Promise<Prisma.Decimal> {
  const shortPositions = await tx.position.findMany({ where: { accountId, quantity: { lt: 0 } } });

  let marginUsed = new Prisma.Decimal(0);
  for (const position of shortPositions) {
    const latest = await getLatestPrice(position.securityId, tx);
    if (!latest) continue;
    const shortMarketValue = latest.closePrice.times(position.quantity.abs());
    marginUsed = marginUsed.plus(shortMarketValue.times(MARGIN_REQUIREMENT_MULTIPLIER));
  }

  await tx.account.update({ where: { id: accountId }, data: { marginUsed } });
  return marginUsed;
}

function classifyHoldingPeriod(purchaseDate: Date, closedAt: Date): { holdingPeriodDays: number; term: TaxTerm } {
  const holdingPeriodDays = Math.floor((closedAt.getTime() - purchaseDate.getTime()) / MILLISECONDS_PER_DAY);
  return { holdingPeriodDays, term: holdingPeriodDays >= LONG_TERM_HOLDING_DAYS ? "LONG_TERM" : "SHORT_TERM" };
}

/// Applies a BUY's cash/lot mutation only — no Order row. Covers open SHORT
/// lots first, FIFO (buy-to-cover — `proceeds` is what was received opening
/// the short, `costBasis` is what it costs now to close it, so
/// `gainLoss = proceeds - costBasis` is positive when the price fell). Any
/// quantity left over after every short lot is covered opens a new LONG lot
/// at the fill price. Buying power is cash minus reserved margin, so an
/// open short elsewhere on the account reduces what's available here too.
async function applyBuy(
  tx: Prisma.TransactionClient,
  accountId: string,
  securityId: string,
  quantity: Prisma.Decimal,
  price: Prisma.Decimal,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const orderValue = price.times(quantity);
  const account = await tx.account.findUniqueOrThrow({ where: { id: accountId } });
  const buyingPower = account.cashBalance.minus(account.marginUsed);

  if (buyingPower.lessThan(orderValue)) {
    return { ok: false, reason: "Insufficient cash balance." };
  }

  const openShortLots = await tx.positionLot.findMany({
    where: { accountId, securityId, direction: "SHORT", quantity: { gt: 0 } },
    orderBy: { purchaseDate: "asc" },
  });
  const totalShort = openShortLots.reduce((sum, lot) => sum.plus(lot.quantity), new Prisma.Decimal(0));
  const coveredQuantity = quantity.lessThanOrEqualTo(totalShort) ? quantity : totalShort;
  const remainderForLong = quantity.minus(coveredQuantity);

  const closedAt = new Date();
  let remaining = coveredQuantity;

  for (const lot of openShortLots) {
    if (remaining.isZero()) break;

    const consumed = remaining.lessThanOrEqualTo(lot.quantity) ? remaining : lot.quantity;
    const proceeds = consumed.times(lot.costBasis);
    const costBasis = consumed.times(price);
    const { holdingPeriodDays, term } = classifyHoldingPeriod(lot.purchaseDate, closedAt);

    await tx.positionLot.update({ where: { id: lot.id }, data: { quantity: lot.quantity.minus(consumed) } });
    await tx.realizedGain.create({
      data: {
        accountId,
        securityId,
        direction: "SHORT",
        quantity: consumed,
        costBasis,
        proceeds,
        gainLoss: proceeds.minus(costBasis),
        holdingPeriodDays,
        term,
        closedAt,
      },
    });

    remaining = remaining.minus(consumed);
  }

  if (remainderForLong.greaterThan(0)) {
    await tx.positionLot.create({
      data: { accountId, securityId, direction: "LONG", quantity: remainderForLong, originalQuantity: remainderForLong, costBasis: price },
    });
  }

  await tx.account.update({ where: { id: accountId }, data: { cashBalance: account.cashBalance.minus(orderValue) } });
  await syncPositionFromLots(tx, accountId, securityId);
  await recomputeMarginUsed(tx, accountId);

  return { ok: true };
}

/// Applies a SELL's cash/lot mutation only — no Order row. Consumes open
/// LONG lots first, FIFO (existing behavior, unchanged). Any quantity left
/// after every long lot is sold opens (or adds to) a SHORT lot at the fill
/// price — but only if `account.marginEnabled`; this is the actual
/// server-side enforcement of the short-selling opt-in gate, checked here
/// rather than trusted from the UI. Selling short credits cash immediately
/// (the proceeds); the offsetting margin reservation is tracked separately
/// via `recomputeMarginUsed`, not a hold on this cash.
async function applySell(
  tx: Prisma.TransactionClient,
  accountId: string,
  securityId: string,
  quantity: Prisma.Decimal,
  price: Prisma.Decimal,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const openLongLots = await tx.positionLot.findMany({
    where: { accountId, securityId, direction: "LONG", quantity: { gt: 0 } },
    orderBy: { purchaseDate: "asc" },
  });
  const totalLong = openLongLots.reduce((sum, lot) => sum.plus(lot.quantity), new Prisma.Decimal(0));
  const remainderForShort = quantity.minus(totalLong);

  if (remainderForShort.greaterThan(0)) {
    const account = await tx.account.findUniqueOrThrow({ where: { id: accountId } });
    if (!account.marginEnabled) {
      return {
        ok: false,
        reason: "Insufficient shares to sell. Enable short selling & margin trading in Settings to sell beyond your current holdings.",
      };
    }
  }

  const closedAt = new Date();
  let remaining = quantity.lessThanOrEqualTo(totalLong) ? quantity : totalLong;

  for (const lot of openLongLots) {
    if (remaining.isZero()) break;

    const consumed = remaining.lessThanOrEqualTo(lot.quantity) ? remaining : lot.quantity;
    const lotCostBasis = consumed.times(lot.costBasis);
    const proceeds = consumed.times(price);
    const { holdingPeriodDays, term } = classifyHoldingPeriod(lot.purchaseDate, closedAt);

    await tx.positionLot.update({ where: { id: lot.id }, data: { quantity: lot.quantity.minus(consumed) } });
    await tx.realizedGain.create({
      data: {
        accountId,
        securityId,
        direction: "LONG",
        quantity: consumed,
        costBasis: lotCostBasis,
        proceeds,
        gainLoss: proceeds.minus(lotCostBasis),
        holdingPeriodDays,
        term,
        closedAt,
      },
    });

    remaining = remaining.minus(consumed);
  }

  if (remainderForShort.greaterThan(0)) {
    await tx.positionLot.create({
      data: { accountId, securityId, direction: "SHORT", quantity: remainderForShort, originalQuantity: remainderForShort, costBasis: price },
    });
  }

  const orderValue = price.times(quantity);
  const account = await tx.account.findUniqueOrThrow({ where: { id: accountId } });
  await tx.account.update({ where: { id: accountId }, data: { cashBalance: account.cashBalance.plus(orderValue) } });
  await syncPositionFromLots(tx, accountId, securityId);
  await recomputeMarginUsed(tx, accountId);

  return { ok: true };
}

/// Places and immediately resolves a MARKET order — fills or rejects at the
/// last close, right now. Standing orders (LIMIT/STOP_LOSS/STOP_LIMIT) go
/// through `placePendingOrder` instead; see that function and
/// `evaluatePendingOrders`. Quantity may be fractional (this app supports
/// fractional shares) — only a positive, finite amount is required.
export async function placeOrder(input: PlaceOrderInput, client: PrismaClient = defaultPrisma): Promise<PlaceOrderResult> {
  const quantity = new Prisma.Decimal(input.quantity);
  if (!quantity.isFinite() || quantity.lessThanOrEqualTo(0)) {
    throw new TradingError("INVALID_QUANTITY", "Quantity must be a positive number of shares.");
  }

  const security = await client.security.findUnique({ where: { id: input.securityId } });
  if (!security) {
    throw new TradingError("SECURITY_NOT_FOUND", "Security not found.");
  }

  const latestPrice = await getLatestPrice(input.securityId, client);
  if (!latestPrice) {
    throw new TradingError("NO_PRICE_DATA", `No price data available for ${security.symbol}.`);
  }

  const price = latestPrice.closePrice;

  return client.$transaction(async (tx) => {
    const result =
      input.side === "BUY"
        ? await applyBuy(tx, input.accountId, input.securityId, quantity, price)
        : await applySell(tx, input.accountId, input.securityId, quantity, price);

    const order = await tx.order.create({
      data: {
        accountId: input.accountId,
        securityId: input.securityId,
        side: input.side,
        orderType: "MARKET",
        quantity,
        priceAtExecution: price,
        status: result.ok ? "FILLED" : "REJECTED",
      },
    });

    return result.ok
      ? { order, status: "FILLED" as const }
      : { order, status: "REJECTED" as const, rejectionReason: result.reason };
  });
}

export type PlacePendingOrderInput = {
  accountId: string;
  securityId: string;
  side: OrderSide;
  orderType: PendingOrderType;
  triggerPrice: Prisma.Decimal.Value;
  limitPrice?: Prisma.Decimal.Value;
  quantity: Prisma.Decimal.Value;
  expiresAt?: Date | null;
};

/// Queues a standing LIMIT/STOP_LOSS/STOP_LIMIT order — no cash/lot
/// mutation and no cash/shares/margin check happens here (deferred entirely
/// to fill time via `evaluatePendingOrders`, same as the Tier 3 limit
/// orders this consolidates). GTC by default; pass `expiresAt` for a
/// good-until-date order.
export async function placePendingOrder(
  input: PlacePendingOrderInput,
  client: PrismaClient = defaultPrisma,
): Promise<PendingOrder> {
  const quantity = new Prisma.Decimal(input.quantity);
  if (!quantity.isFinite() || quantity.lessThanOrEqualTo(0)) {
    throw new TradingError("INVALID_QUANTITY", "Quantity must be a positive number of shares.");
  }

  const triggerPrice = new Prisma.Decimal(input.triggerPrice);
  if (!triggerPrice.isFinite() || triggerPrice.lessThanOrEqualTo(0)) {
    throw new TradingError("INVALID_LIMIT_PRICE", "Trigger price must be a positive amount.");
  }

  let limitPrice: Prisma.Decimal | null = null;
  if (input.orderType === "STOP_LIMIT") {
    limitPrice = new Prisma.Decimal(input.limitPrice ?? NaN);
    if (!limitPrice.isFinite() || limitPrice.lessThanOrEqualTo(0)) {
      throw new TradingError("INVALID_LIMIT_PRICE", "A limit price is required for stop-limit orders.");
    }
  }

  const security = await client.security.findUnique({ where: { id: input.securityId } });
  if (!security) {
    throw new TradingError("SECURITY_NOT_FOUND", "Security not found.");
  }

  return client.pendingOrder.create({
    data: {
      accountId: input.accountId,
      securityId: input.securityId,
      side: input.side,
      orderType: input.orderType,
      triggerPrice,
      limitPrice,
      quantity,
      expiresAt: input.expiresAt ?? null,
    },
  });
}

/// Cancels a still-pending standing order. Only the owning account may
/// cancel its own order, and only while it's still PENDING.
export async function cancelPendingOrder(
  pendingOrderId: string,
  accountId: string,
  client: PrismaClient = defaultPrisma,
): Promise<void> {
  const order = await client.pendingOrder.findUnique({ where: { id: pendingOrderId } });
  if (!order || order.accountId !== accountId) {
    throw new TradingError("PENDING_ORDER_NOT_FOUND", "Pending order not found.");
  }
  if (order.status !== "PENDING") {
    throw new TradingError("NOT_PENDING", "Only a pending order can be cancelled.");
  }

  await client.pendingOrder.update({ where: { id: pendingOrderId }, data: { status: "CANCELLED" } });
}

type TriggerCheckInput = {
  orderType: PendingOrderType;
  side: OrderSide;
  triggerPrice: Prisma.Decimal;
  limitPrice: Prisma.Decimal | null;
};

/// Whether `closePrice` — a single day's new close — satisfies a standing
/// order's condition. LIMIT fills at-or-better than `triggerPrice` (which
/// doubles as the limit price for that type); STOP_LOSS triggers into a
/// market fill once price crosses adversely; STOP_LIMIT requires crossing
/// `triggerPrice` *and* still being within `limitPrice` of it (a gap past
/// the limit does not fill, and keeps the order pending for a later day).
export function isPendingOrderTriggered(order: TriggerCheckInput, closePrice: Prisma.Decimal): boolean {
  if (order.orderType === "LIMIT") {
    return order.side === "BUY"
      ? closePrice.lessThanOrEqualTo(order.triggerPrice)
      : closePrice.greaterThanOrEqualTo(order.triggerPrice);
  }

  if (order.orderType === "STOP_LOSS") {
    return order.side === "BUY"
      ? closePrice.greaterThanOrEqualTo(order.triggerPrice)
      : closePrice.lessThanOrEqualTo(order.triggerPrice);
  }

  // STOP_LIMIT
  if (!order.limitPrice) return false;
  return order.side === "BUY"
    ? closePrice.greaterThanOrEqualTo(order.triggerPrice) && closePrice.lessThanOrEqualTo(order.limitPrice)
    : closePrice.lessThanOrEqualTo(order.triggerPrice) && closePrice.greaterThanOrEqualTo(order.limitPrice);
}

export type PendingOrderResolutionSummary = {
  filled: string[];
  expired: string[];
};

/// Resolves every PENDING standing order against each security's
/// just-updated closing price: fills when the trigger condition is met *and*
/// cash/shares/margin allow it, expires anything past `expiresAt`, and
/// otherwise leaves it pending for a later day — including when the
/// condition was met but the account couldn't actually afford the fill
/// (insufficient cash/shares/margin isn't a `PendingOrderStatus` value, so
/// it's simply retried on the next daily-close run rather than being
/// terminally rejected). Called by the daily-close job right after prices
/// are refreshed for the day.
export async function evaluatePendingOrders(client: PrismaClient = defaultPrisma): Promise<PendingOrderResolutionSummary> {
  const pending = await client.pendingOrder.findMany({
    where: { status: "PENDING" as PendingOrderStatus },
    include: { security: true },
    orderBy: { createdAt: "asc" },
  });

  const now = new Date();
  const summary: PendingOrderResolutionSummary = { filled: [], expired: [] };

  for (const order of pending) {
    if (order.expiresAt && order.expiresAt <= now) {
      await client.pendingOrder.update({ where: { id: order.id }, data: { status: "EXPIRED" } });
      summary.expired.push(order.security.symbol);
      continue;
    }

    const latest = await getLatestPrice(order.securityId, client);
    if (!latest) continue;
    if (!isPendingOrderTriggered(order, latest.closePrice)) continue;

    const filled = await client.$transaction(async (tx) => {
      const result =
        order.side === "BUY"
          ? await applyBuy(tx, order.accountId, order.securityId, order.quantity, latest.closePrice)
          : await applySell(tx, order.accountId, order.securityId, order.quantity, latest.closePrice);

      if (!result.ok) return false;

      await tx.order.create({
        data: {
          accountId: order.accountId,
          securityId: order.securityId,
          side: order.side,
          orderType: order.orderType,
          quantity: order.quantity,
          triggerPrice: order.triggerPrice,
          limitPrice: order.limitPrice,
          priceAtExecution: latest.closePrice,
          status: "FILLED",
        },
      });
      await tx.pendingOrder.update({ where: { id: order.id }, data: { status: "FILLED" } });
      return true;
    });

    if (filled) summary.filled.push(order.security.symbol);
  }

  return summary;
}

export type MarginMaintenanceSummary = {
  flagged: string[];
  cleared: string[];
};

/// The nightly maintenance-margin check for every margin-enabled account:
/// marks each account's margin requirement to market, then flags it with a
/// margin call warning (`Account.marginCallActive`) if equity relative to
/// that requirement falls below `MAINTENANCE_MARGIN_THRESHOLD`, or clears
/// the flag once it recovers. Simulated only — this app never auto-
/// liquidates a flagged account. Called by the daily-close job after prices
/// are refreshed for the day (margin requirements are marked-to-market
/// daily even without a new trade, since the underlying prices moved).
export async function checkMarginMaintenance(client: PrismaClient = defaultPrisma): Promise<MarginMaintenanceSummary> {
  const accounts = await client.account.findMany({ where: { marginEnabled: true } });
  const summary: MarginMaintenanceSummary = { flagged: [], cleared: [] };

  for (const account of accounts) {
    const marginUsed = await client.$transaction((tx) => recomputeMarginUsed(tx, account.id));

    let shouldFlag = false;
    if (!marginUsed.isZero()) {
      const portfolio = await getPortfolioSummary(account.id, client);
      const maintenanceRatio = portfolio.totalPortfolioValue.dividedBy(marginUsed);
      shouldFlag = maintenanceRatio.lessThan(MAINTENANCE_MARGIN_THRESHOLD);
    }

    if (shouldFlag !== account.marginCallActive) {
      await client.account.update({ where: { id: account.id }, data: { marginCallActive: shouldFlag } });
    }
    if (shouldFlag) summary.flagged.push(account.id);
    else summary.cleared.push(account.id);
  }

  return summary;
}

/// The public contract this module fulfills for the rest of the app — kept
/// here as a compile-time check that the module's shape stays stable for
/// consumers (API routes, the daily-close job). Execution against a
/// specific price source runs through `@/lib/market-data`'s
/// `MarketDataService`, so a future asset type with a different execution
/// model (e.g. options) can add its own order-placement path alongside this
/// one rather than reworking it. See ARCHITECTURE.md.
export interface TradingService {
  placeOrder: typeof placeOrder;
  placePendingOrder: typeof placePendingOrder;
  checkMarginMaintenance: typeof checkMarginMaintenance;
  cancelPendingOrder: typeof cancelPendingOrder;
  evaluatePendingOrders: typeof evaluatePendingOrders;
  recomputeMarginUsed: typeof recomputeMarginUsed;
}

import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { evaluatePendingOrders, isPendingOrderTriggered, placeOrder, placePendingOrder, TradingError } from "./index";

const SECURITY_ID = "sec_1";
const ACCOUNT_ID = "acc_1";
const DAY_MS = 1000 * 60 * 60 * 24;

type Direction = "LONG" | "SHORT";

type FakePosition = {
  id: string;
  accountId: string;
  securityId: string;
  quantity: Prisma.Decimal;
  avgCostBasis: Prisma.Decimal;
};

type FakeLot = {
  id: string;
  accountId: string;
  securityId: string;
  direction: Direction;
  quantity: Prisma.Decimal;
  originalQuantity: Prisma.Decimal;
  costBasis: Prisma.Decimal;
  purchaseDate: Date;
};

function positionKey(accountId: string, securityId: string): string {
  return `${accountId}:${securityId}`;
}

/// Minimal in-memory stand-in for the slice of PrismaClient that the trading
/// service touches — covers PositionLot direction (long/short), Account
/// margin fields, and PendingOrder, on top of the original cash/lot/order
/// mocking. Keeps these tests fast and independent of a live database.
function createFakeClient(options: {
  cashBalance?: string;
  marginEnabled?: boolean;
  marginUsed?: string;
  price?: string;
  lots?: Array<{ quantity: string; costBasis: string; purchaseDate: Date }>;
  shortLots?: Array<{ quantity: string; costBasis: string; purchaseDate: Date }>;
  withPrice?: boolean;
}) {
  const securities = new Map([[SECURITY_ID, { id: SECURITY_ID, symbol: "TEST" }]]);
  const priceHistory: Array<{ securityId: string; date: Date; closePrice: Prisma.Decimal }> =
    options.withPrice === false
      ? []
      : [{ securityId: SECURITY_ID, date: new Date("2026-01-01"), closePrice: new Prisma.Decimal(options.price ?? "100") }];
  const accounts = new Map([
    [
      ACCOUNT_ID,
      {
        id: ACCOUNT_ID,
        cashBalance: new Prisma.Decimal(options.cashBalance ?? "10000"),
        marginEnabled: options.marginEnabled ?? false,
        marginUsed: new Prisma.Decimal(options.marginUsed ?? "0"),
      },
    ],
  ]);

  let lotSeq = 0;
  function seedLots(rows: Array<{ quantity: string; costBasis: string; purchaseDate: Date }> | undefined, direction: Direction): FakeLot[] {
    return (rows ?? []).map((lot) => {
      lotSeq += 1;
      return {
        id: `lot_${lotSeq}`,
        accountId: ACCOUNT_ID,
        securityId: SECURITY_ID,
        direction,
        quantity: new Prisma.Decimal(lot.quantity),
        originalQuantity: new Prisma.Decimal(lot.quantity),
        costBasis: new Prisma.Decimal(lot.costBasis),
        purchaseDate: lot.purchaseDate,
      };
    });
  }

  const positionLots: FakeLot[] = [...seedLots(options.lots, "LONG"), ...seedLots(options.shortLots, "SHORT")];

  // Seed the aggregate Position row to match the initial lots, mirroring
  // what syncPositionFromLots would have produced — net long minus short.
  const positions = new Map<string, FakePosition>();
  if (positionLots.length > 0) {
    const longLots = positionLots.filter((lot) => lot.direction === "LONG");
    const shortLots = positionLots.filter((lot) => lot.direction === "SHORT");
    const longQty = longLots.reduce((sum, lot) => sum.plus(lot.quantity), new Prisma.Decimal(0));
    const shortQty = shortLots.reduce((sum, lot) => sum.plus(lot.quantity), new Prisma.Decimal(0));
    const netQuantity = longQty.minus(shortQty);

    if (!netQuantity.isZero()) {
      const activeLots = netQuantity.greaterThan(0) ? longLots : shortLots;
      const activeQty = netQuantity.greaterThan(0) ? longQty : shortQty;
      const totalCost = activeLots.reduce((sum, lot) => sum.plus(lot.quantity.times(lot.costBasis)), new Prisma.Decimal(0));
      const key = positionKey(ACCOUNT_ID, SECURITY_ID);
      positions.set(key, {
        id: `pos_${key}`,
        accountId: ACCOUNT_ID,
        securityId: SECURITY_ID,
        quantity: netQuantity,
        avgCostBasis: totalCost.dividedBy(activeQty),
      });
    }
  }

  const realizedGains: Array<Record<string, unknown>> = [];
  const orders: Array<Record<string, unknown>> = [];
  let orderSeq = 0;

  const pendingOrders: Array<Record<string, unknown>> = [];
  let pendingOrderSeq = 0;

  const client = {
    security: {
      findUnique: async ({ where }: { where: { id: string } }) => securities.get(where.id) ?? null,
    },
    priceHistory: {
      findFirst: async ({ where }: { where: { securityId: string } }) => {
        const rows = priceHistory.filter((row) => row.securityId === where.securityId);
        if (rows.length === 0) return null;
        return rows.reduce((latest, row) => (row.date > latest.date ? row : latest));
      },
    },
    account: {
      findUniqueOrThrow: async ({ where }: { where: { id: string } }) => {
        const account = accounts.get(where.id);
        if (!account) throw new Error("Account not found");
        return { ...account };
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const updated = { ...accounts.get(where.id), ...data };
        accounts.set(where.id, updated as (typeof accounts extends Map<string, infer V> ? V : never));
        return updated;
      },
    },
    positionLot: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        lotSeq += 1;
        const lot = { id: `lot_${lotSeq}`, direction: "LONG", ...data } as FakeLot;
        positionLots.push(lot);
        return lot;
      },
      findMany: async ({
        where,
        orderBy,
      }: {
        where: { accountId: string; securityId: string; direction?: Direction; quantity?: { gt: number } };
        orderBy?: { purchaseDate?: "asc" | "desc" };
      }) => {
        let rows = positionLots.filter((lot) => lot.accountId === where.accountId && lot.securityId === where.securityId);
        if (where.direction) rows = rows.filter((lot) => lot.direction === where.direction);
        if (where.quantity?.gt !== undefined) {
          const floor = where.quantity.gt;
          rows = rows.filter((lot) => lot.quantity.greaterThan(floor));
        }
        if (orderBy?.purchaseDate) {
          const direction = orderBy.purchaseDate === "asc" ? 1 : -1;
          rows = [...rows].sort((a, b) => direction * (a.purchaseDate.getTime() - b.purchaseDate.getTime()));
        }
        return rows;
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<FakeLot> }) => {
        const lot = positionLots.find((lot) => lot.id === where.id);
        if (!lot) throw new Error("Lot not found");
        Object.assign(lot, data);
        return lot;
      },
    },
    realizedGain: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const gain = { id: `gain_${realizedGains.length + 1}`, ...data };
        realizedGains.push(gain);
        return gain;
      },
    },
    position: {
      findUnique: async ({ where }: { where: { accountId_securityId: { accountId: string; securityId: string } } }) =>
        positions.get(positionKey(where.accountId_securityId.accountId, where.accountId_securityId.securityId)) ?? null,
      findMany: async ({ where }: { where: { accountId?: string; quantity?: { lt?: number; gt?: number } } }) => {
        let rows = [...positions.values()];
        if (where.accountId) rows = rows.filter((position) => position.accountId === where.accountId);
        if (where.quantity?.lt !== undefined) rows = rows.filter((position) => position.quantity.lessThan(where.quantity!.lt!));
        if (where.quantity?.gt !== undefined) rows = rows.filter((position) => position.quantity.greaterThan(where.quantity!.gt!));
        return rows;
      },
      upsert: async ({
        where,
        create,
        update,
      }: {
        where: { accountId_securityId: { accountId: string; securityId: string } };
        create: Omit<FakePosition, "id">;
        update: Partial<FakePosition>;
      }) => {
        const key = positionKey(where.accountId_securityId.accountId, where.accountId_securityId.securityId);
        const existing = positions.get(key);
        const result: FakePosition = existing ? { ...existing, ...update } : { id: `pos_${key}`, ...create };
        positions.set(key, result);
        return result;
      },
      deleteMany: async ({ where }: { where: { accountId: string; securityId: string } }) => {
        const key = positionKey(where.accountId, where.securityId);
        const existed = positions.delete(key);
        return { count: existed ? 1 : 0 };
      },
    },
    order: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        orderSeq += 1;
        const order = { id: `order_${orderSeq}`, createdAt: new Date(), ...data };
        orders.push(order);
        return order;
      },
    },
    pendingOrder: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        pendingOrderSeq += 1;
        const order = { id: `pending_${pendingOrderSeq}`, status: "PENDING", createdAt: new Date(), expiresAt: null, ...data };
        pendingOrders.push(order);
        return order;
      },
      findMany: async ({
        where,
        orderBy,
      }: {
        where?: { status?: string };
        orderBy?: { createdAt?: "asc" | "desc" };
      } = {}) => {
        let rows = [...pendingOrders];
        if (where?.status) rows = rows.filter((order) => order.status === where.status);
        if (orderBy?.createdAt) {
          const direction = orderBy.createdAt === "asc" ? 1 : -1;
          rows = rows.sort((a, b) => direction * ((a.createdAt as Date).getTime() - (b.createdAt as Date).getTime()));
        }
        return rows.map((order) => ({ ...order, security: securities.get(order.securityId as string) }));
      },
      findUnique: async ({ where }: { where: { id: string } }) => pendingOrders.find((order) => order.id === where.id) ?? null,
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const index = pendingOrders.findIndex((order) => order.id === where.id);
        if (index === -1) throw new Error("PendingOrder not found");
        pendingOrders[index] = { ...pendingOrders[index], ...data };
        return pendingOrders[index];
      },
    },
    $transaction: async (callback: (tx: unknown) => Promise<unknown>) => callback(client),
  };

  return { client, accounts, positions, positionLots, realizedGains, orders, pendingOrders, priceHistory };
}

describe("placeOrder — BUY", () => {
  it("fills the order, debits cash, opens a position, and creates one lot at the fill price", async () => {
    const { client, accounts, positions, positionLots } = createFakeClient({ cashBalance: "10000", price: "100" });

    const result = await placeOrder(
      { accountId: ACCOUNT_ID, securityId: SECURITY_ID, side: "BUY", quantity: 10 },
      client as never,
    );

    expect(result.status).toBe("FILLED");
    expect(accounts.get(ACCOUNT_ID)!.cashBalance.toString()).toBe("9000");
    const position = positions.get(positionKey(ACCOUNT_ID, SECURITY_ID))!;
    expect(position.quantity.toString()).toBe("10");
    expect(position.avgCostBasis.toString()).toBe("100");
    expect(positionLots).toHaveLength(1);
    expect(positionLots[0].quantity.toString()).toBe("10");
    expect(positionLots[0].costBasis.toString()).toBe("100");
    expect(positionLots[0].direction).toBe("LONG");
  });

  it("opens a second lot (not a merged average) on a second buy at a different price", async () => {
    const { client, positions, positionLots, priceHistory } = createFakeClient({ cashBalance: "100000", price: "100" });

    await placeOrder({ accountId: ACCOUNT_ID, securityId: SECURITY_ID, side: "BUY", quantity: 10 }, client as never);

    priceHistory.push({ securityId: SECURITY_ID, date: new Date("2026-01-02"), closePrice: new Prisma.Decimal("200") });
    await placeOrder({ accountId: ACCOUNT_ID, securityId: SECURITY_ID, side: "BUY", quantity: 10 }, client as never);

    expect(positionLots).toHaveLength(2);
    expect(positionLots[0].costBasis.toString()).toBe("100");
    expect(positionLots[1].costBasis.toString()).toBe("200");

    // The aggregate Position is still the dollar-weighted average across lots.
    const position = positions.get(positionKey(ACCOUNT_ID, SECURITY_ID))!;
    expect(position.quantity.toString()).toBe("20");
    expect(position.avgCostBasis.toString()).toBe("150");
  });

  it("rejects for insufficient cash and still logs the order", async () => {
    const { client, accounts, orders, positionLots } = createFakeClient({ cashBalance: "500", price: "100" });

    const result = await placeOrder(
      { accountId: ACCOUNT_ID, securityId: SECURITY_ID, side: "BUY", quantity: 10 },
      client as never,
    );

    expect(result.status).toBe("REJECTED");
    expect(result.rejectionReason).toMatch(/cash/i);
    expect(orders).toHaveLength(1);
    expect(orders[0].status).toBe("REJECTED");
    expect(accounts.get(ACCOUNT_ID)!.cashBalance.toString()).toBe("500");
    expect(positionLots).toHaveLength(0);
  });

  it("allows a fractional quantity", async () => {
    const { client, accounts, positions, positionLots } = createFakeClient({ cashBalance: "10000", price: "100" });

    const result = await placeOrder(
      { accountId: ACCOUNT_ID, securityId: SECURITY_ID, side: "BUY", quantity: 2.5 },
      client as never,
    );

    expect(result.status).toBe("FILLED");
    expect(accounts.get(ACCOUNT_ID)!.cashBalance.toString()).toBe("9750");
    expect(positions.get(positionKey(ACCOUNT_ID, SECURITY_ID))!.quantity.toString()).toBe("2.5");
    expect(positionLots[0].quantity.toString()).toBe("2.5");
  });
});

describe("placeOrder — SELL (single lot)", () => {
  it("fills the order, credits cash, and reduces the lot and position", async () => {
    const { client, accounts, positions, positionLots, realizedGains } = createFakeClient({
      cashBalance: "1000",
      price: "120",
      lots: [{ quantity: "10", costBasis: "100", purchaseDate: new Date(Date.now() - 10 * DAY_MS) }],
    });

    const result = await placeOrder(
      { accountId: ACCOUNT_ID, securityId: SECURITY_ID, side: "SELL", quantity: 4 },
      client as never,
    );

    expect(result.status).toBe("FILLED");
    expect(accounts.get(ACCOUNT_ID)!.cashBalance.toString()).toBe("1480");
    const position = positions.get(positionKey(ACCOUNT_ID, SECURITY_ID))!;
    expect(position.quantity.toString()).toBe("6");
    expect(position.avgCostBasis.toString()).toBe("100");
    expect(positionLots[0].quantity.toString()).toBe("6");

    expect(realizedGains).toHaveLength(1);
    expect(realizedGains[0].quantity).toStrictEqual(new Prisma.Decimal(4));
    expect((realizedGains[0].gainLoss as Prisma.Decimal).toString()).toBe("80"); // (120-100)*4
    expect(realizedGains[0].term).toBe("SHORT_TERM");
    expect(realizedGains[0].direction).toBe("LONG");
  });

  it("removes the position entirely when selling the full quantity", async () => {
    const { client, positions, positionLots } = createFakeClient({
      price: "120",
      lots: [{ quantity: "4", costBasis: "100", purchaseDate: new Date(Date.now() - 5 * DAY_MS) }],
    });

    const result = await placeOrder(
      { accountId: ACCOUNT_ID, securityId: SECURITY_ID, side: "SELL", quantity: 4 },
      client as never,
    );

    expect(result.status).toBe("FILLED");
    expect(positions.has(positionKey(ACCOUNT_ID, SECURITY_ID))).toBe(false);
    expect(positionLots[0].quantity.toString()).toBe("0");
  });

  it("rejects for insufficient shares when margin is not enabled, and still logs the order", async () => {
    const { client, orders, positions } = createFakeClient({
      price: "120",
      lots: [{ quantity: "3", costBasis: "100", purchaseDate: new Date() }],
    });

    const result = await placeOrder(
      { accountId: ACCOUNT_ID, securityId: SECURITY_ID, side: "SELL", quantity: 10 },
      client as never,
    );

    expect(result.status).toBe("REJECTED");
    expect(result.rejectionReason).toMatch(/shares/i);
    expect(orders).toHaveLength(1);
    expect(positions.get(positionKey(ACCOUNT_ID, SECURITY_ID))!.quantity.toString()).toBe("3");
  });

  it("rejects when there is no existing position at all and margin is not enabled", async () => {
    const { client, orders } = createFakeClient({ price: "120" });

    const result = await placeOrder(
      { accountId: ACCOUNT_ID, securityId: SECURITY_ID, side: "SELL", quantity: 1 },
      client as never,
    );

    expect(result.status).toBe("REJECTED");
    expect(orders).toHaveLength(1);
  });
});

describe("placeOrder — SELL consumes lots FIFO across a multi-lot position", () => {
  it("sells the oldest lot first, splitting across two lots and recording one RealizedGain per lot touched", async () => {
    const { client, positions, positionLots, realizedGains, accounts } = createFakeClient({
      cashBalance: "0",
      price: "150",
      lots: [
        // Bought first, 400 days ago — long-term by the time of this sell.
        { quantity: "10", costBasis: "100", purchaseDate: new Date(Date.now() - 400 * DAY_MS) },
        // Bought second, 10 days ago — short-term.
        { quantity: "10", costBasis: "120", purchaseDate: new Date(Date.now() - 10 * DAY_MS) },
      ],
    });

    const result = await placeOrder(
      { accountId: ACCOUNT_ID, securityId: SECURITY_ID, side: "SELL", quantity: 15 },
      client as never,
    );

    expect(result.status).toBe("FILLED");

    // FIFO: the older lot (cost 100) is fully consumed (10 shares), then 5
    // shares come from the newer lot (cost 120) — not an averaged cost basis.
    expect(positionLots[0].quantity.toString()).toBe("0");
    expect(positionLots[1].quantity.toString()).toBe("5");

    expect(realizedGains).toHaveLength(2);

    const [firstGain, secondGain] = realizedGains as Array<{
      quantity: Prisma.Decimal;
      costBasis: Prisma.Decimal;
      proceeds: Prisma.Decimal;
      gainLoss: Prisma.Decimal;
      term: string;
      holdingPeriodDays: number;
    }>;

    expect(firstGain.quantity.toString()).toBe("10");
    expect(firstGain.costBasis.toString()).toBe("1000"); // 10 * 100
    expect(firstGain.proceeds.toString()).toBe("1500"); // 10 * 150
    expect(firstGain.gainLoss.toString()).toBe("500");
    expect(firstGain.term).toBe("LONG_TERM");
    expect(firstGain.holdingPeriodDays).toBeGreaterThanOrEqual(365);

    expect(secondGain.quantity.toString()).toBe("5");
    expect(secondGain.costBasis.toString()).toBe("600"); // 5 * 120
    expect(secondGain.proceeds.toString()).toBe("750"); // 5 * 150
    expect(secondGain.gainLoss.toString()).toBe("150");
    expect(secondGain.term).toBe("SHORT_TERM");
    expect(secondGain.holdingPeriodDays).toBeLessThan(365);

    // The remaining position is just the leftover 5 shares of the newer lot.
    const position = positions.get(positionKey(ACCOUNT_ID, SECURITY_ID))!;
    expect(position.quantity.toString()).toBe("5");
    expect(position.avgCostBasis.toString()).toBe("120");

    // Proceeds credited: 15 * 150 = 2250.
    expect(accounts.get(ACCOUNT_ID)!.cashBalance.toString()).toBe("2250");
  });
});

describe("placeOrder — short selling", () => {
  it("opens a short position when SELL exceeds holdings and margin is enabled", async () => {
    const { client, accounts, positions, positionLots } = createFakeClient({
      cashBalance: "0",
      price: "50",
      marginEnabled: true,
    });

    const result = await placeOrder(
      { accountId: ACCOUNT_ID, securityId: SECURITY_ID, side: "SELL", quantity: 10 },
      client as never,
    );

    expect(result.status).toBe("FILLED");
    expect(accounts.get(ACCOUNT_ID)!.cashBalance.toString()).toBe("500"); // proceeds credited
    const position = positions.get(positionKey(ACCOUNT_ID, SECURITY_ID))!;
    expect(position.quantity.toString()).toBe("-10");
    expect(position.avgCostBasis.toString()).toBe("50");
    expect(positionLots[0].direction).toBe("SHORT");

    // Margin used is recomputed to 1.5x the short's market value (10 * 50 * 1.5).
    expect(accounts.get(ACCOUNT_ID)!.marginUsed.toString()).toBe("750");
  });

  it("sells the available long lots first, then opens a short for only the excess (margin enabled)", async () => {
    const { client, positions, positionLots } = createFakeClient({
      cashBalance: "0",
      price: "50",
      marginEnabled: true,
      lots: [{ quantity: "4", costBasis: "40", purchaseDate: new Date(Date.now() - 10 * DAY_MS) }],
    });

    const result = await placeOrder(
      { accountId: ACCOUNT_ID, securityId: SECURITY_ID, side: "SELL", quantity: 10 },
      client as never,
    );

    expect(result.status).toBe("FILLED");
    expect(positionLots[0].quantity.toString()).toBe("0"); // long lot fully consumed
    const shortLot = positionLots.find((lot) => lot.direction === "SHORT")!;
    expect(shortLot.quantity.toString()).toBe("6"); // 10 requested - 4 covered by longs

    const position = positions.get(positionKey(ACCOUNT_ID, SECURITY_ID))!;
    expect(position.quantity.toString()).toBe("-6");
  });

  it("covers a short position on a BUY, crediting the inverse gain/loss when the price fell", async () => {
    const { client, accounts, positions, realizedGains } = createFakeClient({
      cashBalance: "500",
      price: "35",
      marginEnabled: true,
      shortLots: [{ quantity: "10", costBasis: "50", purchaseDate: new Date(Date.now() - 5 * DAY_MS) }],
    });

    const result = await placeOrder(
      { accountId: ACCOUNT_ID, securityId: SECURITY_ID, side: "BUY", quantity: 10 },
      client as never,
    );

    expect(result.status).toBe("FILLED");
    expect(accounts.get(ACCOUNT_ID)!.cashBalance.toString()).toBe("150"); // 500 - 10*35 cover cost
    expect(positions.has(positionKey(ACCOUNT_ID, SECURITY_ID))).toBe(false); // fully covered, flat

    expect(realizedGains).toHaveLength(1);
    const gain = realizedGains[0] as { direction: string; proceeds: Prisma.Decimal; costBasis: Prisma.Decimal; gainLoss: Prisma.Decimal };
    expect(gain.direction).toBe("SHORT");
    expect(gain.proceeds.toString()).toBe("500"); // 10 * 50 received when shorted
    expect(gain.costBasis.toString()).toBe("350"); // 10 * 35 paid to cover
    expect(gain.gainLoss.toString()).toBe("150"); // profited as price fell

    // No shorts remain, so margin used drops back to 0.
    expect(accounts.get(ACCOUNT_ID)!.marginUsed.toString()).toBe("0");
  });

  it("covering only part of a short leaves the remainder open and margin partially reserved", async () => {
    const { client, positions, accounts } = createFakeClient({
      cashBalance: "1000",
      price: "40",
      marginEnabled: true,
      shortLots: [{ quantity: "10", costBasis: "50", purchaseDate: new Date(Date.now() - 5 * DAY_MS) }],
    });

    await placeOrder({ accountId: ACCOUNT_ID, securityId: SECURITY_ID, side: "BUY", quantity: 4 }, client as never);

    const position = positions.get(positionKey(ACCOUNT_ID, SECURITY_ID))!;
    expect(position.quantity.toString()).toBe("-6");
    // Remaining short market value 6*40=240, reserved at 1.5x = 360.
    expect(accounts.get(ACCOUNT_ID)!.marginUsed.toString()).toBe("360");
  });

  it("a BUY that exceeds the short opens a new long position for the remainder", async () => {
    const { client, positions, positionLots } = createFakeClient({
      cashBalance: "1000",
      price: "40",
      marginEnabled: true,
      shortLots: [{ quantity: "5", costBasis: "50", purchaseDate: new Date(Date.now() - 5 * DAY_MS) }],
    });

    await placeOrder({ accountId: ACCOUNT_ID, securityId: SECURITY_ID, side: "BUY", quantity: 8 }, client as never);

    const position = positions.get(positionKey(ACCOUNT_ID, SECURITY_ID))!;
    expect(position.quantity.toString()).toBe("3"); // 8 bought - 5 covered = 3 long
    const longLot = positionLots.find((lot) => lot.direction === "LONG")!;
    expect(longLot.quantity.toString()).toBe("3");
    expect(longLot.costBasis.toString()).toBe("40");
  });

  it("rejects a BUY when cash minus reserved margin (not cash alone) is insufficient", async () => {
    const { client, accounts, orders } = createFakeClient({ cashBalance: "1000", price: "100", marginEnabled: true });
    // Seed marginUsed as if a short elsewhere already reserved 950, leaving
    // only 50 of buying power for a new $100 purchase — cash alone (1000)
    // would easily cover it, but buying power (cash - marginUsed) doesn't.
    accounts.set(ACCOUNT_ID, { ...accounts.get(ACCOUNT_ID)!, marginUsed: new Prisma.Decimal(950) });

    const result = await placeOrder(
      { accountId: ACCOUNT_ID, securityId: SECURITY_ID, side: "BUY", quantity: 1 },
      client as never,
    );

    expect(result.status).toBe("REJECTED");
    expect(result.rejectionReason).toMatch(/cash/i);
    expect(orders).toHaveLength(1);
  });
});

describe("placeOrder — validation", () => {
  it("throws for a zero or negative quantity", async () => {
    const { client } = createFakeClient({});
    await expect(
      placeOrder({ accountId: ACCOUNT_ID, securityId: SECURITY_ID, side: "BUY", quantity: 0 }, client as never),
    ).rejects.toThrow(TradingError);
  });

  it("throws when the security doesn't exist", async () => {
    const { client } = createFakeClient({});
    await expect(
      placeOrder({ accountId: ACCOUNT_ID, securityId: "does-not-exist", side: "BUY", quantity: 1 }, client as never),
    ).rejects.toThrow(/not found/i);
  });

  it("throws when there is no price data yet", async () => {
    const { client } = createFakeClient({ withPrice: false });
    await expect(
      placeOrder({ accountId: ACCOUNT_ID, securityId: SECURITY_ID, side: "BUY", quantity: 1 }, client as never),
    ).rejects.toThrow(/price/i);
  });
});

describe("placePendingOrder", () => {
  it("queues a LIMIT order as PENDING without touching cash or lots", async () => {
    const { client, accounts, positionLots, pendingOrders } = createFakeClient({ cashBalance: "10000", price: "100" });

    const order = await placePendingOrder(
      { accountId: ACCOUNT_ID, securityId: SECURITY_ID, side: "BUY", orderType: "LIMIT", triggerPrice: 90, quantity: 10 },
      client as never,
    );

    expect(order.status).toBe("PENDING");
    expect(pendingOrders).toHaveLength(1);
    expect(accounts.get(ACCOUNT_ID)!.cashBalance.toString()).toBe("10000");
    expect(positionLots).toHaveLength(0);
  });

  it("throws for a missing or non-positive trigger price", async () => {
    const { client } = createFakeClient({});
    await expect(
      placePendingOrder(
        { accountId: ACCOUNT_ID, securityId: SECURITY_ID, side: "BUY", orderType: "LIMIT", triggerPrice: 0, quantity: 1 },
        client as never,
      ),
    ).rejects.toThrow(TradingError);
  });

  it("throws for a STOP_LIMIT order missing its limit price", async () => {
    const { client } = createFakeClient({});
    await expect(
      placePendingOrder(
        { accountId: ACCOUNT_ID, securityId: SECURITY_ID, side: "SELL", orderType: "STOP_LIMIT", triggerPrice: 90, quantity: 1 },
        client as never,
      ),
    ).rejects.toThrow(TradingError);
  });
});

describe("isPendingOrderTriggered", () => {
  it("LIMIT: BUY fills at or below the trigger price", () => {
    const order = { orderType: "LIMIT" as const, side: "BUY" as const, triggerPrice: new Prisma.Decimal(95), limitPrice: null };
    expect(isPendingOrderTriggered(order, new Prisma.Decimal(90))).toBe(true);
    expect(isPendingOrderTriggered(order, new Prisma.Decimal(95))).toBe(true);
    expect(isPendingOrderTriggered(order, new Prisma.Decimal(96))).toBe(false);
  });

  it("LIMIT: SELL fills at or above the trigger price", () => {
    const order = { orderType: "LIMIT" as const, side: "SELL" as const, triggerPrice: new Prisma.Decimal(105), limitPrice: null };
    expect(isPendingOrderTriggered(order, new Prisma.Decimal(110))).toBe(true);
    expect(isPendingOrderTriggered(order, new Prisma.Decimal(105))).toBe(true);
    expect(isPendingOrderTriggered(order, new Prisma.Decimal(100))).toBe(false);
  });

  it("STOP_LOSS: SELL triggers at or below the stop price (protects a long)", () => {
    const order = { orderType: "STOP_LOSS" as const, side: "SELL" as const, triggerPrice: new Prisma.Decimal(90), limitPrice: null };
    expect(isPendingOrderTriggered(order, new Prisma.Decimal(85))).toBe(true);
    expect(isPendingOrderTriggered(order, new Prisma.Decimal(95))).toBe(false);
  });

  it("STOP_LOSS: BUY triggers at or above the stop price (protects a short)", () => {
    const order = { orderType: "STOP_LOSS" as const, side: "BUY" as const, triggerPrice: new Prisma.Decimal(60), limitPrice: null };
    expect(isPendingOrderTriggered(order, new Prisma.Decimal(65))).toBe(true);
    expect(isPendingOrderTriggered(order, new Prisma.Decimal(55))).toBe(false);
  });

  it("STOP_LIMIT: SELL only fills within [limitPrice, triggerPrice] once triggered", () => {
    const order = { orderType: "STOP_LIMIT" as const, side: "SELL" as const, triggerPrice: new Prisma.Decimal(90), limitPrice: new Prisma.Decimal(85) };
    expect(isPendingOrderTriggered(order, new Prisma.Decimal(87))).toBe(true); // triggered and within limit
    expect(isPendingOrderTriggered(order, new Prisma.Decimal(95))).toBe(false); // not yet triggered
    expect(isPendingOrderTriggered(order, new Prisma.Decimal(80))).toBe(false); // gapped past the limit
  });

  it("STOP_LIMIT: BUY only fills within [triggerPrice, limitPrice] once triggered", () => {
    const order = { orderType: "STOP_LIMIT" as const, side: "BUY" as const, triggerPrice: new Prisma.Decimal(60), limitPrice: new Prisma.Decimal(65) };
    expect(isPendingOrderTriggered(order, new Prisma.Decimal(62))).toBe(true);
    expect(isPendingOrderTriggered(order, new Prisma.Decimal(55))).toBe(false);
    expect(isPendingOrderTriggered(order, new Prisma.Decimal(70))).toBe(false);
  });
});

describe("evaluatePendingOrders", () => {
  it("fills a STOP_LOSS SELL when the new close crosses the stop price, at that close", async () => {
    const { client, accounts, positions, priceHistory, orders, pendingOrders } = createFakeClient({
      cashBalance: "0",
      price: "100",
      lots: [{ quantity: "10", costBasis: "90", purchaseDate: new Date(Date.now() - 20 * DAY_MS) }],
    });

    await placePendingOrder(
      { accountId: ACCOUNT_ID, securityId: SECURITY_ID, side: "SELL", orderType: "STOP_LOSS", triggerPrice: 95, quantity: 10 },
      client as never,
    );

    priceHistory.push({ securityId: SECURITY_ID, date: new Date("2026-01-02"), closePrice: new Prisma.Decimal("92") });
    const summary = await evaluatePendingOrders(client as never);

    expect(summary.filled).toEqual(["TEST"]);
    expect(pendingOrders[0].status).toBe("FILLED");
    expect(orders).toHaveLength(1);
    expect((orders[0].priceAtExecution as Prisma.Decimal).toString()).toBe("92");
    expect(accounts.get(ACCOUNT_ID)!.cashBalance.toString()).toBe("920"); // 10 * 92
    expect(positions.has(positionKey(ACCOUNT_ID, SECURITY_ID))).toBe(false);
  });

  it("leaves a LIMIT order pending (not expired) when the close doesn't meet it", async () => {
    const { client, priceHistory, pendingOrders } = createFakeClient({ cashBalance: "10000", price: "100" });

    await placePendingOrder(
      { accountId: ACCOUNT_ID, securityId: SECURITY_ID, side: "BUY", orderType: "LIMIT", triggerPrice: 95, quantity: 10 },
      client as never,
    );

    priceHistory.push({ securityId: SECURITY_ID, date: new Date("2026-01-02"), closePrice: new Prisma.Decimal("110") });
    const summary = await evaluatePendingOrders(client as never);

    expect(summary.filled).toEqual([]);
    expect(summary.expired).toEqual([]);
    expect(pendingOrders[0].status).toBe("PENDING");
  });

  it("expires an order once its expiresAt date has passed, without filling it", async () => {
    const { client, priceHistory, pendingOrders, orders } = createFakeClient({ cashBalance: "10000", price: "100" });

    await placePendingOrder(
      {
        accountId: ACCOUNT_ID,
        securityId: SECURITY_ID,
        side: "BUY",
        orderType: "LIMIT",
        triggerPrice: 95,
        quantity: 10,
        expiresAt: new Date(Date.now() - DAY_MS),
      },
      client as never,
    );

    priceHistory.push({ securityId: SECURITY_ID, date: new Date("2026-01-02"), closePrice: new Prisma.Decimal("90") });
    const summary = await evaluatePendingOrders(client as never);

    expect(summary.expired).toEqual(["TEST"]);
    expect(pendingOrders[0].status).toBe("EXPIRED");
    expect(orders).toHaveLength(0);
  });

  it("does not fill a STOP_LIMIT SELL when the close gaps past the limit, leaving it pending", async () => {
    const { client, priceHistory, pendingOrders, orders } = createFakeClient({
      price: "100",
      lots: [{ quantity: "10", costBasis: "90", purchaseDate: new Date(Date.now() - 20 * DAY_MS) }],
    });

    await placePendingOrder(
      {
        accountId: ACCOUNT_ID,
        securityId: SECURITY_ID,
        side: "SELL",
        orderType: "STOP_LIMIT",
        triggerPrice: 90,
        limitPrice: 85,
        quantity: 10,
      },
      client as never,
    );

    // Triggered (below 90) but gapped past the limit (below 85) — should not fill.
    priceHistory.push({ securityId: SECURITY_ID, date: new Date("2026-01-02"), closePrice: new Prisma.Decimal("80") });
    const summary = await evaluatePendingOrders(client as never);

    expect(summary.filled).toEqual([]);
    expect(pendingOrders[0].status).toBe("PENDING");
    expect(orders).toHaveLength(0);
  });
});

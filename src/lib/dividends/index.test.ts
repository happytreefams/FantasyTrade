import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { computeQuarterlyDividendPerShare, quarterKey, quarterStartDate } from "./index";

describe("quarterKey", () => {
  it("labels each calendar quarter correctly", () => {
    expect(quarterKey(new Date("2026-01-15T00:00:00.000Z"))).toBe("2026-Q1");
    expect(quarterKey(new Date("2026-03-31T00:00:00.000Z"))).toBe("2026-Q1");
    expect(quarterKey(new Date("2026-04-01T00:00:00.000Z"))).toBe("2026-Q2");
    expect(quarterKey(new Date("2026-07-22T00:00:00.000Z"))).toBe("2026-Q3");
    expect(quarterKey(new Date("2026-12-31T00:00:00.000Z"))).toBe("2026-Q4");
  });
});

describe("quarterStartDate", () => {
  it("returns the first calendar day (UTC) of the containing quarter", () => {
    expect(quarterStartDate(new Date("2026-07-22T00:00:00.000Z")).toISOString().slice(0, 10)).toBe("2026-07-01");
    expect(quarterStartDate(new Date("2026-01-01T00:00:00.000Z")).toISOString().slice(0, 10)).toBe("2026-01-01");
    expect(quarterStartDate(new Date("2026-12-31T00:00:00.000Z")).toISOString().slice(0, 10)).toBe("2026-10-01");
  });
});

describe("computeQuarterlyDividendPerShare", () => {
  it("is (annual yield * last close) / 4", () => {
    const perShare = computeQuarterlyDividendPerShare(new Prisma.Decimal("0.02"), new Prisma.Decimal("100"));
    expect(perShare.toString()).toBe("0.5"); // 0.02 * 100 / 4
  });

  it("scales with a higher close price", () => {
    const perShare = computeQuarterlyDividendPerShare(new Prisma.Decimal("0.04"), new Prisma.Decimal("250"));
    expect(perShare.toString()).toBe("2.5"); // 0.04 * 250 / 4
  });

  it("is zero for a zero yield", () => {
    const perShare = computeQuarterlyDividendPerShare(new Prisma.Decimal("0"), new Prisma.Decimal("100"));
    expect(perShare.isZero()).toBe(true);
  });
});

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

// maximumFractionDigits matches the schema's 6-decimal-place precision for
// fractional shares (e.g. a tiny DRIP reinvestment) — without this, Intl's
// default of 3 rounds a real quantity like 0.000495 down to a misleading "0".
const shareFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 });

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function formatCurrency(value: number | string): string {
  return currencyFormatter.format(Number(value));
}

/// `value` is already a percentage number (e.g. 12.34 for +12.34%).
export function formatPercent(value: number | string): string {
  const num = Number(value);
  return `${num >= 0 ? "+" : ""}${num.toFixed(2)}%`;
}

export function formatShares(value: number | string): string {
  return shareFormatter.format(Number(value));
}

/// Abbreviates a large dollar figure (market cap) to T/B/M — "3.02T" instead
/// of "3,020,281,999,360".
export function formatMarketCap(value: number | string): string {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return "—";

  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  return formatCurrency(num);
}

/// PriceHistory/AccountValueHistory dates are stored as UTC midnight —
/// format in UTC so the displayed date never shifts a day off in the client.
export function formatAsOfDate(date: Date | string | null): string | null {
  if (!date) return null;
  return dateFormatter.format(new Date(date));
}

export type GlossaryTermData = {
  id: string;
  term: string;
  definition: string;
  relatedLessonId: string | null;
};

/// Financial terms already used across the app, defined in plain language
/// for the inline glossary tooltip (`<GlossaryTerm>`) and the standalone
/// /learn/glossary page. `id` is a stable slug (not a cuid), same
/// "admin-lite" pattern as `prisma/seed-learning.ts` — re-run the seed to
/// add/edit terms. `relatedLessonId` links to the lesson that covers the
/// term in depth where one exists; left null for terms that are Analytics/
/// portfolio-page concepts without a dedicated lesson.
export const GLOSSARY_TERMS: GlossaryTermData[] = [
  {
    id: "pe-ratio",
    term: "P/E Ratio",
    definition: "Price-to-earnings ratio — a stock's price divided by its earnings per share. A rough measure of how expensive a stock is relative to the profit it actually generates.",
    relatedLessonId: null,
  },
  {
    id: "dividend-yield",
    term: "Dividend Yield",
    definition: "A security's annual dividend payments as a percentage of its current price — how much cash income you'd earn per dollar invested, before any price change.",
    relatedLessonId: null,
  },
  {
    id: "market-cap",
    term: "Market Cap",
    definition: "Market capitalization — a company's share price multiplied by its total number of shares outstanding. A rough measure of the company's total size.",
    relatedLessonId: null,
  },
  {
    id: "beta",
    term: "Beta",
    definition: "How much a portfolio or security tends to move relative to a benchmark. A beta of 1.0 means it moves with the market; above 1.0 means larger swings, below means smaller.",
    relatedLessonId: null,
  },
  {
    id: "volatility",
    term: "Volatility",
    definition: "How much a portfolio's value swings day to day, annualized. Higher volatility means a bumpier ride, in either direction.",
    relatedLessonId: "course-risk-l1",
  },
  {
    id: "sharpe-ratio",
    term: "Sharpe Ratio",
    definition: "Return earned per unit of risk taken, above a risk-free baseline. Higher is better — it rewards strong returns achieved without excessive volatility.",
    relatedLessonId: null,
  },
  {
    id: "diversification",
    term: "Diversification",
    definition: "Spreading money across many different holdings so that a bad outcome for any single one doesn't sink the whole portfolio.",
    relatedLessonId: "course-risk-l2",
  },
  {
    id: "asset-allocation",
    term: "Asset Allocation",
    definition: "How a portfolio is split across broad categories — stocks, bonds, commodities, cash — based on goals, time horizon, and risk tolerance.",
    relatedLessonId: "course-risk-l3",
  },
  {
    id: "cost-basis",
    term: "Cost Basis",
    definition: "What you originally paid for an investment (including any fees), used to calculate gain or loss when you eventually sell it.",
    relatedLessonId: "course-portfolio-l1",
  },
  {
    id: "market-order",
    term: "Market Order",
    definition: "An order to buy or sell immediately at the best available price, rather than waiting for a specific price target.",
    relatedLessonId: "course-order-types-l1",
  },
  {
    id: "limit-order",
    term: "Limit Order",
    definition: "An order that only fills at a specified price or better, rather than executing immediately at whatever the current price is.",
    relatedLessonId: "course-order-types-l2",
  },
  {
    id: "stop-loss",
    term: "Stop-Loss",
    definition: "A standing order that triggers a market sale once a security's price falls to (or below) a specified level — a way to cap downside without watching the market constantly.",
    relatedLessonId: "course-order-types-l2",
  },
  {
    id: "stop-limit",
    term: "Stop-Limit",
    definition: "Like a stop-loss, but once triggered it becomes a limit order instead of a market order — it protects against a worse price, at the cost of a chance it doesn't fill at all.",
    relatedLessonId: "course-order-types-l2",
  },
  {
    id: "short-selling",
    term: "Short Selling",
    definition: "Selling borrowed shares now, hoping to buy them back later at a lower price. Profits when the price falls, but carries theoretically unlimited loss risk if the price rises instead.",
    relatedLessonId: "course-advanced-trading-l1",
  },
  {
    id: "margin-call",
    term: "Margin Call",
    definition: "A warning that account equity has fallen too low relative to the margin reserved against a leveraged position — in a real brokerage, this can force a sale without further notice.",
    relatedLessonId: "course-advanced-trading-l2",
  },
  {
    id: "buying-power",
    term: "Buying Power",
    definition: "Cash available to spend on new purchases — reduced by any margin reserved against open short positions.",
    relatedLessonId: "course-advanced-trading-l2",
  },
  {
    id: "realized-gain",
    term: "Realized Gain",
    definition: "Profit (or loss) that's been locked in by actually closing a position — as opposed to an unrealized gain, which is only a paper value until you sell.",
    relatedLessonId: "course-portfolio-l3",
  },
  {
    id: "unrealized-gain",
    term: "Unrealized Gain",
    definition: "The paper profit (or loss) on a position you still hold, based on its current market value versus what you paid — it isn't locked in until you sell.",
    relatedLessonId: "course-portfolio-l3",
  },
  {
    id: "tfsa",
    term: "TFSA",
    definition: "Tax-Free Savings Account — a Canadian registered account where contributions are made with after-tax dollars, but all growth and withdrawals are completely tax-free.",
    relatedLessonId: "course-tfsa-l1",
  },
  {
    id: "rrsp",
    term: "RRSP",
    definition: "Registered Retirement Savings Plan — a Canadian registered account where contributions are tax-deductible now, growth is tax-deferred, and withdrawals are taxed later.",
    relatedLessonId: "course-rrsp-l1",
  },
  {
    id: "drip",
    term: "DRIP",
    definition: "Dividend reinvestment — instead of a dividend payment sitting as cash, it's automatically used to buy more (often fractional) shares of the same security.",
    relatedLessonId: null,
  },
  {
    id: "fractional-shares",
    term: "Fractional Shares",
    definition: "Owning a portion of a single share (e.g., 0.25 shares) rather than only whole numbers — makes it possible to invest an exact dollar amount regardless of a stock's price.",
    relatedLessonId: null,
  },
];

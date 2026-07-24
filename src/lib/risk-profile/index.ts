import type { PrismaClient, RiskCategory, RiskProfile } from "@prisma/client";

import { getLatestPrice, getSecurityBySymbol } from "@/lib/market-data";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { placeOrder } from "@/lib/trading";

import { computeSuggestedTrades, MODEL_PORTFOLIOS, type SuggestedTradesResult } from "./model-portfolios";
import { RISK_QUESTIONS, scoreToCategory } from "./questions";

export { RISK_QUESTIONS, RISK_CATEGORY_INFO, MIN_SCORE, MAX_SCORE, scoreToCategory } from "./questions";
export type { RiskQuestion, RiskQuestionOption } from "./questions";
export { MODEL_PORTFOLIOS, computeSuggestedTrades } from "./model-portfolios";
export type { ModelPortfolioSleeve, SuggestedTrade, SuggestedTradesResult } from "./model-portfolios";

/// Sums point values across every question's selected option. Answers are
/// keyed by question id → selected option index; a missing or out-of-range
/// answer contributes 0 rather than throwing, so a partially-filled
/// questionnaire never crashes scoring (the UI is responsible for requiring
/// every question be answered before submitting).
export function computeScore(answers: Record<string, number>): number {
  return RISK_QUESTIONS.reduce((sum, question) => {
    const selectedIndex = answers[question.id];
    const option = question.options[selectedIndex];
    return sum + (option?.points ?? 0);
  }, 0);
}

/// Saves (or overwrites) an account's risk profile — retaking the
/// questionnaire replaces the previous result rather than keeping history.
export async function saveRiskProfile(
  accountId: string,
  answers: Record<string, number>,
  client: PrismaClient = defaultPrisma,
): Promise<RiskProfile> {
  const score = computeScore(answers);
  const category = scoreToCategory(score);

  return client.riskProfile.upsert({
    where: { accountId },
    update: { score, category, answers, completedAt: new Date() },
    create: { accountId, score, category, answers },
  });
}

export async function getRiskProfile(accountId: string, client: PrismaClient = defaultPrisma): Promise<RiskProfile | null> {
  return client.riskProfile.findUnique({ where: { accountId } });
}

const MODEL_PORTFOLIO_SYMBOLS = ["VTI", "AGG", "GLD"];

async function fetchSleevePrices(client: PrismaClient): Promise<Record<string, number>> {
  const prices: Record<string, number> = {};

  for (const symbol of MODEL_PORTFOLIO_SYMBOLS) {
    const security = await getSecurityBySymbol(symbol, client);
    if (!security) continue;
    const latest = await getLatestPrice(security.id, client);
    if (latest) prices[symbol] = latest.closePrice.toNumber();
  }

  return prices;
}

/// The suggested allocation for `category` against an account's current
/// cash balance and today's live prices — used for both the results-screen
/// preview and (recomputed fresh, never trusted from the client) the actual
/// invest step.
export async function getSuggestedTrades(
  accountId: string,
  category: RiskCategory,
  client: PrismaClient = defaultPrisma,
): Promise<SuggestedTradesResult> {
  const account = await client.account.findUniqueOrThrow({ where: { id: accountId } });
  const prices = await fetchSleevePrices(client);
  return computeSuggestedTrades(MODEL_PORTFOLIOS[category], account.cashBalance.toNumber(), prices);
}

export type InvestmentTradeResult = {
  symbol: string;
  label: string;
  shares: number;
  status: "FILLED" | "REJECTED" | "SKIPPED";
  rejectionReason?: string;
};

export type InvestmentResult = {
  category: RiskCategory;
  trades: InvestmentTradeResult[];
  totalSpent: number;
};

/// Places one market BUY per non-zero-share sleeve in the account's saved
/// risk profile's suggested allocation, reusing the ordinary trading engine
/// (`@/lib/trading`) — no special-cased order path for "auto-invest" trades.
/// Recomputes the suggested trades from live prices at call time rather
/// than accepting them as an argument, so a client can never dictate what
/// gets bought. A sleeve with 0 suggested shares (too small a dollar amount
/// for even one share) is reported as SKIPPED rather than attempted.
export async function executeSuggestedInvestment(
  accountId: string,
  client: PrismaClient = defaultPrisma,
): Promise<InvestmentResult> {
  const riskProfile = await client.riskProfile.findUnique({ where: { accountId } });
  if (!riskProfile) {
    throw new Error("No risk profile found for this account.");
  }

  const { trades: suggested } = await getSuggestedTrades(accountId, riskProfile.category, client);

  const results: InvestmentTradeResult[] = [];
  let totalSpent = 0;

  for (const trade of suggested) {
    if (trade.shares <= 0) {
      results.push({ symbol: trade.symbol, label: trade.label, shares: 0, status: "SKIPPED" });
      continue;
    }

    const security = await getSecurityBySymbol(trade.symbol, client);
    if (!security) {
      results.push({ symbol: trade.symbol, label: trade.label, shares: trade.shares, status: "SKIPPED" });
      continue;
    }

    const result = await placeOrder({ accountId, securityId: security.id, side: "BUY", quantity: trade.shares }, client);

    if (result.status === "FILLED") {
      totalSpent += trade.estimatedCost;
      results.push({ symbol: trade.symbol, label: trade.label, shares: trade.shares, status: "FILLED" });
    } else {
      results.push({
        symbol: trade.symbol,
        label: trade.label,
        shares: trade.shares,
        status: "REJECTED",
        rejectionReason: result.rejectionReason,
      });
    }
  }

  return { category: riskProfile.category, trades: results, totalSpent };
}

/// The public contract this module fulfills for the rest of the app — kept
/// here as a compile-time check that the module's shape stays stable. See
/// ARCHITECTURE.md.
export interface RiskProfileService {
  computeScore: typeof computeScore;
  saveRiskProfile: typeof saveRiskProfile;
  getRiskProfile: typeof getRiskProfile;
  getSuggestedTrades: typeof getSuggestedTrades;
  executeSuggestedInvestment: typeof executeSuggestedInvestment;
}

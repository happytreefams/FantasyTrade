import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { AssetType, PrismaClient } from "@prisma/client";

import { env } from "@/lib/env";
import { FEATURE_FLAG_DEFINITIONS } from "@/lib/feature-flags";
import { previousTradingDay } from "@/lib/market-data";

import { BADGE_DEFINITIONS } from "./seed-badges";
import { GLOSSARY_TERMS } from "./seed-glossary";
import { COURSES } from "./seed-learning";
// S&P 500 constituent list (ticker, name, GICS sector/industry) sourced from
// Wikipedia's "List of S&P 500 companies" (itself sourced from the official
// S&P Dow Jones Indices methodology docs) — there's no free live API for
// index MEMBERSHIP itself (as opposed to prices), so this is a point-in-time
// snapshot. Index composition changes periodically (additions/removals a
// few times a year as S&P reconstitutes); refresh this file occasionally by
// re-pulling the same source rather than assuming it stays current forever.
import sp500Constituents from "./seed-data/sp500-constituents.json";

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Fake seed closing prices — Tier 2 replaces these with real market data.
const SECURITIES: Array<{
  symbol: string;
  name: string;
  assetType: AssetType;
  exchange: string;
  closePrice: number;
}> = [
  { symbol: "AAPL", name: "Apple Inc.", assetType: "STOCK", exchange: "NASDAQ", closePrice: 227.5 },
  { symbol: "MSFT", name: "Microsoft Corporation", assetType: "STOCK", exchange: "NASDAQ", closePrice: 425.3 },
  { symbol: "GOOGL", name: "Alphabet Inc. Class A", assetType: "STOCK", exchange: "NASDAQ", closePrice: 175.2 },
  { symbol: "AMZN", name: "Amazon.com Inc.", assetType: "STOCK", exchange: "NASDAQ", closePrice: 195.8 },
  { symbol: "NVDA", name: "NVIDIA Corporation", assetType: "STOCK", exchange: "NASDAQ", closePrice: 138.45 },
  { symbol: "META", name: "Meta Platforms Inc.", assetType: "STOCK", exchange: "NASDAQ", closePrice: 590.1 },
  { symbol: "TSLA", name: "Tesla Inc.", assetType: "STOCK", exchange: "NASDAQ", closePrice: 248.75 },
  { symbol: "BRK.B", name: "Berkshire Hathaway Inc. Class B", assetType: "STOCK", exchange: "NYSE", closePrice: 455.6 },
  { symbol: "JPM", name: "JPMorgan Chase & Co.", assetType: "STOCK", exchange: "NYSE", closePrice: 235.9 },
  { symbol: "V", name: "Visa Inc.", assetType: "STOCK", exchange: "NYSE", closePrice: 305.4 },
  { symbol: "JNJ", name: "Johnson & Johnson", assetType: "STOCK", exchange: "NYSE", closePrice: 158.2 },
  { symbol: "WMT", name: "Walmart Inc.", assetType: "STOCK", exchange: "NYSE", closePrice: 92.15 },
  { symbol: "PG", name: "Procter & Gamble Co.", assetType: "STOCK", exchange: "NYSE", closePrice: 168.4 },
  { symbol: "MA", name: "Mastercard Inc.", assetType: "STOCK", exchange: "NYSE", closePrice: 505.75 },
  { symbol: "HD", name: "The Home Depot Inc.", assetType: "STOCK", exchange: "NYSE", closePrice: 385.6 },
  { symbol: "DIS", name: "The Walt Disney Company", assetType: "STOCK", exchange: "NYSE", closePrice: 112.3 },
  { symbol: "BAC", name: "Bank of America Corp.", assetType: "STOCK", exchange: "NYSE", closePrice: 44.8 },
  { symbol: "XOM", name: "Exxon Mobil Corporation", assetType: "STOCK", exchange: "NYSE", closePrice: 118.5 },
  { symbol: "CVX", name: "Chevron Corporation", assetType: "STOCK", exchange: "NYSE", closePrice: 158.9 },
  { symbol: "KO", name: "The Coca-Cola Company", assetType: "STOCK", exchange: "NYSE", closePrice: 63.45 },
  { symbol: "PEP", name: "PepsiCo Inc.", assetType: "STOCK", exchange: "NASDAQ", closePrice: 168.75 },
  { symbol: "NFLX", name: "Netflix Inc.", assetType: "STOCK", exchange: "NASDAQ", closePrice: 780.2 },
  { symbol: "ADBE", name: "Adobe Inc.", assetType: "STOCK", exchange: "NASDAQ", closePrice: 520.3 },
  { symbol: "CRM", name: "Salesforce Inc.", assetType: "STOCK", exchange: "NYSE", closePrice: 315.6 },
  { symbol: "INTC", name: "Intel Corporation", assetType: "STOCK", exchange: "NASDAQ", closePrice: 22.4 },
  { symbol: "AMD", name: "Advanced Micro Devices Inc.", assetType: "STOCK", exchange: "NASDAQ", closePrice: 148.9 },
  { symbol: "ORCL", name: "Oracle Corporation", assetType: "STOCK", exchange: "NYSE", closePrice: 178.5 },
  { symbol: "CSCO", name: "Cisco Systems Inc.", assetType: "STOCK", exchange: "NASDAQ", closePrice: 58.2 },
  { symbol: "PFE", name: "Pfizer Inc.", assetType: "STOCK", exchange: "NYSE", closePrice: 26.8 },
  { symbol: "COST", name: "Costco Wholesale Corporation", assetType: "STOCK", exchange: "NASDAQ", closePrice: 915.4 },
  { symbol: "SPY", name: "SPDR S&P 500 ETF Trust", assetType: "ETF", exchange: "NYSEARCA", closePrice: 585.3 },
  { symbol: "QQQ", name: "Invesco QQQ Trust", assetType: "ETF", exchange: "NASDAQ", closePrice: 505.6 },
  { symbol: "VOO", name: "Vanguard S&P 500 ETF", assetType: "ETF", exchange: "NYSEARCA", closePrice: 538.2 },
  { symbol: "VTI", name: "Vanguard Total Stock Market ETF", assetType: "ETF", exchange: "NYSEARCA", closePrice: 295.4 },
  { symbol: "IWM", name: "iShares Russell 2000 ETF", assetType: "ETF", exchange: "NYSEARCA", closePrice: 225.8 },
  { symbol: "DIA", name: "SPDR Dow Jones Industrial Average ETF", assetType: "ETF", exchange: "NYSEARCA", closePrice: 435.9 },
  { symbol: "ARKK", name: "ARK Innovation ETF", assetType: "ETF", exchange: "NYSEARCA", closePrice: 52.3 },
  { symbol: "XLF", name: "Financial Select Sector SPDR Fund", assetType: "ETF", exchange: "NYSEARCA", closePrice: 48.9 },
  { symbol: "XLK", name: "Technology Select Sector SPDR Fund", assetType: "ETF", exchange: "NYSEARCA", closePrice: 235.7 },

  // Bonds — represented via Treasury/corporate bond ETF proxies so they share
  // the same EOD pricing pipeline as everything else (no separate bond feed).
  { symbol: "SHY", name: "iShares 1-3 Year Treasury Bond ETF", assetType: "BOND", exchange: "NASDAQ", closePrice: 82.1 },
  { symbol: "TLT", name: "iShares 20+ Year Treasury Bond ETF", assetType: "BOND", exchange: "NASDAQ", closePrice: 88.45 },
  { symbol: "AGG", name: "iShares Core U.S. Aggregate Bond ETF", assetType: "BOND", exchange: "NYSEARCA", closePrice: 98.3 },
  { symbol: "LQD", name: "iShares iBoxx $ Investment Grade Corporate Bond ETF", assetType: "BOND", exchange: "NYSEARCA", closePrice: 108.75 },

  // Commodities — also ETF proxies (physically-backed or futures-tracking).
  { symbol: "GLD", name: "SPDR Gold Shares", assetType: "COMMODITY", exchange: "NYSEARCA", closePrice: 245.6 },
  { symbol: "SLV", name: "iShares Silver Trust", assetType: "COMMODITY", exchange: "NYSEARCA", closePrice: 28.6 },
  { symbol: "USO", name: "United States Oil Fund", assetType: "COMMODITY", exchange: "NYSEARCA", closePrice: 72.4 },
  { symbol: "DBC", name: "Invesco DB Commodity Index Tracking Fund", assetType: "COMMODITY", exchange: "NYSEARCA", closePrice: 21.85 },

  // Crypto — traded directly (not via an ETF proxy). Real crypto markets run
  // 24/7 with no daily close; this app deliberately folds them into the same
  // once-a-day EOD pipeline as everything else (see the AssetType.CRYPTO
  // doc comment in schema.prisma) rather than modeling continuous trading.
  { symbol: "BTC", name: "Bitcoin", assetType: "CRYPTO", exchange: "COINBASE", closePrice: 64500 },
  { symbol: "ETH", name: "Ethereum", assetType: "CRYPTO", exchange: "COINBASE", closePrice: 3450 },
  { symbol: "SOL", name: "Solana", assetType: "CRYPTO", exchange: "COINBASE", closePrice: 148.5 },
  { symbol: "ADA", name: "Cardano", assetType: "CRYPTO", exchange: "COINBASE", closePrice: 0.62 },
  { symbol: "DOGE", name: "Dogecoin", assetType: "CRYPTO", exchange: "COINBASE", closePrice: 0.135 },
];

// Baseline sector/industry classification, seeded so the /portfolio sector
// allocation chart has real data without waiting on (or burning the quota
// of) the weekly fundamentals job. `updateAllFundamentals` still overwrites
// these with live Alpha Vantage data once it runs — this upsert only ever
// touches the sector/industry columns, never the fields that job owns.
// Broad-market ETFs (SPY, QQQ, VOO, VTI, IWM, DIA, ARKK) and all bond/
// commodity proxies are intentionally left unset: they're grouped by asset
// type in the sector-allocation view instead of a single-sector label.
const SECTOR_CLASSIFICATIONS: Record<string, { sector: string; industry: string }> = {
  AAPL: { sector: "TECHNOLOGY", industry: "Consumer Electronics" },
  MSFT: { sector: "TECHNOLOGY", industry: "Software—Infrastructure" },
  GOOGL: { sector: "COMMUNICATION_SERVICES", industry: "Internet Content & Information" },
  AMZN: { sector: "CONSUMER_CYCLICAL", industry: "Internet Retail" },
  NVDA: { sector: "TECHNOLOGY", industry: "Semiconductors" },
  META: { sector: "COMMUNICATION_SERVICES", industry: "Internet Content & Information" },
  TSLA: { sector: "CONSUMER_CYCLICAL", industry: "Auto Manufacturers" },
  "BRK.B": { sector: "FINANCIAL_SERVICES", industry: "Insurance—Diversified" },
  JPM: { sector: "FINANCIAL_SERVICES", industry: "Banks—Diversified" },
  V: { sector: "FINANCIAL_SERVICES", industry: "Credit Services" },
  JNJ: { sector: "HEALTHCARE", industry: "Drug Manufacturers—General" },
  WMT: { sector: "CONSUMER_DEFENSIVE", industry: "Discount Stores" },
  PG: { sector: "CONSUMER_DEFENSIVE", industry: "Household & Personal Products" },
  MA: { sector: "FINANCIAL_SERVICES", industry: "Credit Services" },
  HD: { sector: "CONSUMER_CYCLICAL", industry: "Home Improvement Retail" },
  DIS: { sector: "COMMUNICATION_SERVICES", industry: "Entertainment" },
  BAC: { sector: "FINANCIAL_SERVICES", industry: "Banks—Diversified" },
  XOM: { sector: "ENERGY", industry: "Oil & Gas Integrated" },
  CVX: { sector: "ENERGY", industry: "Oil & Gas Integrated" },
  KO: { sector: "CONSUMER_DEFENSIVE", industry: "Beverages—Non-Alcoholic" },
  PEP: { sector: "CONSUMER_DEFENSIVE", industry: "Beverages—Non-Alcoholic" },
  NFLX: { sector: "COMMUNICATION_SERVICES", industry: "Entertainment" },
  ADBE: { sector: "TECHNOLOGY", industry: "Software—Application" },
  CRM: { sector: "TECHNOLOGY", industry: "Software—Application" },
  INTC: { sector: "TECHNOLOGY", industry: "Semiconductors" },
  AMD: { sector: "TECHNOLOGY", industry: "Semiconductors" },
  ORCL: { sector: "TECHNOLOGY", industry: "Software—Infrastructure" },
  CSCO: { sector: "TECHNOLOGY", industry: "Communication Equipment" },
  PFE: { sector: "HEALTHCARE", industry: "Drug Manufacturers—General" },
  COST: { sector: "CONSUMER_DEFENSIVE", industry: "Discount Stores" },
  XLF: { sector: "FINANCIAL_SERVICES", industry: "Sector Fund" },
  XLK: { sector: "TECHNOLOGY", industry: "Sector Fund" },
};

// Maps the literal GICS sector names in seed-data/sp500-constituents.json to
// this app's existing sector-key convention (see SECTOR_CLASSIFICATIONS
// above and SECTOR_LABELS in @/lib/portfolio) — MATERIALS/UTILITIES/
// REAL_ESTATE are new keys the original ~40-security seed never needed.
const GICS_SECTOR_TO_APP_KEY: Record<string, string> = {
  "Information Technology": "TECHNOLOGY",
  "Health Care": "HEALTHCARE",
  Financials: "FINANCIAL_SERVICES",
  "Consumer Discretionary": "CONSUMER_CYCLICAL",
  "Consumer Staples": "CONSUMER_DEFENSIVE",
  "Communication Services": "COMMUNICATION_SERVICES",
  Industrials: "INDUSTRIALS",
  Energy: "ENERGY",
  Materials: "MATERIALS",
  Utilities: "UTILITIES",
  "Real Estate": "REAL_ESTATE",
};

// `exchange` isn't part of the sourced GICS constituent data (see
// seed-data/sp500-constituents.json's doc comment) and is purely cosmetic —
// displayed on the security page and admin table, never used in trading
// logic (see `searchSecurities`/`getSecurityBySymbol`). This sector-based
// heuristic is a best-effort default for newly-created rows only; it never
// overwrites a symbol's existing (accurate) exchange on re-seed.
function guessExchange(sector: string): string {
  const nasdaqSectors = new Set(["Information Technology", "Communication Services", "Health Care"]);
  return nasdaqSectors.has(sector) ? "NASDAQ" : "NYSE";
}

// Placeholder close price for a brand-new S&P 500 constituent that has no
// price yet — same fallback value `generateSyntheticPrice` uses when a
// security has no prior price on record (see @/lib/market-data). Overwritten
// within a day or two by the daily-close cron, or immediately by running
// scripts/backfill-history.ts for real historical data.
const NEW_SECURITY_PLACEHOLDER_PRICE = 100;

async function main() {
  // Stamped as the most recent trading day, same convention the daily-close
  // job uses — so a fresh seed and a job run agree on which row is "latest".
  const date = previousTradingDay();

  for (const { symbol, name, assetType, exchange, closePrice } of SECURITIES) {
    const security = await prisma.security.upsert({
      where: { symbol },
      update: { name, assetType, exchange },
      create: { symbol, name, assetType, exchange },
    });

    // Insert-only: if the daily-close job already recorded a real price for
    // this day, a re-seed must not clobber it with the fake baseline.
    await prisma.priceHistory.upsert({
      where: { securityId_date: { securityId: security.id, date } },
      update: {},
      create: { securityId: security.id, date, closePrice },
    });

    const classification = SECTOR_CLASSIFICATIONS[symbol];
    if (classification) {
      await prisma.securityFundamentals.upsert({
        where: { securityId: security.id },
        update: classification,
        create: { securityId: security.id, ...classification },
      });
    }
  }

  console.log(`Seeded ${SECURITIES.length} securities with a closing price dated ${date.toISOString().slice(0, 10)}.`);
  console.log(`Seeded sector/industry baseline for ${Object.keys(SECTOR_CLASSIFICATIONS).length} securities.`);

  // Keyed by symbol, so a security already seeded above (e.g. AAPL, TSLA)
  // just gets its sector/industry filled in here rather than duplicated —
  // `where: { symbol }` upsert, same idempotent pattern as the loop above.
  let sp500Created = 0;
  for (const { symbol, name, sector, subIndustry } of sp500Constituents) {
    const appSectorKey = GICS_SECTOR_TO_APP_KEY[sector] ?? sector;
    const existing = await prisma.security.findUnique({ where: { symbol } });

    const security = await prisma.security.upsert({
      where: { symbol },
      update: { name },
      create: { symbol, name, assetType: "STOCK", exchange: guessExchange(sector) },
    });
    if (!existing) sp500Created += 1;

    // Insert-only, same reasoning as the SECURITIES loop above: never
    // clobber a real price the daily-close job or backfill script wrote.
    await prisma.priceHistory.upsert({
      where: { securityId_date: { securityId: security.id, date } },
      update: {},
      create: { securityId: security.id, date, closePrice: NEW_SECURITY_PLACEHOLDER_PRICE },
    });

    await prisma.securityFundamentals.upsert({
      where: { securityId: security.id },
      update: { sector: appSectorKey, industry: subIndustry },
      create: { securityId: security.id, sector: appSectorKey, industry: subIndustry },
    });
  }

  console.log(
    `Seeded ${sp500Constituents.length} S&P 500 constituents (${sp500Created} newly created, ` +
      `${sp500Constituents.length - sp500Created} already present).`,
  );

  let lessonCount = 0;
  let questionCount = 0;

  for (const course of COURSES) {
    await prisma.course.upsert({
      where: { id: course.id },
      update: { title: course.title, description: course.description, category: course.category, order: course.order },
      create: {
        id: course.id,
        title: course.title,
        description: course.description,
        category: course.category,
        order: course.order,
      },
    });

    for (const [index, lesson] of course.lessons.entries()) {
      const order = index + 1;

      await prisma.lesson.upsert({
        where: { id: lesson.id },
        update: { title: lesson.title, content: lesson.content, order, courseId: course.id },
        create: { id: lesson.id, courseId: course.id, title: lesson.title, content: lesson.content, order },
      });

      await prisma.quiz.upsert({
        where: { id: lesson.quiz.id },
        update: { title: lesson.quiz.title, lessonId: lesson.id },
        create: { id: lesson.quiz.id, lessonId: lesson.id, title: lesson.quiz.title },
      });

      for (const question of lesson.quiz.questions) {
        await prisma.quizQuestion.upsert({
          where: { id: question.id },
          update: {
            question: question.question,
            choices: question.choices,
            correctAnswerIndex: question.correctAnswerIndex,
            explanation: question.explanation,
            quizId: lesson.quiz.id,
          },
          create: {
            id: question.id,
            quizId: lesson.quiz.id,
            question: question.question,
            choices: question.choices,
            correctAnswerIndex: question.correctAnswerIndex,
            explanation: question.explanation,
          },
        });
        questionCount += 1;
      }

      lessonCount += 1;
    }
  }

  console.log(`Seeded ${COURSES.length} courses, ${lessonCount} lessons, ${questionCount} quiz questions.`);

  // Insert-only: never clobber a flag an admin has already flipped on.
  for (const [key, description] of Object.entries(FEATURE_FLAG_DEFINITIONS)) {
    await prisma.featureFlag.upsert({
      where: { key },
      update: { description },
      create: { key, description, enabled: false },
    });
  }

  console.log(`Seeded ${Object.keys(FEATURE_FLAG_DEFINITIONS).length} feature flags (defaulted off).`);

  for (const glossaryTerm of GLOSSARY_TERMS) {
    await prisma.glossary.upsert({
      where: { id: glossaryTerm.id },
      update: {
        term: glossaryTerm.term,
        definition: glossaryTerm.definition,
        relatedLessonId: glossaryTerm.relatedLessonId,
      },
      create: {
        id: glossaryTerm.id,
        term: glossaryTerm.term,
        definition: glossaryTerm.definition,
        relatedLessonId: glossaryTerm.relatedLessonId,
      },
    });
  }

  console.log(`Seeded ${GLOSSARY_TERMS.length} glossary terms.`);

  for (const badge of BADGE_DEFINITIONS) {
    await prisma.badge.upsert({
      where: { code: badge.code },
      update: { name: badge.name, description: badge.description, icon: badge.icon },
      create: { code: badge.code, name: badge.name, description: badge.description, icon: badge.icon },
    });
  }

  console.log(`Seeded ${BADGE_DEFINITIONS.length} badges.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

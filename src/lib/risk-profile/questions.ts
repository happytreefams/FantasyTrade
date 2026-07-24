import type { RiskCategory } from "@prisma/client";

export type RiskQuestionOption = { label: string; points: number };
export type RiskQuestion = {
  id: string;
  dimension: string;
  question: string;
  options: RiskQuestionOption[];
};

/// The risk-tolerance question bank — a plain config array so the questions,
/// options, or point values can be tweaked without touching any scoring or
/// UI logic. Every question here uses the same 0–4 point scale across 5
/// options, so total score has a simple, fixed range regardless of how many
/// questions there are (see MAX_SCORE below) — add or remove a question and
/// the category boundaries in `scoreToCategory` still make sense as
/// even fifths of the new range, as long as you keep them in sync.
export const RISK_QUESTIONS: RiskQuestion[] = [
  {
    id: "time-horizon",
    dimension: "Time horizon",
    question: "When do you expect to need most of this money?",
    options: [
      { label: "Less than 1 year", points: 0 },
      { label: "1–3 years", points: 1 },
      { label: "3–7 years", points: 2 },
      { label: "7–15 years", points: 3 },
      { label: "More than 15 years", points: 4 },
    ],
  },
  {
    id: "primary-goal",
    dimension: "Primary goal",
    question: "What's your primary goal for this account?",
    options: [
      { label: "Preserve what I have — minimize any loss", points: 0 },
      { label: "Mostly preserve capital, with a little growth", points: 1 },
      { label: "Balanced growth and stability", points: 2 },
      { label: "Mostly growth — I'm comfortable with ups and downs", points: 3 },
      { label: "Maximize long-term growth — short-term swings don't bother me", points: 4 },
    ],
  },
  {
    id: "drop-reaction",
    dimension: "Reaction to a downturn",
    question: "Your portfolio drops 20% in a few months. What do you do?",
    options: [
      { label: "Sell everything immediately to stop further loss", points: 0 },
      { label: "Sell some to reduce risk", points: 1 },
      { label: "Hold and wait it out", points: 2 },
      { label: "Hold, and consider buying a little more", points: 3 },
      { label: "Buy more — it's a discount", points: 4 },
    ],
  },
  {
    id: "income-stability",
    dimension: "Income stability",
    question: "How stable is your current income?",
    options: [
      { label: "Unstable, unemployed, or highly variable", points: 0 },
      { label: "Somewhat unpredictable (freelance, commission-based)", points: 1 },
      { label: "Generally stable with some variability", points: 2 },
      { label: "Stable, salaried", points: 3 },
      { label: "Very stable, plus other income or a savings cushion", points: 4 },
    ],
  },
  {
    id: "experience",
    dimension: "Investing experience",
    question: "How would you describe your investing experience?",
    options: [
      { label: "None — this is my first time", points: 0 },
      { label: "A little — I've read about it or dabbled", points: 1 },
      { label: "Some — I've held a few investments before", points: 2 },
      { label: "Experienced — I've invested through a market downturn", points: 3 },
      { label: "Very experienced — I actively manage a diversified portfolio", points: 4 },
    ],
  },
  {
    id: "liquidity-needs",
    dimension: "Liquidity needs",
    question: "How much of this money might you need access to on short notice (a few weeks)?",
    options: [
      { label: "Most or all of it", points: 0 },
      { label: "A significant portion", points: 1 },
      { label: "Some, as a safety net", points: 2 },
      { label: "Very little", points: 3 },
      { label: "None — this is money I won't touch", points: 4 },
    ],
  },
];

const MAX_POINTS_PER_QUESTION = 4;
export const MIN_SCORE = 0;
export const MAX_SCORE = RISK_QUESTIONS.length * MAX_POINTS_PER_QUESTION;

/// Five equal-width bands across [MIN_SCORE, MAX_SCORE]. With 6 questions
/// (0–24 total) that's bands of 5: 0–4, 5–9, 10–14, 15–19, 20–24.
export function scoreToCategory(score: number): RiskCategory {
  const bandWidth = (MAX_SCORE - MIN_SCORE + 1) / 5;
  const band = Math.min(4, Math.floor((score - MIN_SCORE) / bandWidth));

  const categories: RiskCategory[] = [
    "CONSERVATIVE",
    "MODERATE_CONSERVATIVE",
    "MODERATE",
    "MODERATE_AGGRESSIVE",
    "AGGRESSIVE",
  ];
  return categories[Math.max(0, band)];
}

export const RISK_CATEGORY_INFO: Record<RiskCategory, { label: string; description: string }> = {
  CONSERVATIVE: {
    label: "Conservative",
    description: "You prioritize protecting what you have. Small, steady returns matter more to you than chasing growth.",
  },
  MODERATE_CONSERVATIVE: {
    label: "Moderately Conservative",
    description: "You want stability first, with some room for growth — a portfolio that leans defensive but isn't all bonds and cash.",
  },
  MODERATE: {
    label: "Moderate",
    description: "You're aiming for a balance — meaningful growth potential, cushioned by enough stability to ride out rough patches.",
  },
  MODERATE_AGGRESSIVE: {
    label: "Moderately Aggressive",
    description: "You're mostly focused on growth and can tolerate real volatility, with a smaller cushion of bonds for ballast.",
  },
  AGGRESSIVE: {
    label: "Aggressive",
    description: "You're optimizing for long-term growth and are comfortable with significant short-term swings along the way.",
  },
};

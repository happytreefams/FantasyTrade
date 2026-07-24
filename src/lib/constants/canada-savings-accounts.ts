/// Canadian registered-account figures used throughout the Personal Finance
/// learning category (TFSA, RRSP, FHSA, HBP, RESP). Contribution limits,
/// income thresholds, and program rules are set annually by the federal
/// government and change over time — none of this can be reliably pulled
/// live, so every figure here is a fixed, clearly-dated snapshot rather than
/// a live feed. Each group carries its own `sourceYear`; lesson content and
/// diagrams reference these constants instead of hardcoding numbers inline,
/// so a rule change only needs updating in one place. See
/// `PERSONAL_FINANCE_SOURCE_YEAR` and the disclaimer banner shown on every
/// lesson in this category.

export const TFSA = {
  sourceYear: 2024,
  annualLimit: 7000,
  /// Cumulative room available to someone who was 18+ and a Canadian
  /// resident for every year since the TFSA's 2009 introduction and has
  /// never contributed — the figure most commonly quoted as "total TFSA
  /// room." Equal to the sum of `historicalLimits` below.
  cumulativeRoomSinceInception: 95000,
  /// Penalty on excess contributions: 1% of the highest excess amount for
  /// the month, charged for every month the excess remains in the account.
  overContributionPenaltyPercentPerMonth: 1,
  /// Year-by-year annual limit since the TFSA launched in 2009 — the basis
  /// for the `ContributionRoomTracker` diagram's year-over-year view.
  historicalLimits: [
    { year: 2009, limit: 5000 },
    { year: 2010, limit: 5000 },
    { year: 2011, limit: 5000 },
    { year: 2012, limit: 5000 },
    { year: 2013, limit: 5500 },
    { year: 2014, limit: 5500 },
    { year: 2015, limit: 10000 },
    { year: 2016, limit: 5500 },
    { year: 2017, limit: 5500 },
    { year: 2018, limit: 5500 },
    { year: 2019, limit: 6000 },
    { year: 2020, limit: 6000 },
    { year: 2021, limit: 6000 },
    { year: 2022, limit: 6000 },
    { year: 2023, limit: 6500 },
    { year: 2024, limit: 7000 },
  ],
} as const;

export const RRSP = {
  sourceYear: 2024,
  /// Contribution room is 18% of last year's earned income, up to this
  /// dollar cap (whichever is lower) — plus any carried-forward unused room
  /// from prior years, which never expires.
  contributionPercentOfEarnedIncome: 18,
  annualDollarCap: 31560,
  /// Contributions are deductible until the end of the year you turn this
  /// age, after which the RRSP must be converted (typically to a RRIF).
  contributionDeadlineAge: 71,
} as const;

export const FHSA = {
  sourceYear: 2024,
  annualLimit: 8000,
  lifetimeLimit: 40000,
  /// Unused annual room carries forward to the following year only, and
  /// only after the account has been opened — unlike RRSP/TFSA room, which
  /// accrues automatically from eligibility whether or not an account exists.
  maxCarryForward: 8000,
  /// An FHSA must be closed within this many years of first opening it (or
  /// by age 71, whichever comes first) — unused funds roll into an RRSP
  /// tax-free, or come out taxable.
  maxParticipationYears: 15,
} as const;

export const HBP = {
  sourceYear: 2024,
  /// Maximum that can be withdrawn from an RRSP, tax-free, to buy or build
  /// a first home. Raised from $35,000 to $60,000 in the 2024 federal budget.
  withdrawalLimit: 60000,
  /// Withdrawn funds must be repaid to the RRSP over this many years,
  /// starting the second year after withdrawal — any missed portion in a
  /// given year is added to that year's taxable income instead.
  repaymentYears: 15,
} as const;

export const RESP = {
  sourceYear: 2024,
  /// No annual contribution limit — only a per-beneficiary lifetime cap.
  lifetimeLimit: 50000,
  /// The Canada Education Savings Grant matches this percentage of
  /// contributions, up to the annual and lifetime maximums below.
  cesgMatchPercent: 20,
  cesgAnnualMax: 500,
  /// Reached by contributing $2,500/year (20% of $2,500 = $500) for enough
  /// years, or catching up faster within the $1,000/year CESG cap on
  /// carried-forward room.
  cesgLifetimeMax: 7200,
} as const;

/// Shared source year for the disclaimer banner shown on every Personal
/// Finance lesson. Every group above happens to share one year today; if
/// that ever diverges (e.g. only the RRSP cap changes for a new tax year),
/// update this separately from the per-account `sourceYear` fields.
export const PERSONAL_FINANCE_SOURCE_YEAR = 2024;

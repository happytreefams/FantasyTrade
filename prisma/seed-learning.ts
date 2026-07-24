import type { AssetType, CourseCategory } from "@prisma/client";

import { FHSA, HBP, MAINTENANCE_MARGIN_THRESHOLD, MARGIN_REQUIREMENT_MULTIPLIER, RESP, RRSP, TFSA } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";

export type QuizQuestionData = {
  id: string;
  question: string;
  choices: string[];
  correctAnswerIndex: number;
  explanation: string;
};

export type LessonData = {
  id: string;
  title: string;
  content: string;
  quiz: { id: string; title: string; questions: QuizQuestionData[] };
};

export type CourseData = {
  id: string;
  title: string;
  description: string;
  category: CourseCategory;
  order: number;
  lessons: LessonData[];
};

/// All learning-portal content, authored here (the "admin-lite" path — no
/// CMS yet). IDs are stable and human-readable so app code (cross-links from
/// the trade ticket, security pages, etc.) can reference a specific
/// lesson/course without a fragile lookup by title.
export const COURSES: CourseData[] = [
  {
    id: "course-stocks",
    title: "What Is a Stock?",
    description: "Learn what owning a share actually means and what moves stock prices.",
    category: "STOCKS",
    order: 1,
    lessons: [
      {
        id: "course-stocks-l1",
        title: "Ownership and Shares",
        content: `A share of stock is a small piece of ownership in a company. Buy one share of Apple, and you own a tiny fraction of Apple — its factories, its cash, its future profits, all of it, scaled down to your slice.

Companies sell shares to raise money without taking on debt.

## What you get as an owner

Shareholders get two things, roughly in proportion to how many shares they hold:

- A claim on the company's profits, sometimes paid out as **dividends**
- A vote on major company decisions

::diagram[StockVsBondDiagram]{highlight=stock}

## Stock vs. bond: the core difference

A bondholder is owed a fixed amount back, no matter how the company performs. A shareholder has no guarantee at all — if the company thrives, the stock can rise far more than a bond ever would; if it struggles, shareholders are last in line to get anything back.

## Why this matters for you

Every position in your Fantasy Trade portfolio is a small ownership stake, not a coupon or a receipt. That's the core trade-off of stock investing: uncapped upside, but real downside risk.

::callout[Key Takeaway]
Owning a share means owning a slice of the company itself, with no promised return — unlike a loan.
- Uncapped upside, no fixed floor under the price
- Bondholders get paid before shareholders if the company fails`,
        quiz: {
          id: "course-stocks-l1-quiz",
          title: "Ownership and Shares quiz",
          questions: [
            {
              id: "course-stocks-l1-q1",
              question: "What does owning one share of a company's stock represent?",
              choices: [
                "A loan you've made to the company",
                "A small ownership stake in the company",
                "A guaranteed fixed payment each year",
                "A discount coupon for the company's products",
              ],
              correctAnswerIndex: 1,
              explanation:
                "A share is a unit of ownership. As shown in the stock-vs-bond diagram above, it doesn't promise any fixed payment — unlike a loan, its value depends on the company's performance.",
            },
            {
              id: "course-stocks-l1-q2",
              question: "Why do companies issue stock instead of only borrowing money?",
              choices: [
                "It's the only way to legally operate a business",
                "To raise money without taking on repayable debt",
                "Because stock is required by law for all companies",
                "To avoid ever having to make a profit",
              ],
              correctAnswerIndex: 1,
              explanation:
                "Issuing shares raises capital without creating a debt obligation — the company isn't required to pay shareholders back a fixed amount.",
            },
            {
              id: "course-stocks-l1-q3",
              question: "If a company goes bankrupt, who typically gets paid back first?",
              choices: [
                "Common shareholders",
                "Bondholders / lenders",
                "Whoever bought stock most recently",
                "Employees who own stock",
              ],
              correctAnswerIndex: 1,
              explanation:
                "Bondholders have a legal claim ahead of shareholders. Shareholders are last in line, which is part of why stocks carry more risk than bonds.",
            },
            {
              id: "course-stocks-l1-q4",
              question: "Which best describes the risk/reward trade-off of owning stock vs. a bond?",
              choices: [
                "Stocks have a guaranteed return; bonds don't",
                "Stocks have uncapped upside but no guaranteed floor; bonds pay a fixed amount but cap the upside",
                "There is no meaningful difference in risk",
                "Bonds are always riskier than stocks",
              ],
              correctAnswerIndex: 1,
              explanation:
                "Stocks can rise (or fall) without a predefined limit. Bonds typically pay a fixed, predictable amount, trading higher potential returns for more predictability.",
            },
          ],
        },
      },
      {
        id: "course-stocks-l2",
        title: "How Stock Prices Move",
        content: `A stock's price is simply whatever the last buyer and seller agreed on. There's no committee setting it — it's the result of thousands of independent decisions to buy or sell, continuously repriced throughout the trading day.

## Three forces that push prices around

- **Earnings and fundamentals** — how much money the company is actually making, and whether that's growing or shrinking.
- **Expectations** — prices move on *surprises* relative to what investors already expected, not just on raw good or bad news.
- **Sentiment and macro conditions** — interest rates, overall market mood, and sector trends can move a stock even when nothing about the company itself has changed.

A profitable quarter can still tank a stock if it was less profitable than expected — the market prices in expectations, not just results.

::diagram[RiskReturnSpectrum]{highlight=STOCKS}

Stocks sit toward the higher end of the risk/return spectrum precisely because all three forces above can move their price meaningfully, in either direction, at any time.

## See it in action

In this app, prices update once per simulated trading day (the "T+1" model) — the *outcome* of a day's price discovery without the second-by-second noise. Open any security's **Analytics** tab and try the period selector to see how much a real stock's price actually moves over time.

::callout[Key Takeaway]
Stock prices react to new information and shifting expectations, not just to company performance in isolation.
- No committee sets the price — buyers and sellers do, continuously
- A "surprise" relative to expectations moves prices more than the raw news itself`,
        quiz: {
          id: "course-stocks-l2-quiz",
          title: "How Stock Prices Move quiz",
          questions: [
            {
              id: "course-stocks-l2-q1",
              question: "What ultimately determines a stock's current price?",
              choices: [
                "A government-set rate",
                "The most recent price a buyer and seller agreed to",
                "The company's original IPO price",
                "The average price over the company's history",
              ],
              correctAnswerIndex: 1,
              explanation:
                "Stock prices are set by real-time agreement between buyers and sellers — there's no fixed or official price beyond the last trade.",
            },
            {
              id: "course-stocks-l2-q2",
              question:
                "A company reports higher profits than last year, but the stock price drops. What's the most likely explanation?",
              choices: [
                "The stock market is broken",
                "The profits were lower than investors had expected",
                "Higher profits always cause a price drop",
                "The company must be lying about its earnings",
              ],
              correctAnswerIndex: 1,
              explanation:
                "Prices react to surprises relative to expectations. Growing profits that still fall short of what was expected can still disappoint the market.",
            },
            {
              id: "course-stocks-l2-q3",
              question: "Which of these can move a stock's price even if nothing changed at the company itself?",
              choices: [
                "Overall market sentiment or interest rate changes",
                "The company's logo",
                "The stock's ticker symbol",
                "The color of the company's annual report",
              ],
              correctAnswerIndex: 0,
              explanation:
                "Macro conditions like interest rates and broad market sentiment affect nearly all stocks together, independent of any single company's news.",
            },
            {
              id: "course-stocks-l2-q4",
              question: "How does this app's T+1 pricing model relate to real markets?",
              choices: [
                "It has nothing to do with real markets",
                "It compresses a real trading day's price discovery into one daily update instead of continuous intraday trading",
                "Real markets also only update prices once a day",
                "T+1 means trades take one week to settle",
              ],
              correctAnswerIndex: 1,
              explanation:
                "Real markets reprice continuously; this app instead uses each day's closing result, capturing the same kind of price discovery without intraday noise.",
            },
          ],
        },
      },
      {
        id: "course-stocks-l3",
        title: "Why Companies Issue Stock",
        content: `Every public company started as an idea that needed money before it could earn any. Stock is one of two main ways to fund that: sell ownership (equity) or borrow money (debt).

::diagram[StockVsBondDiagram]{highlight=stock}

## The trade-off of selling equity

Selling stock has a distinct advantage: no interest to pay, no fixed date the money must be returned. The cost is real too — every share sold dilutes existing owners' stake and gives up a slice of future profits and control, permanently.

## From IPO to secondary market

An **Initial Public Offering (IPO)** is the first time a company sells shares to the public. After that, shares trade between investors on an exchange — the company doesn't see any money from your purchase of existing shares.

Companies can also issue *more* shares later (a secondary offering) if they need additional capital, which further dilutes existing shareholders.

::callout[Key Takeaway]
Selling stock raises money without debt, but permanently gives up a slice of ownership and control.
- IPO = the first sale to the public; after that, shares trade investor-to-investor
- New share issuance dilutes existing shareholders' ownership percentage`,
        quiz: {
          id: "course-stocks-l3-quiz",
          title: "Why Companies Issue Stock quiz",
          questions: [
            {
              id: "course-stocks-l3-q1",
              question: "What is the main advantage of raising money by selling stock instead of borrowing?",
              choices: [
                "Stock never has to be repaid or carry interest",
                "Stock is always cheaper than a bank loan",
                "Selling stock is required by law",
                "Stock sales are tax-free for the company",
              ],
              correctAnswerIndex: 0,
              explanation:
                "Equity capital doesn't require interest payments or a repayment date — the trade-off is giving up a permanent slice of ownership instead.",
            },
            {
              id: "course-stocks-l3-q2",
              question: "What happens to existing shareholders when a company issues new shares?",
              choices: [
                "Their shares become worth more automatically",
                "Their ownership percentage gets diluted",
                "Nothing changes for them at all",
                "They receive a cash refund",
              ],
              correctAnswerIndex: 1,
              explanation:
                "New shares split the same company across a larger number of total shares, so each existing share represents a slightly smaller ownership slice.",
            },
            {
              id: "course-stocks-l3-q3",
              question: "When you buy shares of a company on the stock market today, who receives your money?",
              choices: [
                "The company directly, every time",
                "Whoever is selling those particular shares (another investor)",
                "The government",
                "The stock exchange itself",
              ],
              correctAnswerIndex: 1,
              explanation:
                "After the IPO, shares trade between investors on an exchange. The company itself doesn't receive money from ordinary secondary-market trades.",
            },
            {
              id: "course-stocks-l3-q4",
              question: "What is an IPO?",
              choices: [
                "The day a stock's price is fixed forever",
                "The first time a company sells shares to the public",
                "A type of bond",
                "An annual shareholder meeting",
              ],
              correctAnswerIndex: 1,
              explanation:
                "An Initial Public Offering (IPO) is when a company first sells shares to public investors, moving from private to public ownership.",
            },
          ],
        },
      },
      {
        id: "course-stocks-l4",
        title: "Common vs. Preferred Stock",
        content: `Most of what people mean by "stock" is **common stock** — the kind available in this app. Common shareholders get voting rights and a claim on whatever profit is left after all other obligations are paid.

## Preferred stock: a different set of rules

**Preferred stock** typically pays a fixed dividend (like a bond's coupon) and stands ahead of common stock — though still behind bondholders — if the company runs into trouble. In exchange, preferred shareholders usually give up voting rights and most of the upside if the company does spectacularly well.

::diagram[RiskReturnSpectrum]{highlight=STOCKS}

## Where each sits on the spectrum

- **Bonds** — most predictable, lowest potential reward
- **Preferred stock** — steadier than common stock, less upside
- **Common stock** — least predictable, highest potential reward

Most individual investors — and everyone using this app — deal almost exclusively in common stock.

::callout[Key Takeaway]
Preferred stock trades voting rights and some upside for a steadier, bond-like payout and a higher claim priority than common stock.
- Bonds get paid first, then preferred shareholders, then common shareholders
- This app trades common stock only`,
        quiz: {
          id: "course-stocks-l4-quiz",
          title: "Common vs. Preferred Stock quiz",
          questions: [
            {
              id: "course-stocks-l4-q1",
              question: "Which type of stock is available to trade in this app?",
              choices: [
                "Preferred stock only",
                "Common stock",
                "Neither — only bonds",
                "A blend of both automatically",
              ],
              correctAnswerIndex: 1,
              explanation:
                "Fantasy Trade — and most everyday retail investing — deals in common stock, which is what 'buying a stock' usually refers to.",
            },
            {
              id: "course-stocks-l4-q2",
              question: "What do preferred shareholders typically give up compared to common shareholders?",
              choices: ["Voting rights", "Ownership entirely", "Any claim on the company", "Their initial investment"],
              correctAnswerIndex: 0,
              explanation:
                "Preferred stock usually trades voting rights for a steadier, fixed-style dividend and a higher claim priority than common stock.",
            },
            {
              id: "course-stocks-l4-q3",
              question:
                "In order of priority if a company fails, which is correct (highest claim first)?",
              choices: [
                "Common stock, preferred stock, bonds",
                "Bonds, preferred stock, common stock",
                "Preferred stock, bonds, common stock",
                "All three are paid equally",
              ],
              correctAnswerIndex: 1,
              explanation:
                "Bondholders are paid first, then preferred shareholders, then common shareholders — who bear the most risk and get whatever is left, if anything.",
            },
            {
              id: "course-stocks-l4-q4",
              question: "Where does preferred stock sit on the risk/reward spectrum compared to bonds and common stock?",
              choices: [
                "Higher risk and reward than common stock",
                "Lower risk and reward than bonds",
                "Between bonds and common stock",
                "Identical to bonds in every way",
              ],
              correctAnswerIndex: 2,
              explanation:
                "Preferred stock sits in between: steadier than common stock but riskier — and with more upside potential — than a bond.",
            },
          ],
        },
      },
    ],
  },
  {
    id: "course-etfs",
    title: "What Is an ETF?",
    description: "See how an ETF bundles many securities into one tradable share.",
    category: "ETFS",
    order: 2,
    lessons: [
      {
        id: "course-etfs-l1",
        title: "ETFs vs. Individual Stocks",
        content: `An **Exchange-Traded Fund (ETF)** is a single security that holds a basket of other securities inside it — often dozens, hundreds, or even thousands of stocks or bonds. Buy one share, and you own a small slice of everything it holds, all at once.

The most common type tracks an index. SPY, for example, holds (approximately) the 500 companies in the S&P 500. Buy one share of SPY and you own a tiny sliver of all 500 companies, in roughly the same proportions as the index itself.

::diagram[DiversificationDiagram]{concentratedLabel=1 stock|diversifiedLabel=500 companies (S&P 500)|diversifiedSegments=10}

## Why this matters

An ETF separates two decisions that are usually bundled together: picking *which* companies to own, and deciding *how many* to spread your money across. It answers the second question instantly — one purchase, instant diversification.

In this app, ETFs trade exactly like stocks: same order ticket, same T+1 closing-price fills, same position tracking.

::callout[Key Takeaway]
One ETF share can give you instant diversification across hundreds of companies in a single purchase.
- An index ETF holds a basket proportional to the index it tracks
- ETFs trade with the identical buy/sell flow as any stock in this app`,
        quiz: {
          id: "course-etfs-l1-quiz",
          title: "ETFs vs. Individual Stocks quiz",
          questions: [
            {
              id: "course-etfs-l1-q1",
              question: "What does buying one share of an ETF actually give you?",
              choices: [
                "Ownership in a single company only",
                "A small slice of everything the ETF holds",
                "A loan to the ETF provider",
                "A guaranteed fixed return",
              ],
              correctAnswerIndex: 1,
              explanation:
                "An ETF share represents proportional ownership across its entire basket of holdings, not just one company.",
            },
            {
              id: "course-etfs-l1-q2",
              question: "What does an index ETF like one tracking the S&P 500 actually hold?",
              choices: [
                "Cash only",
                "Bonds exclusively",
                "A basket of the companies in that index, in similar proportions",
                "Options contracts on the index",
              ],
              correctAnswerIndex: 2,
              explanation:
                "An index ETF holds the underlying constituents of the index it tracks, weighted similarly to how the index itself is weighted.",
            },
            {
              id: "course-etfs-l1-q3",
              question: "What problem does an ETF solve for an investor who wants broad diversification?",
              choices: [
                "It eliminates all investment risk entirely",
                "It lets you get exposure to many companies in a single purchase, instead of buying each one individually",
                "It guarantees higher returns than individual stocks",
                "It removes the need to ever sell",
              ],
              correctAnswerIndex: 1,
              explanation:
                "ETFs bundle many holdings into one tradable share, so one purchase can instantly spread your money across many companies.",
            },
            {
              id: "course-etfs-l1-q4",
              question: "How does trading an ETF in this app compare to trading a stock?",
              choices: [
                "ETFs use a completely different order ticket",
                "ETFs settle instantly, unlike stocks",
                "ETFs trade the same way — same order ticket, same T+1 fill at the close",
                "ETFs cannot be sold once purchased",
              ],
              correctAnswerIndex: 2,
              explanation:
                "In Fantasy Trade, ETFs go through the identical buy/sell flow and T+1 closing-price fill as any stock.",
            },
          ],
        },
      },
      {
        id: "course-etfs-l2",
        title: "How ETFs Are Priced and Traded",
        content: `Unlike a traditional mutual fund, which you can only buy or sell once per day at a single end-of-day price, an ETF trades on an exchange all day long, just like a stock.

## NAV: what an ETF's price tracks

An ETF's price tends to track its **Net Asset Value (NAV)** — the combined value of everything it holds, divided by shares outstanding. Authorized participants can create or redeem large blocks of shares for the underlying holdings, which keeps the market price closely tied to NAV even as it trades throughout the day.

## Building an allocation with ETFs

One ETF per asset class can build a whole allocation in a handful of purchases, instead of dozens of individual securities:

::diagram[AssetAllocationPie]

## See it in action

Open any ETF's **Analytics** tab (try SPY) to see its real market cap and price history, and how closely its price has tracked over time.

::callout[Key Takeaway]
An ETF's price should closely reflect the real-time value of what it holds, and you can trade it any time the market is open.
- NAV = combined value of holdings ÷ shares outstanding
- Authorized participants keep market price and NAV in line`,
        quiz: {
          id: "course-etfs-l2-quiz",
          title: "How ETFs Are Priced and Traded quiz",
          questions: [
            {
              id: "course-etfs-l2-q1",
              question: "How does an ETF's trading differ from a traditional mutual fund?",
              choices: [
                "ETFs can only be traded once a day, like mutual funds",
                "ETFs trade continuously on an exchange throughout the day",
                "ETFs can never be sold",
                "Mutual funds trade more frequently than ETFs",
              ],
              correctAnswerIndex: 1,
              explanation:
                "ETFs trade on an exchange throughout the trading day, unlike traditional mutual funds which price and transact only once daily.",
            },
            {
              id: "course-etfs-l2-q2",
              question: "What is Net Asset Value (NAV) in the context of an ETF?",
              choices: [
                "The ETF's original launch price",
                "The combined value of the ETF's holdings divided by shares outstanding",
                "A fee charged to ETF investors",
                "The highest price the ETF has ever reached",
              ],
              correctAnswerIndex: 1,
              explanation:
                "NAV represents the per-share value of everything the fund actually holds — its price should track closely to this.",
            },
            {
              id: "course-etfs-l2-q3",
              question: "What keeps an ETF's market price close to its NAV throughout the day?",
              choices: [
                "Government price controls",
                "The creation/redemption mechanism used by authorized participants",
                "ETFs are legally required to match NAV exactly at all times",
                "Nothing — ETF prices and NAV are unrelated",
              ],
              correctAnswerIndex: 1,
              explanation:
                "Authorized participants can create or redeem shares for the underlying holdings, which arbitrages the ETF price back toward its NAV.",
            },
            {
              id: "course-etfs-l2-q4",
              question: "What's a practical benefit of an ETF trading like a stock?",
              choices: [
                "You must wait until market close to buy or sell it",
                "You can buy or sell it any time the market is open, at a live price",
                "It has no price until the next day",
                "It can only be purchased directly from the company",
              ],
              correctAnswerIndex: 1,
              explanation:
                "Because it trades on an exchange, an ETF can be bought or sold anytime during market hours, unlike once-a-day mutual fund pricing.",
            },
          ],
        },
      },
      {
        id: "course-etfs-l3",
        title: "Popular ETF Types",
        content: `ETFs come in a few broad flavors, and this app's seeded securities cover most of them.

## The four broad flavors

- **Broad market index ETFs** (like SPY, VOO, VTI) track a wide swath of the stock market — hundreds or thousands of companies at once.
- **Sector ETFs** (like XLF for financials, XLK for technology) let you bet on or diversify within a single industry.
- **Bond ETFs** (like AGG, TLT, SHY) hold baskets of bonds instead of stocks, with stock-like tradability.
- **Commodity ETFs** (like GLD for gold, USO for oil, DBC for a broad commodity basket) track the price of physical goods or futures.

::diagram[RiskReturnSpectrum]

Picking an ETF type is about picking *what kind of exposure* you want — broad market, one sector, fixed income, or commodities — and letting the fund handle the mechanics of holding dozens or hundreds of underlying positions for you.

::callout[Key Takeaway]
Each ETF flavor maps onto a different point on the risk/return spectrum, from bond ETFs to commodity ETFs.
- Broad market ETFs diversify across the whole market; sector ETFs concentrate on one industry
- Bond and commodity ETFs package fixed-income and physical-goods exposure into ordinary tradable shares`,
        quiz: {
          id: "course-etfs-l3-quiz",
          title: "Popular ETF Types quiz",
          questions: [
            {
              id: "course-etfs-l3-q1",
              question: "What does a sector ETF like XLK give you exposure to?",
              choices: [
                "A single company only",
                "One specific industry, across many companies",
                "Only government bonds",
                "Physical commodities",
              ],
              correctAnswerIndex: 1,
              explanation:
                "A sector ETF concentrates on one industry (like technology) while still spreading risk across many companies within it.",
            },
            {
              id: "course-etfs-l3-q2",
              question: "How does a commodity ETF like GLD let you invest in gold?",
              choices: [
                "It requires you to take physical delivery of gold bars",
                "It tracks the price of gold without requiring you to store it yourself",
                "It's actually a bond fund, not related to gold",
                "It pays a fixed interest rate unrelated to gold prices",
              ],
              correctAnswerIndex: 1,
              explanation:
                "Commodity ETFs track an underlying commodity's price so investors get that exposure without physical storage or delivery.",
            },
            {
              id: "course-etfs-l3-q3",
              question: "What kind of holdings does a bond ETF like AGG contain?",
              choices: ["Individual stocks", "A basket of bonds", "Only cash", "Real estate"],
              correctAnswerIndex: 1,
              explanation:
                "Bond ETFs hold a basket of fixed-income securities, giving diversified bond exposure that trades like a stock.",
            },
            {
              id: "course-etfs-l3-q4",
              question:
                "What's the main difference between a broad market ETF (like VTI) and a sector ETF (like XLF)?",
              choices: [
                "There is no real difference",
                "A broad market ETF spans the whole market; a sector ETF concentrates on one industry",
                "Sector ETFs are always bond funds",
                "Broad market ETFs only hold one company",
              ],
              correctAnswerIndex: 1,
              explanation:
                "Broad market ETFs diversify across the whole market, while sector ETFs deliberately concentrate exposure in a single industry.",
            },
          ],
        },
      },
    ],
  },
  {
    id: "course-bonds",
    title: "What Is a Bond?",
    description: "Understand bonds as loans, and why their prices move opposite to interest rates.",
    category: "BONDS",
    order: 3,
    lessons: [
      {
        id: "course-bonds-l1",
        title: "Bonds as Loans",
        content: `A bond is essentially an IOU. When you buy a bond, you're lending money to whoever issued it — a government, a city, or a corporation — in exchange for their promise to pay you back.

::diagram[StockVsBondDiagram]{highlight=bond}

## The three key parts of a bond

- **Face value (or par value)** — the amount you'll be repaid when the bond matures, typically $1,000 per bond.
- **Coupon rate** — the fixed interest rate the issuer pays you, usually on a regular schedule.
- **Maturity date** — when the issuer repays your original principal in full.

## A worked example

A 10-year bond with a $1,000 face value and a 4% coupon pays you $40 a year for 10 years, then returns your original $1,000 at the end. Barring default, that outcome is fixed and known in advance — a sharp contrast to a stock, whose future payout is never guaranteed.

::callout[Key Takeaway]
A bond is a loan with a known, fixed schedule — as shown in the diagram above, you get paid before shareholders if the company runs into trouble.
- Face value, coupon rate, and maturity date fully define what you'll receive
- Barring default, the payout schedule is fixed and known in advance`,
        quiz: {
          id: "course-bonds-l1-quiz",
          title: "Bonds as Loans quiz",
          questions: [
            {
              id: "course-bonds-l1-q1",
              question: "What does buying a bond actually mean you're doing?",
              choices: [
                "Buying part-ownership of a company",
                "Lending money to the bond's issuer",
                "Purchasing an insurance policy",
                "Speculating on a commodity price",
              ],
              correctAnswerIndex: 1,
              explanation:
                "A bond represents a loan from you to the issuer, who promises to pay interest and return your principal — the lending side of the stock-vs-bond diagram earlier in this lesson.",
            },
            {
              id: "course-bonds-l1-q2",
              question: "What is a bond's 'coupon rate'?",
              choices: [
                "The bond's original purchase discount",
                "The fixed interest rate the issuer pays the bondholder",
                "A fee charged for buying the bond",
                "The bond's ticker symbol",
              ],
              correctAnswerIndex: 1,
              explanation: "The coupon rate is the fixed interest payment rate the issuer pays regularly until the bond matures.",
            },
            {
              id: "course-bonds-l1-q3",
              question: "What happens at a bond's maturity date, assuming no default?",
              choices: [
                "The bond automatically converts to stock",
                "The issuer repays the original principal (face value) in full",
                "The bondholder must repay the issuer",
                "Nothing — the bond simply expires worthless",
              ],
              correctAnswerIndex: 1,
              explanation: "At maturity, the issuer returns the bond's face value to the holder, completing the loan.",
            },
            {
              id: "course-bonds-l1-q4",
              question: "How does a bond's payout typically compare to a stock's?",
              choices: [
                "Both are equally unpredictable",
                "A bond's payout schedule is fixed and known in advance (absent default); a stock's future payout is not guaranteed",
                "A bond's payout is always higher than a stock's",
                "Stocks always pay a fixed coupon like bonds",
              ],
              correctAnswerIndex: 1,
              explanation:
                "Bonds promise a known, fixed schedule of payments, while stock returns depend entirely on the company's uncertain future performance.",
            },
          ],
        },
      },
      {
        id: "course-bonds-l2",
        title: "Bond Prices and Interest Rates",
        content: `Bond prices and interest rates move in opposite directions — one of the most important, and most counterintuitive, ideas in fixed income.

## Why the inverse relationship exists

Imagine you hold a bond paying a fixed 4% coupon. If newly issued bonds start paying 5% because rates rose, your old 4% bond is now less attractive — no one will pay full price for it when they could buy a new bond paying more. Your bond's *price* has to fall until its effective yield is competitive.

The reverse happens when rates fall: your existing 4% bond becomes relatively more attractive, so its price rises.

::diagram[RiskReturnSpectrum]{highlight=BONDS}

## Duration matters

This is why bond ETFs like TLT (long-duration Treasurys) swing more than SHY (short-duration Treasurys) when rates move — the longer until maturity, the more a bond's price has to adjust to stay competitive over that whole remaining stretch.

::callout[Key Takeaway]
Bond prices and interest rates move in opposite directions — and the longer a bond's duration, the bigger that swing.
- Rates up → existing bond prices down; rates down → existing bond prices up
- TLT (long duration) swings more than SHY (short duration) on the same rate move`,
        quiz: {
          id: "course-bonds-l2-quiz",
          title: "Bond Prices and Interest Rates quiz",
          questions: [
            {
              id: "course-bonds-l2-q1",
              question:
                "If newly issued bonds start paying higher interest rates, what typically happens to the price of existing lower-coupon bonds?",
              choices: ["Their price rises", "Their price falls", "Their price is unaffected", "They automatically convert to the new rate"],
              correctAnswerIndex: 1,
              explanation:
                "Existing lower-coupon bonds become less attractive versus new higher-paying bonds, so their price must fall to stay competitive.",
            },
            {
              id: "course-bonds-l2-q2",
              question: "What happens to existing bond prices when interest rates fall?",
              choices: [
                "Existing bond prices tend to rise",
                "Existing bond prices tend to fall",
                "Nothing changes",
                "Bonds are recalled by the issuer automatically",
              ],
              correctAnswerIndex: 0,
              explanation: "When new bonds pay less, existing higher-coupon bonds become relatively more attractive, pushing their price up.",
            },
            {
              id: "course-bonds-l2-q3",
              question:
                "Why does a long-duration bond ETF like TLT typically swing more than a short-duration one like SHY when rates change?",
              choices: [
                "TLT holds riskier companies",
                "Longer time until maturity means more years over which the bond's fixed payments must stay competitive with new rates",
                "SHY doesn't actually hold bonds",
                "There's no real difference between the two",
              ],
              correctAnswerIndex: 1,
              explanation:
                "The longer a bond's remaining life, the more its price has to move to stay competitive with new rates over that entire span.",
            },
            {
              id: "course-bonds-l2-q4",
              question: "What is the core relationship between bond prices and interest rates?",
              choices: [
                "They move in the same direction",
                "They move in opposite directions",
                "They are completely unrelated",
                "Bond prices are fixed regardless of rates",
              ],
              correctAnswerIndex: 1,
              explanation:
                "This inverse relationship is one of the most fundamental ideas in fixed-income investing: rates up, existing bond prices down, and vice versa.",
            },
          ],
        },
      },
      {
        id: "course-bonds-l3",
        title: "Why Investors Hold Bonds",
        content: `If bonds typically offer lower returns than stocks over time, why hold them at all? A few reasons show up again and again in a well-built portfolio.

## Four reasons to hold bonds

- **Income** — regular, predictable coupon payments, useful for steady cash flow rather than relying on selling shares.
- **Stability** — bond prices generally swing less than stock prices, cushioning a portfolio when stocks fall.
- **Diversification** — bonds and stocks don't always move together, smoothing out a portfolio's ride.
- **Capital preservation** — especially with short-duration, high-quality bonds, protecting what you already have.

A bond-heavy allocation is a common way to prioritize exactly that:

::diagram[AssetAllocationPie]{segments=Bonds:60,Stocks:30,Cash:10}

None of this makes bonds "safer" in every sense — they still carry interest-rate risk and, for corporate bonds, credit (default) risk.

::callout[Key Takeaway]
Bonds typically play a steadying role rather than a growth role, relative to stocks, in a diversified portfolio.
- Regular coupon income and lower volatility than stocks
- Still carry interest-rate risk and, for corporate bonds, default risk`,
        quiz: {
          id: "course-bonds-l3-quiz",
          title: "Why Investors Hold Bonds quiz",
          questions: [
            {
              id: "course-bonds-l3-q1",
              question: "What is a primary reason investors hold bonds for income?",
              choices: [
                "Bonds always outperform stocks",
                "Bonds provide regular, predictable coupon payments",
                "Bonds have no risk whatsoever",
                "Bonds cannot be sold before maturity",
              ],
              correctAnswerIndex: 1,
              explanation:
                "The scheduled coupon payments give bondholders a predictable income stream, which is a major reason income-focused investors hold them.",
            },
            {
              id: "course-bonds-l3-q2",
              question: "How do bonds typically affect a portfolio that also holds stocks?",
              choices: [
                "They always move in lockstep with stocks",
                "They can smooth out overall portfolio swings since they don't always move with stocks",
                "They guarantee the portfolio can never lose value",
                "They eliminate the need to ever own stocks",
              ],
              correctAnswerIndex: 1,
              explanation:
                "Because bonds and stocks don't always move together, combining them can reduce a portfolio's overall volatility — classic diversification.",
            },
            {
              id: "course-bonds-l3-q3",
              question: "Are bonds completely risk-free?",
              choices: [
                "Yes, bonds carry no risk of any kind",
                "No — they still carry interest-rate risk and, for corporate bonds, credit/default risk",
                "Only government bonds carry any risk",
                "Bonds are riskier than stocks in every case",
              ],
              correctAnswerIndex: 1,
              explanation:
                "Bonds are generally steadier than stocks but aren't risk-free — rate changes affect their price, and issuers can still default.",
            },
            {
              id: "course-bonds-l3-q4",
              question: "What role do bonds typically play in a diversified portfolio, relative to stocks?",
              choices: [
                "A growth role, outperforming stocks over time",
                "A steadying/stability role rather than a primary growth role",
                "No role — bonds are never held alongside stocks",
                "An identical role to stocks",
              ],
              correctAnswerIndex: 1,
              explanation:
                "Bonds generally trade some upside potential for steadier income and lower volatility, complementing stocks' growth-oriented risk.",
            },
          ],
        },
      },
    ],
  },
  {
    id: "course-commodities",
    title: "What Are Commodities?",
    description: "Explore raw-material investing and how this app represents it through ETF proxies.",
    category: "COMMODITIES",
    order: 4,
    lessons: [
      {
        id: "course-commodities-l1",
        title: "What Counts as a Commodity",
        content: `A commodity is a basic, interchangeable raw material or agricultural product — the defining feature is that one unit is essentially identical to another. A barrel of crude oil from one producer is treated the same as a barrel from another; an ounce of gold is an ounce of gold, regardless of source.

That interchangeability (called *fungibility*) is what lets commodities trade on standardized exchanges at a single, universal price.

## The four broad categories

- **Precious metals** — gold, silver
- **Energy** — crude oil, natural gas
- **Agriculture** — wheat, corn, coffee, cotton
- **Industrial metals** — copper, aluminum

::diagram[RiskReturnSpectrum]{highlight=COMMODITIES}

## Not like owning a business

Unlike a stock, a commodity doesn't represent ownership in a business and doesn't generate earnings or pay dividends. Its value comes entirely from supply and demand for the physical good itself.

::callout[Key Takeaway]
A commodity's value comes purely from supply and demand for the physical good — not from any company's earnings.
- Fungibility (interchangeability) is what defines a commodity
- Weather, geopolitics, and industrial demand drive commodity prices, not earnings reports`,
        quiz: {
          id: "course-commodities-l1-quiz",
          title: "What Counts as a Commodity quiz",
          questions: [
            {
              id: "course-commodities-l1-q1",
              question: "What makes something a 'commodity' rather than, say, a branded product?",
              choices: [
                "It's expensive",
                "It's fungible — one unit is essentially identical to another regardless of source",
                "It's only sold by governments",
                "It never changes in price",
              ],
              correctAnswerIndex: 1,
              explanation:
                "Fungibility — interchangeability between units regardless of producer — is what defines a commodity and lets it trade on a standardized exchange.",
            },
            {
              id: "course-commodities-l1-q2",
              question: "Which of these is an example of an agricultural commodity?",
              choices: ["Gold", "Crude oil", "Wheat", "Copper"],
              correctAnswerIndex: 2,
              explanation: "Wheat is a classic agricultural commodity, alongside corn, coffee, and cotton.",
            },
            {
              id: "course-commodities-l1-q3",
              question: "Does owning a commodity give you a claim on a company's earnings, like a stock does?",
              choices: [
                "Yes, always",
                "No — commodities don't represent business ownership or earnings",
                "Only for precious metals",
                "Only for energy commodities",
              ],
              correctAnswerIndex: 1,
              explanation: "A commodity's value is driven purely by supply and demand for the physical good, not by any company's profits.",
            },
            {
              id: "course-commodities-l1-q4",
              question: "What primarily drives a commodity's price?",
              choices: [
                "A company's quarterly earnings report",
                "Supply and demand for the physical good itself",
                "The commodity's ticker symbol",
                "Government-set fixed prices",
              ],
              correctAnswerIndex: 1,
              explanation:
                "Since commodities aren't tied to a business's earnings, factors like weather, geopolitics, and industrial demand drive their prices instead.",
            },
          ],
        },
      },
      {
        id: "course-commodities-l2",
        title: "How People Invest in Commodities",
        content: `Very few individual investors want to take physical delivery of oil barrels or bushels of wheat. In practice, there are two common ways to get commodity exposure without doing that.

## Futures contracts

Agreements to buy or sell a commodity at a set price on a future date. They're the tool professional traders use directly, but leverage and expiration mechanics make them impractical for most everyday investors.

## Commodity ETFs — the common route

A fund like GLD physically holds gold bullion in vaults; USO holds oil futures so investors don't manage them directly; DBC spreads exposure across a broad basket.

::diagram[AssetAllocationPie]{segments=Gold (GLD):40,Oil (USO):30,Broad basket (DBC):30}

By trading GLD, USO, or DBC in this app, you get the price exposure of gold, oil, or a commodity basket through the exact same buy/sell flow as any stock — no vaults, no futures expirations.

::callout[Key Takeaway]
Commodity ETFs package futures or physical-goods exposure into an ordinary tradable share.
- Futures require active management most individuals want to avoid
- GLD, USO, and DBC each hold a different form of commodity exposure`,
        quiz: {
          id: "course-commodities-l2-quiz",
          title: "How People Invest in Commodities quiz",
          questions: [
            {
              id: "course-commodities-l2-q1",
              question: "Why do most individual investors avoid buying futures contracts directly?",
              choices: [
                "Futures are illegal for individuals",
                "Futures involve leverage and expiration mechanics that are impractical for most everyday investors",
                "Futures never track the commodity's price",
                "Futures can only be bought by governments",
              ],
              correctAnswerIndex: 1,
              explanation:
                "Futures contracts have leverage and expiration dates that require active management, which is why most individuals use ETFs instead.",
            },
            {
              id: "course-commodities-l2-q2",
              question: "How does GLD give investors exposure to gold?",
              choices: [
                "It's a bond fund unrelated to gold",
                "It physically holds gold bullion on behalf of shareholders",
                "It only tracks gold mining company stocks",
                "It requires investors to store gold themselves",
              ],
              correctAnswerIndex: 1,
              explanation:
                "GLD holds physical gold bullion in vaults, letting shareholders gain gold price exposure without storing it themselves.",
            },
            {
              id: "course-commodities-l2-q3",
              question: "What does DBC represent in this app's seeded securities?",
              choices: [
                "A single-company stock",
                "A broad basket of commodities in one fund",
                "A government bond",
                "A savings account",
              ],
              correctAnswerIndex: 1,
              explanation: "DBC (Invesco DB Commodity Index Tracking Fund) spreads exposure across multiple commodities in a single ETF.",
            },
            {
              id: "course-commodities-l2-q4",
              question:
                "What is the main advantage of trading a commodity ETF instead of futures contracts, for an everyday investor?",
              choices: [
                "ETFs pay a guaranteed dividend",
                "ETFs trade with the same simple buy/sell flow as a stock, without futures' leverage and expiration mechanics",
                "ETFs are commodities themselves, not funds",
                "There is no difference at all",
              ],
              correctAnswerIndex: 1,
              explanation:
                "Commodity ETFs package the exposure into an ordinary tradable share, avoiding the complexity of managing futures contracts directly.",
            },
          ],
        },
      },
      {
        id: "course-commodities-l3",
        title: "Commodities and Diversification",
        content: `Commodities often behave differently from stocks and bonds, which is the main reason investors add them to a portfolio at all.

## A different set of forces

Commodity prices are driven by physical supply and demand rather than corporate earnings or interest rates — a drought, a war affecting an energy supply route, or global industrial demand. That relatively low correlation to stocks and bonds is the core diversification benefit.

::diagram[DiversificationDiagram]{concentratedLabel=stocks & bonds alone|diversifiedLabel=stocks, bonds & commodities}

## An imperfect inflation hedge

Commodities, especially gold, are sometimes viewed as a hedge during inflation or uncertainty, since physical goods often rise alongside general price levels — though this relationship isn't perfectly reliable.

## The trade-off

Commodities produce no earnings, pay no dividends or coupons, and can be highly volatile. They're typically a smaller, targeted slice of a portfolio, not a core holding.

::callout[Key Takeaway]
Commodities' low correlation to stocks and bonds is their diversification value — not a guarantee of safety.
- Different forces (weather, geopolitics, industrial demand) drive commodity prices
- No earnings or dividends — typically a smaller, targeted slice of a portfolio`,
        quiz: {
          id: "course-commodities-l3-quiz",
          title: "Commodities and Diversification quiz",
          questions: [
            {
              id: "course-commodities-l3-q1",
              question: "What is the main diversification benefit of adding commodities to a stock/bond portfolio?",
              choices: [
                "Commodities always go up in value",
                "Commodities are often driven by different forces than stocks and bonds, giving relatively low correlation",
                "Commodities pay higher dividends than stocks",
                "Commodities eliminate all portfolio risk",
              ],
              correctAnswerIndex: 1,
              explanation:
                "Because commodity prices respond to different drivers (weather, geopolitics, industrial demand), they don't always move with stocks and bonds — the same diversification value shown in the diagram above.",
            },
            {
              id: "course-commodities-l3-q2",
              question: "Why might gold be viewed as a potential inflation hedge?",
              choices: [
                "Gold prices are fixed by the government",
                "The price of physical goods, including gold, has sometimes risen alongside general price levels",
                "Gold always outperforms stocks during inflation",
                "Gold pays a fixed coupon like a bond",
              ],
              correctAnswerIndex: 1,
              explanation: "Physical commodities can track general price increases, though the relationship is not perfectly reliable across every period.",
            },
            {
              id: "course-commodities-l3-q3",
              question: "Do commodities produce earnings or pay dividends like a stock?",
              choices: [
                "Yes, always",
                "No — commodities don't generate earnings or pay dividends/coupons",
                "Only precious metals pay dividends",
                "Only agricultural commodities pay dividends",
              ],
              correctAnswerIndex: 1,
              explanation: "Commodities are physical goods, not businesses — they have no earnings or dividend payments, unlike stocks.",
            },
            {
              id: "course-commodities-l3-q4",
              question: "Why are commodities typically used as a smaller, targeted slice of a portfolio rather than a core holding?",
              choices: [
                "They are illegal to hold in large amounts",
                "They can be highly volatile and produce no income, so they're usually a diversification tool rather than a primary return driver",
                "They always lose money over time",
                "They are only available to institutional investors",
              ],
              correctAnswerIndex: 1,
              explanation:
                "Their volatility and lack of income make commodities a useful diversifier in moderation, rather than a core, income-generating holding.",
            },
          ],
        },
      },
    ],
  },
  {
    id: "course-risk",
    title: "Risk & Diversification",
    description: "Learn what investment risk really means and how diversification manages it.",
    category: "RISK_DIVERSIFICATION",
    order: 5,
    lessons: [
      {
        id: "course-risk-l1",
        title: "What Is Investment Risk?",
        content: `In everyday language, "risk" just means "something bad might happen." In investing, it has a more specific meaning: risk is the *uncertainty* of an investment's return — both how far it might fall and how far it might rise.

## Volatility: how risk gets measured

How much and how often a price swings, up or down, over time. A stock that regularly moves 3% in a day is more volatile — carries more risk in this sense — than one that barely moves 0.3%.

## Risk and return are linked, not opposites

::diagram[RiskReturnSpectrum]

Investments with higher expected long-term returns tend to come with more volatility along the way, not less. Investors demand extra expected return as compensation for tolerating more uncertainty — there's no reliable way to get stock-like returns with bond-like stability.

Risk isn't something to eliminate entirely — a return of exactly zero risk usually means a return close to zero, too.

::callout[Key Takeaway]
Higher expected returns come bundled with more uncertainty along the way — that trade-off is the whole point, not a flaw.
- Volatility (how much and how often a price swings) is the practical measure of risk
- Be skeptical of anything promising high returns with no real risk`,
        quiz: {
          id: "course-risk-l1-quiz",
          title: "What Is Investment Risk? quiz",
          questions: [
            {
              id: "course-risk-l1-q1",
              question: "What does 'risk' mean in an investing context?",
              choices: [
                "A guarantee that you will lose money",
                "The uncertainty of an investment's return, including both downside and upside",
                "A tax owed on investment gains",
                "A fee charged by brokers",
              ],
              correctAnswerIndex: 1,
              explanation: "Investment risk refers to the uncertainty of outcomes — how much a return could vary — not a guarantee of loss.",
            },
            {
              id: "course-risk-l1-q2",
              question: "What does volatility measure?",
              choices: [
                "A company's total revenue",
                "How much and how often a price swings over time",
                "The number of shares outstanding",
                "The dividend yield",
              ],
              correctAnswerIndex: 1,
              explanation: "Volatility captures the size and frequency of price swings, which is the most common practical measure of investment risk.",
            },
            {
              id: "course-risk-l1-q3",
              question: "What is the general relationship between risk and expected long-term return?",
              choices: [
                "Higher risk generally comes with higher expected return, as compensation for uncertainty",
                "Higher risk always means lower returns",
                "Risk and return are completely unrelated",
                "Only bonds carry any risk at all",
              ],
              correctAnswerIndex: 0,
              explanation:
                "Investors generally demand more expected return for tolerating more uncertainty — this is exactly why the risk/return spectrum above runs from cash (low risk, low return) to commodities (high risk, high return).",
            },
            {
              id: "course-risk-l1-q4",
              question: "What should investors be skeptical of, based on the relationship between risk and return?",
              choices: [
                "Any investment that pays a dividend",
                "Claims of stock-like returns with bond-like stability and no real risk",
                "Any investment in ETFs",
                "Bonds in general",
              ],
              correctAnswerIndex: 1,
              explanation:
                "Since risk and expected return are linked, an investment promising high returns with little risk usually has hidden risk somewhere, or the claim isn't reliable.",
            },
          ],
        },
      },
      {
        id: "course-risk-l2",
        title: "Diversification Explained",
        content: `Diversification means spreading your money across different investments so that no single one can sink your entire portfolio. The classic phrase is "don't put all your eggs in one basket" — if you drop one basket, you still have the others.

::diagram[DiversificationDiagram]

## Why this works mathematically, not just intuitively

Different investments don't all move together. If you hold one stock and its company has a terrible quarter, your whole portfolio takes the full hit. Hold twenty stocks across different industries instead, and one bad quarter at one company barely dents your overall result.

A broad market decline that hits everything will still affect you, though — diversification manages *company-specific* risk, not market-wide risk.

## Beyond individual stocks

- ETFs are a popular diversification tool: one share can spread your money across hundreds of companies instantly.
- Spreading across asset classes (stocks, bonds, commodities) and sectors adds another layer, since those categories can respond quite differently to the same event.

::callout[Key Takeaway]
Diversification protects against any one holding sinking your portfolio — it doesn't protect against a decline hitting the whole market.
- Company-specific risk is what diversification actually manages
- A single ETF share can diversify across hundreds of companies at once`,
        quiz: {
          id: "course-risk-l2-quiz",
          title: "Diversification Explained quiz",
          questions: [
            {
              id: "course-risk-l2-q1",
              question: "What is the core idea behind diversification?",
              choices: [
                "Buying only the single best stock available",
                "Spreading investments across multiple assets so no single one can sink the whole portfolio",
                "Investing only in bonds",
                "Timing the market perfectly",
              ],
              correctAnswerIndex: 1,
              explanation:
                "Diversification spreads risk across many holdings so one bad outcome doesn't dominate your overall result — as shown in the diversification diagram above, a bad quarter barely dents the diversified side.",
            },
            {
              id: "course-risk-l2-q2",
              question: "Does diversification protect against a broad, market-wide decline?",
              choices: [
                "Yes, completely",
                "No — diversification mainly manages company-specific risk, not risk that affects the whole market",
                "Only for bond portfolios",
                "Only if you own exactly 10 stocks",
              ],
              correctAnswerIndex: 1,
              explanation:
                "Diversification reduces the impact of any single company's bad outcome, but a decline affecting the whole market will still affect a diversified portfolio.",
            },
            {
              id: "course-risk-l2-q3",
              question: "Why are ETFs a popular tool for diversification?",
              choices: [
                "They only hold one company at a time",
                "A single ETF share can spread money across many underlying companies instantly",
                "ETFs guarantee no losses",
                "ETFs are not related to diversification",
              ],
              correctAnswerIndex: 1,
              explanation:
                "One ETF purchase can provide exposure to hundreds of companies at once, achieving broad diversification without buying each position individually.",
            },
            {
              id: "course-risk-l2-q4",
              question: "Besides owning many stocks, what's another layer of diversification mentioned in this lesson?",
              choices: [
                "Buying only from one company",
                "Spreading across asset classes and sectors, like stocks, bonds, and commodities",
                "Only investing in your home country",
                "Concentrating in a single sector for focus",
              ],
              correctAnswerIndex: 1,
              explanation:
                "Diversifying across asset classes and sectors adds another layer, since these categories can respond quite differently to the same event.",
            },
          ],
        },
      },
      {
        id: "course-risk-l3",
        title: "Asset Allocation Basics",
        content: `**Asset allocation** is the decision of how to divide your money across broad categories — typically stocks, bonds, and cash — before you ever pick an individual security.

::diagram[AssetAllocationPie]

Research consistently suggests this high-level mix drives most of a portfolio's long-term risk and return, more than which specific stocks you pick within it.

## A few illustrative patterns (not prescriptive)

- A young investor with decades until retirement might lean heavily toward stocks, since they have time to ride out volatility.
- Someone near retirement might shift toward bonds and cash, prioritizing stability since there's less time to recover from a downturn.
- A more balanced investor might split roughly evenly, trading some growth potential for a smoother ride.

## Keeping the mix on target

**Rebalancing** — periodically buying/selling to restore your original target mix as prices drift it out of line — keeps your risk level from creeping away from your original intent as some assets outgrow others.

::callout[Key Takeaway]
Your broad stocks/bonds/cash mix drives most of a portfolio's long-term risk and return — more than individual stock picks.
- There's no single correct allocation — it depends on goals, time horizon, and risk tolerance
- Rebalancing restores your target mix as prices drift it out of line`,
        quiz: {
          id: "course-risk-l3-quiz",
          title: "Asset Allocation Basics quiz",
          questions: [
            {
              id: "course-risk-l3-q1",
              question: "What is asset allocation?",
              choices: [
                "Picking individual stock tickers",
                "Deciding how to divide money across broad categories like stocks, bonds, and cash",
                "A type of bond",
                "A tax filing status",
              ],
              correctAnswerIndex: 1,
              explanation: "Asset allocation is the high-level decision of how much to hold in each broad category, made before picking specific securities.",
            },
            {
              id: "course-risk-l3-q2",
              question: "What does research suggest is the biggest driver of a portfolio's long-term risk and return?",
              choices: [
                "Which specific stocks you pick",
                "The overall asset allocation mix (stocks/bonds/cash)",
                "The broker you use",
                "The time of day you place trades",
              ],
              correctAnswerIndex: 1,
              explanation:
                "The broad allocation across asset classes — like the sample breakdown shown in the allocation pie chart above — tends to matter more for long-term outcomes than individual security selection.",
            },
            {
              id: "course-risk-l3-q3",
              question: "Why might a young investor lean more heavily toward stocks?",
              choices: [
                "Stocks are risk-free for young people",
                "They have a longer time horizon to ride out volatility before needing the money",
                "Young investors are required to hold only stocks",
                "Bonds are illegal for young investors",
              ],
              correctAnswerIndex: 1,
              explanation:
                "A longer time horizon gives more time to recover from downturns, and more years for growth to compound — as shown in the compound-growth chart above, which is why younger investors can often tolerate more stock-heavy allocations.",
            },
            {
              id: "course-risk-l3-q4",
              question: "What is 'rebalancing'?",
              choices: [
                "Withdrawing all your money",
                "Periodically adjusting holdings to restore your original target asset mix",
                "Only buying bonds",
                "Changing your broker",
              ],
              correctAnswerIndex: 1,
              explanation:
                "Rebalancing counteracts drift caused by some assets growing faster than others, keeping your portfolio aligned with your original intended risk level.",
            },
          ],
        },
      },
      {
        id: "course-risk-l4",
        title: "Time Horizon and Risk Tolerance",
        content: `Two different — and often confused — factors shape how much risk makes sense for you: **time horizon** and **risk tolerance**.

## Time horizon: when you need the money

Money you'll need next year should generally sit somewhere stable — there's no time to recover from a downturn before you need to spend it. Money you won't touch for 20+ years can typically absorb more short-term volatility.

::diagram[CompoundGrowthChart]{principal=5000|annualRatePercent=7|years=30}

A long horizon doesn't just mean "more time to recover" — it also means more years for growth to compound on itself, as the chart above shows.

## Risk tolerance: how much you can handle

How much volatility can you handle emotionally and financially without making poor decisions, like panic-selling during a downturn? Two people with identical time horizons might reasonably choose different allocations for this reason alone.

Both matter together — a long time horizon doesn't help much if a downturn causes you to sell at the worst possible moment out of anxiety, arguably the single most common way investors damage their own long-term returns.

::callout[Key Takeaway]
Time horizon (when you need the money) and risk tolerance (what you can handle emotionally) are different things — both shape the right allocation for you.
- A longer horizon gives more time both to recover from downturns and for growth to compound
- Panic-selling during a downturn is one of the most common ways investors hurt their own returns`,
        quiz: {
          id: "course-risk-l4-quiz",
          title: "Time Horizon and Risk Tolerance quiz",
          questions: [
            {
              id: "course-risk-l4-q1",
              question: "What does 'time horizon' refer to?",
              choices: [
                "How much risk you can emotionally handle",
                "How long until you'll need the money",
                "The size of your portfolio",
                "Your broker's trading hours",
              ],
              correctAnswerIndex: 1,
              explanation:
                "Time horizon is about timing — how soon you'll need to spend the money — which affects how much volatility you can afford to ride out.",
            },
            {
              id: "course-risk-l4-q2",
              question: "What does 'risk tolerance' refer to, as distinct from time horizon?",
              choices: [
                "The exact same thing as time horizon",
                "How much volatility you can handle emotionally and financially without making poor decisions",
                "The interest rate on your bonds",
                "The number of stocks in your portfolio",
              ],
              correctAnswerIndex: 1,
              explanation:
                "Risk tolerance is the personal, emotional/financial capacity to handle volatility — it can differ between two people with the same time horizon.",
            },
            {
              id: "course-risk-l4-q3",
              question: "What is described as one of the most common ways investors damage their own long-term returns?",
              choices: [
                "Holding too many bonds",
                "Panic-selling during a downturn out of anxiety",
                "Diversifying too much",
                "Rebalancing too often",
              ],
              correctAnswerIndex: 1,
              explanation:
                "Selling at the worst moment due to fear can lock in losses and derail an otherwise sound long-term plan, regardless of time horizon.",
            },
            {
              id: "course-risk-l4-q4",
              question: "Why might money needed next year belong somewhere more stable than money needed in 20 years?",
              choices: [
                "There's no real difference in how each should be invested",
                "There's little time to recover from a downturn before the near-term money is needed",
                "Stable investments always earn more than stocks",
                "Only bonds can be sold quickly",
              ],
              correctAnswerIndex: 1,
              explanation:
                "A short time horizon leaves little room to recover from a temporary decline before the money must be spent, favoring more stable holdings.",
            },
          ],
        },
      },
    ],
  },
  {
    id: "course-portfolio",
    title: "Reading Your Portfolio",
    description: "Make sense of cost basis, market value, and profit/loss on your own positions.",
    category: "INVESTING_BASICS",
    order: 6,
    lessons: [
      {
        id: "course-portfolio-l1",
        title: "Cost Basis Explained",
        content: `Your **cost basis** is what you actually paid for a position — the foundation for measuring whether you've made or lost money on it.

## Averaging across multiple purchases

If you buy shares of the same security multiple times at different prices, this app (like real brokerages) tracks your **average cost basis**: total amount spent ÷ total shares owned.

::diagram[CostBasisDiagram]{variant=lots}

Buy 10 shares at $100 and later 10 more at $120, and your average cost basis becomes $110 per share — even though no single purchase was actually made at $110.

## Why average, not a list of every purchase

Every later buy or sell recalculates that average. This is exactly why the Portfolio page shows *average* cost basis rather than a list of every individual purchase price — one simple, recalculated baseline instead of an ever-growing list.

::callout[Key Takeaway]
Cost basis is the baseline every gain/loss calculation is measured against — get comfortable with it, and market value and P/L fall into place naturally.
- Average cost basis = total amount spent ÷ total shares owned
- Every additional purchase recalculates the average`,
        quiz: {
          id: "course-portfolio-l1-quiz",
          title: "Cost Basis Explained quiz",
          questions: [
            {
              id: "course-portfolio-l1-q1",
              question: "What does 'cost basis' represent?",
              choices: [
                "The current market price of a stock",
                "What you actually paid for a position",
                "A fee charged by your broker",
                "The company's total revenue",
              ],
              correctAnswerIndex: 1,
              explanation: "Cost basis is your own purchase price — the baseline used to measure gain or loss on a position.",
            },
            {
              id: "course-portfolio-l1-q2",
              question: "If you buy 10 shares at $100 and later 10 more shares at $120, what is your average cost basis per share?",
              choices: ["$100", "$120", "$110", "$220"],
              correctAnswerIndex: 2,
              explanation:
                "Average cost basis is total spent ÷ total shares: (10×$100 + 10×$120) ÷ 20 = $110 per share — exactly the two lots blending together in the diagram above.",
            },
            {
              id: "course-portfolio-l1-q3",
              question:
                "Why does this app track average cost basis instead of listing every individual purchase price separately?",
              choices: [
                "It's required by law",
                "It gives one simple, recalculated baseline that updates cleanly as you buy more of the same security",
                "Average cost basis is always lower than any individual purchase",
                "It only applies to bonds",
              ],
              correctAnswerIndex: 1,
              explanation:
                "Averaging keeps the gain/loss calculation simple and consistent as additional purchases are made over time, rather than tracking each lot separately.",
            },
            {
              id: "course-portfolio-l1-q4",
              question: "What is cost basis the baseline for?",
              choices: [
                "Calculating your gain or loss on a position",
                "Determining your account's cash balance",
                "Setting the stock's future price",
                "Calculating dividend payments",
              ],
              correctAnswerIndex: 0,
              explanation:
                "Every gain/loss (P/L) calculation compares current market value against cost basis — it's the reference point for measuring performance.",
            },
          ],
        },
      },
      {
        id: "course-portfolio-l2",
        title: "Market Value vs. Cost Basis",
        content: `**Market value** is what a position is worth right now: share count × the security's latest price. **Cost basis** is what you paid. The difference is your **unrealized gain or loss** — "unrealized" because you haven't sold yet, so nothing is locked in.

## A worked example

Own 10 shares with a $110 average cost basis, and the latest close is $130:

::diagram[CostBasisDiagram]{costBasis=1100|marketValue=1300}

Market value is $1,300 and the unrealized gain is $200 — 10 shares × $20 per share above cost basis.

## Unrealized vs. realized

This gain can still change — and even reverse completely — before you sell. Only when you actually sell does a gain or loss become **realized**, locked in at the sale price. Your [Portfolio](/portfolio) page's "Gain/loss" column is this unrealized figure, recalculated fresh every time prices update.

::callout[Key Takeaway]
Market value minus cost basis is your unrealized gain or loss — real on paper, but not locked in until you sell.
- Market value = share count × current price
- A gain or loss only becomes realized at the moment you actually sell`,
        quiz: {
          id: "course-portfolio-l2-quiz",
          title: "Market Value vs. Cost Basis quiz",
          questions: [
            {
              id: "course-portfolio-l2-q1",
              question: "How is market value calculated for a position?",
              choices: [
                "Cost basis divided by share count",
                "Share count multiplied by the current price",
                "The original purchase price only",
                "Total account cash balance",
              ],
              correctAnswerIndex: 1,
              explanation: "Market value reflects what the position is worth right now: quantity held × the latest price.",
            },
            {
              id: "course-portfolio-l2-q2",
              question: "What does 'unrealized gain' mean?",
              choices: [
                "A gain that has been locked in by selling",
                "The paper gain on a position you still hold, which can still change before you sell",
                "A gain that is guaranteed never to reverse",
                "A tax refund",
              ],
              correctAnswerIndex: 1,
              explanation:
                "Unrealized gains exist only on paper for positions you still hold — they can grow, shrink, or disappear entirely before you sell.",
            },
            {
              id: "course-portfolio-l2-q3",
              question: "When does a gain or loss become 'realized'?",
              choices: [
                "The moment you buy a position",
                "Only when you actually sell the position",
                "At the end of every trading day automatically",
                "Never — gains are always unrealized",
              ],
              correctAnswerIndex: 1,
              explanation:
                "A gain or loss locks in — becomes realized — only at the moment you actually sell, at whatever price the sale executes.",
            },
            {
              id: "course-portfolio-l2-q4",
              question: "If you own 10 shares with a $110 cost basis and the current price is $130, what is your unrealized gain?",
              choices: ["$110", "$130", "$200", "$1,300"],
              correctAnswerIndex: 2,
              explanation: "Unrealized gain = (current price − cost basis) × shares = ($130 − $110) × 10 = $200.",
            },
          ],
        },
      },
      {
        id: "course-portfolio-l3",
        title: "Understanding P/L (Profit and Loss)",
        content: `P/L, short for profit and loss, is usually shown two ways side by side: a dollar amount and a percentage. Both matter, and they tell you different things.

## Dollar P/L vs. percentage P/L

The **dollar P/L** tells you the actual size of the gain or loss. The **percentage P/L** tells you the *rate* of gain or loss relative to what you invested — useful for comparing positions of very different sizes.

::diagram[CostBasisDiagram]{costBasis=1000|marketValue=1500}

A $500 gain on a $1,000 position (50%) is a very different story from a $500 gain on a $50,000 position (1%), even though the dollar figure is identical.

## Still unrealized until you sell

Your [portfolio's](/portfolio) total P/L, and each position's P/L, are unrealized until you sell — a green number isn't money in hand yet, just as a red number isn't a locked-in loss. There's no forced deadline to sell at a loss just because the unrealized number is negative today.

::callout[Key Takeaway]
Percentage P/L lets you fairly compare gains across positions of very different sizes — dollar P/L alone can be misleading.
- $500 on a $1,000 position (50%) is very different from $500 on a $50,000 position (1%)
- P/L stays unrealized, and can still change, until you actually sell`,
        quiz: {
          id: "course-portfolio-l3-quiz",
          title: "Understanding P/L (Profit and Loss) quiz",
          questions: [
            {
              id: "course-portfolio-l3-q1",
              question: "Why does percentage P/L matter in addition to dollar P/L?",
              choices: [
                "It doesn't matter — dollar P/L is the only useful figure",
                "It lets you compare performance across positions of very different sizes",
                "Percentage P/L is always more accurate than dollar P/L",
                "Percentage P/L only applies to bonds",
              ],
              correctAnswerIndex: 1,
              explanation:
                "Percentage P/L normalizes for position size, making it possible to fairly compare a small position's performance against a much larger one.",
            },
            {
              id: "course-portfolio-l3-q2",
              question: "A position gains $500 on a $1,000 investment. What is the percentage P/L?",
              choices: ["5%", "50%", "500%", "0.5%"],
              correctAnswerIndex: 1,
              explanation:
                "$500 gain ÷ $1,000 invested = 50% — the same dollar gain would be a very different percentage on a larger position.",
            },
            {
              id: "course-portfolio-l3-q3",
              question: "Is an unrealized loss on your screen the same as a locked-in loss?",
              choices: [
                "Yes, it's final the moment it appears",
                "No — it remains unrealized, and can still change, until you actually sell",
                "Only for bonds",
                "Only if the loss exceeds 10%",
              ],
              correctAnswerIndex: 1,
              explanation:
                "An unrealized loss is just the current paper value — it isn't locked in until you sell at that price, and it can recover before then.",
            },
            {
              id: "course-portfolio-l3-q4",
              question: "Is there a rule that forces you to sell a position once it shows an unrealized loss?",
              choices: [
                "Yes, positions must be sold at a 10% loss",
                "No — there's no forced deadline; the loss stays unrealized until you choose to sell",
                "Yes, all losing positions must be sold within 24 hours",
                "Only true for ETFs",
              ],
              correctAnswerIndex: 1,
              explanation:
                "An unrealized loss doesn't force a sale — you can continue holding, and the outcome remains open until you actually decide to sell.",
            },
          ],
        },
      },
    ],
  },
  {
    id: "course-order-types",
    title: "Order Types",
    description: "Compare market and limit orders, and know when to use each.",
    category: "MARKET_MECHANICS",
    order: 7,
    lessons: [
      {
        id: "course-order-types-l1",
        title: "Market Orders",
        content: `A **market order** is an instruction to buy or sell immediately at the best currently available price — no price specified. You're prioritizing *speed and certainty of execution* over the exact price you'll pay or receive.

::diagram[OrderTypeDiagram]{side=BUY}

## How this app fills a market order

Since trades execute once per simulated day rather than in real time, a market order here fills at the most recent closing price. In a live market, a market order fills near-instantly against whatever price is currently available — which can differ slightly from the last quoted price, especially for less-traded securities, a gap called *slippage*.

## The default order type

Market orders are the simplest, most common type, and the right default when your priority is "get this trade done now." Every BUY or SELL you've placed in this app so far, unless you selected "Limit," has been a market order.

::callout[Key Takeaway]
A market order trades exact price control for speed and certainty of execution.
- In this app, market orders fill at the most recent closing price
- "Slippage" describes the small gap between expected and actual fill price in a live market`,
        quiz: {
          id: "course-order-types-l1-quiz",
          title: "Market Orders quiz",
          questions: [
            {
              id: "course-order-types-l1-q1",
              question: "What does a market order prioritize?",
              choices: [
                "Getting an exact specified price no matter how long it takes",
                "Immediate execution at the best currently available price",
                "Never executing at all",
                "A guaranteed profit",
              ],
              correctAnswerIndex: 1,
              explanation: "A market order trades certainty and speed of execution for giving up control over the exact fill price.",
            },
            {
              id: "course-order-types-l1-q2",
              question: "In this app, what price does a market order fill at?",
              choices: ["A random price", "The most recent closing price", "Tomorrow's opening price", "The average price over the last year"],
              correctAnswerIndex: 1,
              explanation: "Since this app updates prices once per simulated day, market orders here fill at the most recent recorded close.",
            },
            {
              id: "course-order-types-l1-q3",
              question: "What is 'slippage' in the context of a real-market order?",
              choices: [
                "A discount all brokers charge",
                "The gap between the expected price and the actual fill price, especially for less-traded securities",
                "A type of dividend",
                "A tax on trading",
              ],
              correctAnswerIndex: 1,
              explanation:
                "Slippage describes the small difference that can occur between the last quoted price and where a market order actually executes in a live market.",
            },
            {
              id: "course-order-types-l1-q4",
              question: "Which order type have you been placing whenever you didn't select 'Limit' in this app?",
              choices: ["A limit order", "A market order", "A bond purchase", "A dividend reinvestment"],
              correctAnswerIndex: 1,
              explanation: "The default order type — whenever Limit isn't explicitly selected — is a market order, filling at the current closing price.",
            },
          ],
        },
      },
      {
        id: "course-order-types-l2",
        title: "Limit Orders",
        content: `A **limit order** lets you name your price instead of accepting whatever the market currently offers. For a BUY, you set the *maximum* price you're willing to pay; for a SELL, the *minimum* you'll accept. It only executes if the market reaches your price.

::diagram[OrderTypeDiagram]{side=BUY|currentPrice=100|limitPrice=95}

## How this app resolves a limit order

A limit order queues as **PENDING** the moment you place it. On the next daily close, it's checked against that day's new price: a BUY limit fills if the close is at or below your limit; a SELL limit fills if the close is at or above it. If the condition isn't met, the order **expires** unfilled rather than lingering indefinitely.

## The trade-off vs. a market order

A limit order gives you price control, but no guarantee of ever executing at all. In a live market, limit orders can sit unfilled for a long time, or forever, if the price never reaches your target.

::callout[Key Takeaway]
A limit order trades away guaranteed execution for control over the exact price you're willing to trade at.
- BUY limit fills at or below your price; SELL limit fills at or above it
- In this app, an unmet limit order expires at the next close rather than waiting indefinitely`,
        quiz: {
          id: "course-order-types-l2-quiz",
          title: "Limit Orders quiz",
          questions: [
            {
              id: "course-order-types-l2-q1",
              question: "What does a limit order let you control that a market order doesn't?",
              choices: [
                "The exact time of day the trade executes",
                "The maximum (buy) or minimum (sell) price you're willing to trade at",
                "The company you're buying shares of",
                "Your account's cash balance",
              ],
              correctAnswerIndex: 1,
              explanation:
                "A limit order sets a specific price boundary — you name your price rather than accepting whatever the market currently offers.",
            },
            {
              id: "course-order-types-l2-q2",
              question: "In this app, when does a BUY limit order actually fill?",
              choices: [
                "Immediately upon placing it",
                "On the next daily close, if that close is at or below your limit price",
                "Only if you cancel and resubmit it",
                "Never — limit orders can't fill in this app",
              ],
              correctAnswerIndex: 1,
              explanation:
                "Limit orders queue as PENDING and are checked against the next day's closing price — as shown in the order-type diagram above, a BUY fills only if that close meets or beats your limit.",
            },
            {
              id: "course-order-types-l2-q3",
              question:
                "What happens to a limit order in this app if its price condition is never met on the next close?",
              choices: [
                "It stays pending forever automatically retrying every day",
                "It expires unfilled",
                "It automatically converts to a market order",
                "It fills anyway at a random price",
              ],
              correctAnswerIndex: 1,
              explanation:
                "This app's limit orders are single-shot: if the next close doesn't meet the limit, the order expires rather than continuing to wait.",
            },
            {
              id: "course-order-types-l2-q4",
              question: "What is the main trade-off of using a limit order instead of a market order?",
              choices: [
                "You get price control, but no guarantee the order ever executes",
                "You get guaranteed execution and guaranteed price, with no trade-offs",
                "Limit orders always execute faster than market orders",
                "There is no trade-off at all",
              ],
              correctAnswerIndex: 0,
              explanation:
                "A limit order trades away the guarantee of execution in exchange for control over the price at which you're willing to trade.",
            },
          ],
        },
      },
      {
        id: "course-order-types-l3",
        title: "Why Order Type Matters",
        content: `Choosing between a market and limit order comes down to what you're trying to protect: **time** or **price**.

::diagram[OrderTypeDiagram]{side=SELL|currentPrice=100|limitPrice=105}

## When to reach for each

- **Market order** — when you're confident about wanting the trade done and the current price is acceptable. The more common choice for everyday, unhurried trades.
- **Limit order** — when the exact price matters more than whether the trade happens at all, and you're fine waiting, possibly indefinitely.

## Two different questions

Neither type is objectively "better" — as shown in the diagrams throughout this course, a market order answers "get me in or out now, whatever the price is"; a limit order answers "only trade at this price or better, and I'll wait for it."

::callout[Key Takeaway]
Recognizing which question you're actually asking — speed or price — is the real skill; the order ticket just expresses your answer.
- Market orders prioritize certainty of execution
- Limit orders prioritize price control, with no guarantee of ever filling`,
        quiz: {
          id: "course-order-types-l3-quiz",
          title: "Why Order Type Matters quiz",
          questions: [
            {
              id: "course-order-types-l3-q1",
              question: "When is a market order generally the more appropriate choice?",
              choices: [
                "When the exact price matters more than anything else",
                "When you want certainty of execution and the current price is acceptable to you",
                "Only when trading bonds",
                "Never — limit orders are always superior",
              ],
              correctAnswerIndex: 1,
              explanation:
                "Market orders suit situations where getting the trade done is the priority and the current price is already acceptable.",
            },
            {
              id: "course-order-types-l3-q2",
              question: "When is a limit order generally the more appropriate choice?",
              choices: [
                "When you don't care what price you get",
                "When the exact price matters more to you than whether the trade happens at all",
                "Only for selling, never for buying",
                "Only when the market is closed",
              ],
              correctAnswerIndex: 1,
              explanation:
                "Limit orders suit situations where you're willing to wait, or even miss the trade entirely, in exchange for a specific price.",
            },
            {
              id: "course-order-types-l3-q3",
              question: "What question does a market order answer?",
              choices: [
                "'Only trade at this price or better'",
                "'Get me in or out now, whatever the price is'",
                "'Never execute this trade'",
                "'Pay me a dividend today'",
              ],
              correctAnswerIndex: 1,
              explanation: "A market order prioritizes immediate execution over the specific price achieved.",
            },
            {
              id: "course-order-types-l3-q4",
              question: "Is one order type objectively better than the other?",
              choices: [
                "Yes, market orders are always better",
                "Yes, limit orders are always better",
                "No — they answer different questions about what you're prioritizing (speed vs. price)",
                "Only bonds use order types at all",
              ],
              correctAnswerIndex: 2,
              explanation:
                "Market and limit orders serve different priorities — speed/certainty versus price control — neither is universally superior.",
            },
          ],
        },
      },
    ],
  },
  {
    id: "course-mechanics",
    title: "Market Mechanics & This App",
    description: "See how real exchanges set prices, and why this app deliberately simplifies that into a daily close.",
    category: "MARKET_MECHANICS",
    order: 8,
    lessons: [
      {
        id: "course-mechanics-l1",
        title: "How Real Markets Set Prices",
        content: `A stock exchange is essentially a continuous auction. Buyers submit the price they're willing to pay (the **bid**), sellers submit the price they're willing to accept (the **ask**), and a trade happens whenever a bid and ask meet.

## The bid-ask spread

The gap between the best current bid and ask is called the **bid-ask spread** — usually just pennies for a heavily traded stock, wider for something thinly traded.

::diagram[OrderTypeDiagram]{side=BUY}

## From continuous matching to one closing price

This matching happens continuously throughout the trading day, which is why a stock's quoted price can change dozens of times a minute. The **closing price** you'll see reported as "today's close" is simply the price of the last trade executed before the exchange closed (some exchanges use a specific closing auction to set it precisely).

Real exchanges also enforce trading halts and other mechanisms to keep this orderly during extreme volatility — details this app doesn't attempt to simulate, since its focus is the *outcome* of a trading day, not its microstructure.

::callout[Key Takeaway]
A stock's closing price is simply the last trade before the exchange closed — the result of continuous bid/ask matching all day long.
- The bid-ask spread is the gap between the best current buy and sell offers
- This app models the outcome of a trading day, not its intraday microstructure`,
        quiz: {
          id: "course-mechanics-l1-quiz",
          title: "How Real Markets Set Prices quiz",
          questions: [
            {
              id: "course-mechanics-l1-q1",
              question: "What is the 'bid-ask spread'?",
              choices: [
                "The total number of shares traded in a day",
                "The gap between the best current buy offer (bid) and sell offer (ask)",
                "A tax on stock trades",
                "The difference between a stock's high and low price for the year",
              ],
              correctAnswerIndex: 1,
              explanation: "The bid-ask spread is the gap between what buyers are currently offering and what sellers are currently asking.",
            },
            {
              id: "course-mechanics-l1-q2",
              question: "What determines a stock's official closing price?",
              choices: [
                "A random number generator",
                "The price of the last trade executed before the exchange closes (often via a closing auction)",
                "The average price over the entire year",
                "The price set by the company's CEO",
              ],
              correctAnswerIndex: 1,
              explanation: "The closing price reflects the final trade (or closing auction) of the day, which is what gets reported as 'today's close.'",
            },
            {
              id: "course-mechanics-l1-q3",
              question: "Why can a stock's quoted price change many times per minute during the trading day?",
              choices: [
                "Prices are set once a day only",
                "Buyers and sellers are continuously submitting new bids and asks that get matched",
                "The exchange manually updates it every 60 seconds",
                "It's a display error",
              ],
              correctAnswerIndex: 1,
              explanation: "Real exchanges continuously match buyers and sellers throughout the day, so the quoted price updates with every new trade.",
            },
            {
              id: "course-mechanics-l1-q4",
              question: "What kinds of market mechanisms does this app NOT attempt to simulate?",
              choices: [
                "Closing prices entirely",
                "Trading halts, opening/closing auctions, and other intraday microstructure",
                "Buying and selling securities",
                "Position tracking",
              ],
              correctAnswerIndex: 1,
              explanation:
                "This app focuses on the outcome of a trading day (the close) rather than the intraday microstructure like halts and auctions.",
            },
          ],
        },
      },
      {
        id: "course-mechanics-l2",
        title: "Why This App Uses T+1 Pricing",
        content: `This app deliberately does **not** offer real-time quotes. Every trade — market or limit — executes against the most recent daily closing price, recorded once per simulated trading day via the overnight "daily-close" job. This is **T+1 pricing**: your trade today reflects the most recent close, and tomorrow's close won't be known until the next day's job runs.

::diagram[OrderTypeDiagram]{side=BUY}

## Two honest reasons for this design

- **Cost** — real-time market data at scale is expensive and rate-limited for a project like this one; the free-tier feed this app uses caps out at a modest number of requests per day.
- **Focus** — removing intraday noise puts the focus squarely on investing *decisions* rather than reacting to every tick of a live price feed, a very different (and much more stressful) skill than long-term investing.

## See it in action

A security's **Analytics** tab shows only one price per day, no matter which period you select — a direct look at the daily granularity this design produces. This is also why limit orders here resolve once per day rather than the instant your price is touched intraday.

::callout[Key Takeaway]
T+1 pricing trades real-time granularity for cost-efficiency and a sharper focus on investing decisions over price-watching.
- Every trade uses the most recent daily close, updated once per simulated day
- Limit orders here resolve once per day, not the instant a price is touched intraday`,
        quiz: {
          id: "course-mechanics-l2-quiz",
          title: "Why This App Uses T+1 Pricing quiz",
          questions: [
            {
              id: "course-mechanics-l2-q1",
              question: "What does 'T+1 pricing' mean in this app?",
              choices: [
                "Trades settle one week later",
                "Every trade executes against the most recent daily close, updated once per simulated trading day",
                "Prices update every second",
                "T+1 refers to a type of bond",
              ],
              correctAnswerIndex: 1,
              explanation: "T+1 pricing here means trades use the latest recorded daily close rather than a live, continuously updating quote.",
            },
            {
              id: "course-mechanics-l2-q2",
              question: "What is one practical reason this app avoids real-time market data?",
              choices: [
                "Real-time data is illegal",
                "Real-time data at scale is expensive and rate-limited on the free tier this app uses",
                "Real-time data doesn't exist for stocks",
                "This app doesn't need any price data at all",
              ],
              correctAnswerIndex: 1,
              explanation: "The free-tier market data feed this app relies on has meaningful rate limits, making full real-time quotes impractical.",
            },
            {
              id: "course-mechanics-l2-q3",
              question: "What educational reason is given for removing intraday price noise?",
              choices: [
                "It makes the app run faster",
                "It puts focus on investing decisions rather than reacting to every tick of a live feed",
                "Intraday data is always wrong",
                "It has nothing to do with education",
              ],
              correctAnswerIndex: 1,
              explanation:
                "Removing minute-by-minute noise keeps the focus on the decisions that matter for long-term investing, rather than short-term price-watching.",
            },
            {
              id: "course-mechanics-l2-q4",
              question: "How does this design affect when a limit order in this app can fill, compared to a live exchange?",
              choices: [
                "It fills instantly, exactly like a live exchange",
                "It's only checked once per simulated day, rather than the instant the price is touched intraday",
                "Limit orders never fill in this app",
                "There is no difference at all",
              ],
              correctAnswerIndex: 1,
              explanation:
                "Since the whole simulation advances one trading day at a time, limit orders here resolve once per day rather than reacting to intraday price movements.",
            },
          ],
        },
      },
      {
        id: "course-mechanics-l3",
        title: "From Simulation to Reality",
        content: `It's worth being explicit about what carries over from this app to real investing, and what doesn't.

::diagram[RiskReturnSpectrum]

## What's the same

Core ideas — ownership via stocks, loans via bonds, diversification via ETFs, cost basis and P/L math, and the trade-off between market orders (speed) and limit orders (price control). These concepts apply identically whether you're trading in a simulator or with real money on a live exchange.

## What's different

Real markets move continuously, not once a day; real trades can be affected by intraday volatility, bid-ask spreads, and slippage this app doesn't model; and real investing carries a psychological dimension — watching real money move — that a simulator simply can't replicate.

The honest goal of this app is to build genuine familiarity with the mechanics and vocabulary of investing in a setting where mistakes cost nothing. That familiarity transfers directly.

::callout[Key Takeaway]
The concepts you've practiced here — diversification, cost basis, order types, risk/return — transfer directly to real investing; the emotional weight of real money does not, and only comes with actual experience.
- Same mechanics and vocabulary; different intraday dynamics and psychological stakes
- Mistakes cost nothing here — that's the point of practicing first`,
        quiz: {
          id: "course-mechanics-l3-quiz",
          title: "From Simulation to Reality quiz",
          questions: [
            {
              id: "course-mechanics-l3-q1",
              question: "Which concepts from this app carry over directly to real investing?",
              choices: [
                "Only the color scheme of the app",
                "Core ideas like ownership via stocks, diversification via ETFs, and cost basis/P/L math",
                "Nothing transfers at all",
                "Only the T+1 pricing model",
              ],
              correctAnswerIndex: 1,
              explanation:
                "The fundamental concepts — ownership, diversification, cost basis, order types — apply identically whether trading in a simulator or a live market.",
            },
            {
              id: "course-mechanics-l3-q2",
              question: "What does this app NOT model that real markets have?",
              choices: [
                "Stocks and ETFs",
                "Continuous intraday price movement, bid-ask spreads, and slippage",
                "Cost basis calculations",
                "Order types",
              ],
              correctAnswerIndex: 1,
              explanation:
                "This app simplifies to a once-daily close, so it doesn't capture continuous intraday movement or the frictions like spreads and slippage that come with it.",
            },
            {
              id: "course-mechanics-l3-q3",
              question: "What psychological dimension does the lesson say a simulator can't replicate?",
              choices: [
                "The stress and emotional experience of trading with real money on the line",
                "The math behind cost basis",
                "The concept of diversification",
                "The definition of a bond",
              ],
              correctAnswerIndex: 0,
              explanation:
                "Simulated trading can teach mechanics and vocabulary, but the emotional weight of real money at risk is something only real experience provides.",
            },
            {
              id: "course-mechanics-l3-q4",
              question: "What is described as the honest goal of this app?",
              choices: [
                "To replace the need to ever learn about real investing",
                "To build genuine familiarity with investing mechanics and vocabulary in a setting where mistakes cost nothing",
                "To guarantee investing success in real markets",
                "To simulate real-time trading exactly",
              ],
              correctAnswerIndex: 1,
              explanation:
                "The app aims to build real familiarity with concepts and mechanics risk-free — a foundation that transfers, even though it can't teach everything about investing with real money.",
            },
          ],
        },
      },
    ],
  },
  {
    id: "course-savings-rate",
    title: "How Much Should You Save?",
    description: "Emergency funds, the 50/30/20 guideline, setting a savings rate, and weighing high-interest debt payoff against investing.",
    category: "PERSONAL_FINANCE",
    order: 9,
    lessons: [
      {
        id: "course-savings-rate-l1",
        title: "Building Your Savings Foundation",
        content: `Before picking investments, it helps to answer a simpler question first: how much of your income should you actually be setting aside? Two habits do most of the work — a cash cushion for emergencies, and a repeatable savings rate you stick to.

## The emergency fund

An emergency fund is 3–6 months of essential expenses, kept in cash or a high-interest savings account — not invested. Its job isn't to grow; it's to be there, instantly, when a real expense (job loss, medical bill, urgent repair) hits, so you're never forced to sell investments at a bad time or reach for high-interest debt to cover it.

## The 50/30/20 guideline

A common starting point for splitting take-home pay:

- **50% Needs** — rent, groceries, utilities, minimum debt payments
- **30% Wants** — everything discretionary
- **20% Savings & debt paydown** — emergency fund, extra debt payments, investing

::diagram[SavingsRateDiagram]

It's a guideline, not a law — someone with high rent in an expensive city might run closer to 60/20/20, and that's fine. The point of having *a* target is noticing when spending has quietly drifted away from it.

## High-interest debt vs. investing

If you're carrying high-interest debt (credit cards routinely run 20%+ APR), paying it down usually beats investing — you'd need investment returns higher than the debt's interest rate just to break even, and few investments reliably clear a 20%+ hurdle. Lower-rate debt (many mortgages, some student loans) is a closer call, and reasonable people split the difference: build a small emergency fund, pay down anything above roughly 7–8% aggressively, and invest alongside lower-rate debt rather than waiting to be debt-free first.

::callout[Key Takeaway]
An emergency fund and a consistent savings rate are the foundation everything else in this course builds on.
- Keep 3–6 months of essential expenses in cash, not invested
- High-interest debt (~20%+) is almost always worth paying down before investing`,
        quiz: {
          id: "course-savings-rate-l1-quiz",
          title: "Building Your Savings Foundation quiz",
          questions: [
            {
              id: "course-savings-rate-l1-q1",
              question: "What is the main purpose of an emergency fund?",
              choices: [
                "To maximize investment returns",
                "To cover essential expenses during an unexpected disruption without selling investments or relying on high-interest debt",
                "To pay down a mortgage faster",
                "To qualify for a TFSA",
              ],
              correctAnswerIndex: 1,
              explanation:
                "An emergency fund's job is to sit in cash, ready to cover a real disruption, so you never have to sell investments at a bad time or turn to high-interest debt.",
            },
            {
              id: "course-savings-rate-l1-q2",
              question: "Under the 50/30/20 guideline shown in the diagram above, what does the \"20\" represent?",
              choices: ["Discretionary spending", "Essential expenses", "Savings and debt paydown", "Investment returns"],
              correctAnswerIndex: 2,
              explanation: "The 20% slice covers savings and extra debt paydown — the 50 and 30 cover needs and wants respectively.",
            },
            {
              id: "course-savings-rate-l1-q3",
              question: "Why does the lesson suggest paying down high-interest debt before investing?",
              choices: [
                "Because investing is illegal while carrying debt",
                "Because few investments reliably beat a 20%+ interest rate, so paying it off is close to a guaranteed \"return\"",
                "Because carrying any debt disqualifies you from a TFSA",
                "Because emergency funds require zero debt",
              ],
              correctAnswerIndex: 1,
              explanation:
                "Paying off debt that charges 20%+ interest is equivalent to earning a guaranteed 20%+ return — a bar almost no investment reliably clears.",
            },
            {
              id: "course-savings-rate-l1-q4",
              question: "Roughly how many months of essential expenses does the lesson suggest keeping in an emergency fund?",
              choices: ["3–6 months", "1 week", "24 months", "None — invest all of it"],
              correctAnswerIndex: 0,
              explanation: "3–6 months of essential expenses is the common guideline for an emergency fund's size.",
            },
          ],
        },
      },
    ],
  },
  {
    id: "course-tfsa",
    title: "Tax-Free Savings Account (TFSA)",
    description: "What a TFSA is, how contribution room accumulates, tax-free growth and withdrawals, and what happens if you over-contribute.",
    category: "PERSONAL_FINANCE",
    order: 10,
    lessons: [
      {
        id: "course-tfsa-l1",
        title: "How the TFSA Works",
        content: `A Tax-Free Savings Account (TFSA) is a registered account where your money grows completely free of tax — no tax on interest, dividends, or capital gains, ever, and no tax when you take money out. Despite the name, it isn't limited to cash savings: you can hold stocks, ETFs, and bonds inside one, same as any other account.

## Contribution room

You don't get unlimited TFSA room — the government sets an annual limit (**${formatCurrency(TFSA.annualLimit)}** as of ${TFSA.sourceYear}). Room starts accumulating the year you turn 18 (and become a Canadian resident), whether or not you actually open an account, and any unused room carries forward indefinitely — it never expires.

::diagram[ContributionRoomTracker]{accountType=TFSA}

Because the annual limit has grown over time, someone who was 18 or older in 2009 (when the TFSA launched) and has never contributed would have **${formatCurrency(TFSA.cumulativeRoomSinceInception)}** in available room by ${TFSA.sourceYear}.

## Tax-free growth and withdrawals

Contributions are made with after-tax dollars — no deduction at tax time — but everything the account earns after that is yours, tax-free, forever. Withdraw whenever you want, for any reason, with no tax owing and no reporting to the CRA. Even better: whatever you withdraw is added back to your contribution room, but not until *January 1 of the following year* — withdraw $5,000 in June, and you can't re-contribute that $5,000 until next year (unless you had other room available).

## Over-contributing

Contribute more than your available room and the CRA charges a penalty of **${TFSA.overContributionPenaltyPercentPerMonth}% per month** on the excess amount, for every month it stays over-contributed — a real cost for something that's easy to trigger accidentally, especially by re-contributing a withdrawal in the same calendar year.

::callout[Key Takeaway]
The TFSA is simple in concept — contribute after-tax dollars, everything grows and comes out tax-free — but tracking room correctly matters.
- Unused room carries forward forever; a withdrawal's room comes back on January 1 of the next year, not immediately
- Over-contributing costs a real, ongoing monthly penalty until it's fixed`,
        quiz: {
          id: "course-tfsa-l1-quiz",
          title: "How the TFSA Works quiz",
          questions: [
            {
              id: "course-tfsa-l1-q1",
              question: "What happens to gains earned inside a TFSA?",
              choices: [
                "Taxed annually like a regular account",
                "Never taxed, whether they grow or are withdrawn",
                "Taxed only on withdrawal",
                "Taxed at a reduced rate",
              ],
              correctAnswerIndex: 1,
              explanation: "A TFSA's defining feature is that growth is never taxed — not while invested, and not on withdrawal.",
            },
            {
              id: "course-tfsa-l1-q2",
              question: "If you withdraw money from your TFSA in June, when does that room become available to re-contribute?",
              choices: ["Immediately", "The following January 1", "After 6 months", "Never"],
              correctAnswerIndex: 1,
              explanation:
                "Withdrawn room is added back on January 1 of the next calendar year, not right away — a common source of accidental over-contribution.",
            },
            {
              id: "course-tfsa-l1-q3",
              question: "What happens if you contribute more than your available TFSA room?",
              choices: [
                "Nothing, there's no penalty",
                "The excess is automatically refunded",
                "A monthly penalty is charged on the excess amount until it's withdrawn",
                "Your account is closed",
              ],
              correctAnswerIndex: 2,
              explanation: "The CRA charges an ongoing monthly penalty on the excess amount for as long as the over-contribution remains.",
            },
            {
              id: "course-tfsa-l1-q4",
              question: "Does unused TFSA contribution room expire?",
              choices: ["Yes, after 1 year", "Yes, after 5 years", "No, it carries forward indefinitely", "Only if you don't open an account"],
              correctAnswerIndex: 2,
              explanation: "Unused TFSA room, like the diagram above illustrates, keeps accumulating year after year and never expires.",
            },
          ],
        },
      },
    ],
  },
  {
    id: "course-rrsp",
    title: "Registered Retirement Savings Plan (RRSP)",
    description: "Tax-deferred contributions and growth, how contribution room is calculated, taxation on withdrawal, and the basics of employer matching.",
    category: "PERSONAL_FINANCE",
    order: 11,
    lessons: [
      {
        id: "course-rrsp-l1",
        title: "How the RRSP Works",
        content: `A Registered Retirement Savings Plan (RRSP) takes the opposite approach to a TFSA: contributions are tax-deductible *now*, growth is tax-deferred, and withdrawals are taxed *later* — the idea being you get a tax break while you're earning (and presumably in a higher tax bracket) and pay tax on withdrawal, ideally in retirement when your income — and tax rate — may be lower.

## Contribution room

RRSP room is based on income, not a flat number: **${RRSP.contributionPercentOfEarnedIncome}%** of your previous year's earned income, up to an annual dollar cap (**${formatCurrency(RRSP.annualDollarCap)}** as of ${RRSP.sourceYear}), whichever is lower. Like the TFSA, unused room carries forward indefinitely.

::diagram[ContributionRoomTracker]{accountType=RRSP}

## Tax-deferred growth

::diagram[CompoundGrowthChart]{principal=10000|annualRatePercent=7|years=20|label=$10,000 growing tax-deferred inside an RRSP at 7%/year}

Because no tax is owed on gains, dividends, or interest while the money stays inside the account, the full balance keeps compounding every year — nothing is skimmed off annually the way it would be in a regular taxable account.

## Taxation on withdrawal

Every dollar withdrawn from an RRSP — original contributions and all the growth — is taxed as regular income in the year you take it out. There's no special "capital gains" treatment inside an RRSP; it's simply added to your income for that year, taxed at your marginal rate at the time.

Contributions are deductible only until the end of the year you turn **${RRSP.contributionDeadlineAge}**, at which point the RRSP must be converted (typically into a RRIF) and minimum withdrawals begin.

## Employer matching

Many employers offer to match a portion of your RRSP contributions — commonly something like 50% up to a set percentage of salary. That match is effectively free money and, in most cases, is worth contributing at least enough to capture in full before prioritizing other savings.

::callout[Key Takeaway]
The RRSP trades a tax break now for tax owed later — it works best when your tax rate in retirement will be lower than it is today.
- Room is 18% of earned income, capped annually, and carries forward if unused
- Withdrawals are fully taxable, unlike TFSA withdrawals`,
        quiz: {
          id: "course-rrsp-l1-quiz",
          title: "How the RRSP Works quiz",
          questions: [
            {
              id: "course-rrsp-l1-q1",
              question: "When are RRSP contributions tax-deductible?",
              choices: ["Never", "In the year they're contributed", "Only at retirement", "Only if matched by an employer"],
              correctAnswerIndex: 1,
              explanation: "RRSP contributions reduce your taxable income in the year you make them — that upfront deduction is the account's core feature.",
            },
            {
              id: "course-rrsp-l1-q2",
              question: "How is money taxed when withdrawn from an RRSP?",
              choices: [
                "It's tax-free",
                "It's taxed as regular income in the year withdrawn",
                "It's taxed at a fixed 10% rate",
                "Only the growth portion is taxed",
              ],
              correctAnswerIndex: 1,
              explanation: "The entire withdrawal — original contributions and all growth — is added to your taxable income for that year.",
            },
            {
              id: "course-rrsp-l1-q3",
              question: "How is RRSP contribution room generally calculated?",
              choices: [
                "A flat amount for everyone regardless of income",
                "A percentage of earned income, up to an annual dollar cap",
                "Based on your age only",
                "Based on your employer's size",
              ],
              correctAnswerIndex: 1,
              explanation: "Room is 18% of last year's earned income, capped at an annual dollar maximum, whichever is lower.",
            },
            {
              id: "course-rrsp-l1-q4",
              question: "Why is employer RRSP matching usually worth taking full advantage of?",
              choices: [
                "It isn't — it's a scam",
                "It's effectively free money added to your retirement savings",
                "It reduces your contribution room",
                "It's mandatory",
              ],
              correctAnswerIndex: 1,
              explanation: "An employer match is money added on top of your own contribution — leaving it uncaptured is leaving free money on the table.",
            },
          ],
        },
      },
    ],
  },
  {
    id: "course-rrsp-vs-tfsa",
    title: "RRSP vs. TFSA: Which First?",
    description: "A comparison of income level, time horizon, and withdrawal flexibility trade-offs to help decide where to direct savings first.",
    category: "PERSONAL_FINANCE",
    order: 12,
    lessons: [
      {
        id: "course-rrsp-vs-tfsa-l1",
        title: "Choosing Between RRSP and TFSA",
        content: `Both accounts shelter your investments from tax — the difference is *when* you pay it. There's no universally correct answer for which to prioritize, but three factors do most of the work in deciding.

::diagram[RRSPvsTFSAComparison]

## Income level: now vs. later

The RRSP's benefit comes from the *gap* between your tax rate today and your tax rate when you withdraw. If you're in a high tax bracket now and expect a lower one in retirement, the RRSP deduction is worth more today than the tax you'll eventually pay. If you're early in your career in a low bracket, that gap may be small or even reversed — making the TFSA's no-deduction, no-tax-ever structure more attractive, since you're not giving up much of a deduction today anyway.

## Time horizon

Money you'll need soon (a few years out) sits more comfortably in a TFSA — no tax consequence to withdrawing early, whatever your reason. Money genuinely earmarked for retirement, decades away, benefits more from the RRSP's larger effective contribution (since $1 pre-tax buys more investment than $1 after-tax) — though the FHSA and Home Buyers' Plan, covered next, complicate this for a first home specifically.

## Withdrawal flexibility

This is where the accounts diverge most. Withdraw from a TFSA and there's no tax and the room comes back next year. Withdraw from an RRSP and the full amount is added to that year's taxable income immediately — a real cost if you need the money in a pinch, and a reason many people treat their RRSP as a one-way account until retirement.

## Try it yourself

The calculator below shows why the two are often closer than they seem: with the *same* tax rate now and at withdrawal, the after-tax result is mathematically identical. The real question is whether you expect that rate to change.

::diagram[RRSPvsTFSASavingsEstimator]

::callout[Key Takeaway]
Neither account is universally "better" — it depends on your tax rate trajectory, when you'll need the money, and how much flexibility you want.
- Higher tax bracket now than expected in retirement favors the RRSP; the reverse favors the TFSA
- Money you might need soon belongs in a TFSA, not an RRSP, because of the withdrawal tax hit`,
        quiz: {
          id: "course-rrsp-vs-tfsa-l1-quiz",
          title: "Choosing Between RRSP and TFSA quiz",
          questions: [
            {
              id: "course-rrsp-vs-tfsa-l1-q1",
              question: "What determines whether an RRSP or TFSA is more advantageous, in the simplest framing?",
              choices: [
                "The account's name",
                "Whether your tax rate now is higher or lower than your tax rate when you withdraw",
                "How old the account is",
                "Which bank you use",
              ],
              correctAnswerIndex: 1,
              explanation: "The core trade-off is the gap between your tax rate today and your expected tax rate at withdrawal.",
            },
            {
              id: "course-rrsp-vs-tfsa-l1-q2",
              question: "Why might a TFSA be preferable for money you may need in the next few years?",
              choices: [
                "TFSAs pay higher interest",
                "RRSP withdrawals are added to your taxable income immediately, unlike TFSA withdrawals",
                "TFSAs have no contribution limit",
                "RRSPs can't hold stocks",
              ],
              correctAnswerIndex: 1,
              explanation: "An RRSP withdrawal creates an immediate tax bill, which makes it a poor fit for money you might need on short notice.",
            },
            {
              id: "course-rrsp-vs-tfsa-l1-q3",
              question: "According to the estimator's assumption, what happens to the RRSP-vs-TFSA comparison when the tax rate is the same now and at withdrawal?",
              choices: ["The RRSP always wins", "The TFSA always wins", "The after-tax result comes out equal", "Neither account grows at all"],
              correctAnswerIndex: 2,
              explanation:
                "When the contribution-year and withdrawal-year tax rates match, the RRSP's refund-now and the TFSA's tax-free-later produce the same after-tax amount.",
            },
            {
              id: "course-rrsp-vs-tfsa-l1-q4",
              question: "Which factor does the lesson NOT list as central to choosing between RRSP and TFSA?",
              choices: ["Income level now vs. later", "Time horizon", "Withdrawal flexibility", "Which financial institution has the nicest app"],
              correctAnswerIndex: 3,
              explanation: "The lesson focuses on income level, time horizon, and withdrawal flexibility — not the choice of financial institution.",
            },
          ],
        },
      },
    ],
  },
  {
    id: "course-hbp-fhsa",
    title: "Home Buyers' Plan (HBP) & First Home Savings Account (FHSA)",
    description: "Using RRSP funds for a first home purchase through the HBP, and the newer FHSA's combined tax-deduction-plus-tax-free-withdrawal structure.",
    category: "PERSONAL_FINANCE",
    order: 13,
    lessons: [
      {
        id: "course-hbp-fhsa-l1",
        title: "Using the HBP and FHSA to Buy a First Home",
        content: `Buying a first home has two tax-advantaged tools available, and — usefully — they can be combined.

::diagram[HBPFHSAFlowDiagram]

## The Home Buyers' Plan (HBP)

The HBP lets a first-time buyer withdraw up to **${formatCurrency(HBP.withdrawalLimit)}** from their RRSP, tax-free, to put toward a home — as long as it's repaid. Repayment happens over **${HBP.repaymentYears} years**, starting the second year after the withdrawal; miss a year's repayment and that year's missed portion is simply added to your taxable income instead. It's a loan from your future self, not free money — the RRSP room used isn't restored until you repay it.

## The First Home Savings Account (FHSA)

The FHSA, introduced more recently, combines the best of both other accounts: contributions are tax-deductible like an RRSP, **and** qualifying withdrawals (for a first home) are completely tax-free like a TFSA — no repayment required, ever.

- Annual contribution limit: **${formatCurrency(FHSA.annualLimit)}**
- Lifetime contribution limit: **${formatCurrency(FHSA.lifetimeLimit)}**
- Unused annual room carries forward up to **${formatCurrency(FHSA.maxCarryForward)}** into the following year (only after the account is opened)
- Must be used or closed within **${FHSA.maxParticipationYears} years** of opening (or by age 71, whichever comes first) — unused funds roll into an RRSP tax-free, or come out taxable

## Combining them

A first-time buyer can use both: FHSA funds toward the purchase (no repayment needed) and an HBP withdrawal from their RRSP on top (which does need repayment) — potentially covering a meaningful down payment from tax-advantaged savings built up over several years.

::callout[Key Takeaway]
The HBP borrows from your own retirement savings; the FHSA is a separate account built specifically for this purpose.
- HBP: withdraw from your RRSP tax-free, but you must repay it over ${HBP.repaymentYears} years
- FHSA: deductible in, tax-free out, no repayment — and can be combined with the HBP`,
        quiz: {
          id: "course-hbp-fhsa-l1-quiz",
          title: "Using the HBP and FHSA to Buy a First Home quiz",
          questions: [
            {
              id: "course-hbp-fhsa-l1-q1",
              question: "What must happen to money withdrawn under the Home Buyers' Plan?",
              choices: ["Nothing, it's a gift", "It must be repaid to the RRSP over a set number of years", "It must be repaid immediately", "It converts to a TFSA"],
              correctAnswerIndex: 1,
              explanation: "HBP withdrawals must be repaid to the RRSP over a set repayment period, or the missed portion becomes taxable income.",
            },
            {
              id: "course-hbp-fhsa-l1-q2",
              question: "What makes the FHSA different from a plain RRSP withdrawal for a home purchase?",
              choices: [
                "FHSA withdrawals for a first home are tax-free and never need to be repaid",
                "FHSA has no contribution limit",
                "FHSA can only be used for tuition",
                "FHSA contributions aren't tax-deductible",
              ],
              correctAnswerIndex: 0,
              explanation: "Unlike the HBP, a qualifying FHSA withdrawal is completely tax-free and carries no repayment obligation.",
            },
            {
              id: "course-hbp-fhsa-l1-q3",
              question: "Can the HBP and FHSA be used together for the same home purchase?",
              choices: ["No, only one can be used", "Yes, funds from both can go toward the same purchase", "Only if you're over age 71", "Only for a second home"],
              correctAnswerIndex: 1,
              explanation: "As the flow diagram above shows, funds from an HBP withdrawal and an FHSA can both be directed toward the same first home purchase.",
            },
            {
              id: "course-hbp-fhsa-l1-q4",
              question: "What happens if you miss a scheduled HBP repayment?",
              choices: [
                "The whole withdrawal becomes due immediately",
                "Nothing, repayment is optional",
                "The missed portion is added to your taxable income for that year",
                "Your RRSP is closed",
              ],
              correctAnswerIndex: 2,
              explanation: "A missed HBP repayment isn't accelerated or forgiven — that year's missed amount is simply taxed as income instead.",
            },
          ],
        },
      },
    ],
  },
  {
    id: "course-resp",
    title: "Registered Education Savings Plan (RESP)",
    description: "A brief overview of saving for a child's education, including how government grant matching boosts contributions.",
    category: "PERSONAL_FINANCE",
    order: 14,
    lessons: [
      {
        id: "course-resp-l1",
        title: "Saving for a Child's Education with the RESP",
        content: `A Registered Education Savings Plan (RESP) is built for one purpose: saving for a child's post-secondary education, with the federal government chipping in extra money on top of what you contribute.

## Government grant matching

The Canada Education Savings Grant (CESG) matches **${RESP.cesgMatchPercent}%** of what you contribute each year, up to **${formatCurrency(RESP.cesgAnnualMax)}/year** — meaning a $2,500 annual contribution attracts the full $500 grant. That match continues up to a lifetime maximum of **${formatCurrency(RESP.cesgLifetimeMax)}** in grants per child.

::diagram[CompoundGrowthChart]{principal=0|monthlyContribution=208|annualRatePercent=6|years=18|label=~$2,500/year (contribution + grant combined) growing at 6%/year until the child turns 18}

## Contribution limit

There's no annual contribution cap, but there is a lifetime limit per beneficiary: **${formatCurrency(RESP.lifetimeLimit)}**. Growth inside the account (both your contributions' growth and the grant's growth) is tax-deferred, and taxed in the *student's* hands when withdrawn for education — usually at a low or zero rate, since students typically have little other income.

::callout[Key Takeaway]
The RESP's grant matching is close to a guaranteed 20% return on contributions — hard to beat with any investment alone.
- Contribute around $2,500/year per child to capture the full annual CESG match
- Lifetime contribution limit is ${formatCurrency(RESP.lifetimeLimit)} per beneficiary, with no annual cap`,
        quiz: {
          id: "course-resp-l1-quiz",
          title: "Saving for a Child's Education with the RESP quiz",
          questions: [
            {
              id: "course-resp-l1-q1",
              question: "What does the Canada Education Savings Grant (CESG) do?",
              choices: [
                "Matches a percentage of RESP contributions with free government money",
                "Provides a tax deduction like an RRSP",
                "Guarantees a fixed interest rate",
                "Replaces the need to contribute at all",
              ],
              correctAnswerIndex: 0,
              explanation: "The CESG adds government money on top of your own RESP contributions, up to annual and lifetime maximums.",
            },
            {
              id: "course-resp-l1-q2",
              question: "Roughly how much do you need to contribute annually to capture the full CESG match?",
              choices: ["$100", "About $2,500", "$50,000", "There's no way to maximize it"],
              correctAnswerIndex: 1,
              explanation: "A $2,500 annual contribution attracts the full $500 CESG match, since the grant is 20% of contributions up to that point.",
            },
            {
              id: "course-resp-l1-q3",
              question: "Is there an annual contribution limit for an RESP?",
              choices: ["Yes, a fixed annual limit", "No annual limit, but there is a lifetime limit per beneficiary", "Yes, but only in the first year", "No limit at all, ever"],
              correctAnswerIndex: 1,
              explanation: "RESPs have no annual cap — only a lifetime contribution limit per beneficiary.",
            },
            {
              id: "course-resp-l1-q4",
              question: "In whose hands is RESP growth typically taxed when withdrawn for education?",
              choices: ["The contributor (usually a parent)", "The government", "The student, usually at a low or zero rate", "It's never taxed"],
              correctAnswerIndex: 2,
              explanation: "Withdrawn growth is taxed as the student's income, which is typically low or zero given a student's other earnings.",
            },
          ],
        },
      },
    ],
  },
  {
    id: "course-advanced-trading",
    title: "Short Selling & Margin",
    description: "The mandatory foundation before enabling short selling and margin trading: how shorting works, why its risk is asymmetric, and how margin calls happen.",
    category: "ADVANCED_TRADING",
    order: 15,
    lessons: [
      {
        id: "course-advanced-trading-l1",
        title: "What Is Short Selling?",
        content: `A short sale flips the usual order of a trade: instead of buying low and selling high later, you sell first — shares you don't own, borrowed from your broker — and buy them back later, hoping the price has fallen.

## How it works

::diagram[ShortSellingDiagram]

1. **Borrow** shares of a security from your broker.
2. **Sell** them immediately at the current price — the proceeds land in your account as cash.
3. **Buy back** ("cover") the same number of shares later, ideally at a lower price.
4. **Return** the borrowed shares to close the position.

Your profit is the difference between what you sold at and what you paid to buy back — the mirror image of a normal trade, in reverse order.

## Why the risk is different

Owning a stock (going long), the worst case is losing 100% of what you put in — a price can't fall below $0. Selling short flips that: your maximum *gain* is capped at 100% (if the price falls all the way to $0), but your maximum *loss* is unlimited, because there's no ceiling on how high a price can rise before you're forced to buy back and close the position.

## Buying to cover

Closing a short is always a BUY — often called "buying to cover." In this app, a BUY on a security you're short first buys back (covers) your short position before it would ever open a new long position; the gain or loss is the inverse of what you'd see on a long position, since you profit when the price falls and lose when it rises.

::callout[Key Takeaway]
Short selling profits from a falling price, but with an asymmetric risk profile that owning a stock doesn't have.
- Selling short means selling borrowed shares now and buying them back later to close the position
- Maximum loss on a short is unlimited — there's no ceiling on how high a price can rise`,
        quiz: {
          id: "course-advanced-trading-l1-quiz",
          title: "What Is Short Selling? quiz",
          questions: [
            {
              id: "course-advanced-trading-l1-q1",
              question: "What is the correct order of steps in a short sale?",
              choices: [
                "Buy, hold, sell",
                "Borrow shares, sell them, buy them back later, return them",
                "Sell shares you already own, then buy more",
                "Borrow cash, buy shares, sell them",
              ],
              correctAnswerIndex: 1,
              explanation: "A short sale borrows shares first, sells them immediately, then later buys them back to return to the lender.",
            },
            {
              id: "course-advanced-trading-l1-q2",
              question: "Why is the maximum loss on a short position described as unlimited?",
              choices: [
                "Because commissions are unusually high",
                "Because there's no ceiling on how high a stock's price can rise before you must buy back to close the position",
                "Because short selling is illegal",
                "Because brokers charge unlimited interest",
              ],
              correctAnswerIndex: 1,
              explanation: "A stock's price has no upper bound, so the cost to buy back and close a short position has no theoretical limit either.",
            },
            {
              id: "course-advanced-trading-l1-q3",
              question: "What is \"buying to cover\"?",
              choices: [
                "Buying insurance on a position",
                "The BUY that closes a short position by buying back the borrowed shares",
                "A type of dividend",
                "Doubling down on a losing long position",
              ],
              correctAnswerIndex: 1,
              explanation: "Covering a short means buying back the same number of shares you borrowed and sold, to return them and close the position.",
            },
            {
              id: "course-advanced-trading-l1-q4",
              question: "What is the maximum possible gain on a short position?",
              choices: ["Unlimited", "100% (if the price falls all the way to $0)", "50%", "There is no maximum gain"],
              correctAnswerIndex: 1,
              explanation: "A short position's best case is the price falling to zero — a 100% gain — the mirror image of a long position's maximum loss.",
            },
          ],
        },
      },
      {
        id: "course-advanced-trading-l2",
        title: "Understanding Margin Trading",
        content: `Margin trading means borrowing to increase buying power — or, in this app, the mechanism that makes short selling possible at all, since selling short requires a broker's cooperation and collateral.

## Leverage, in brief

Margin lets you control a larger position than your cash alone would allow. That cuts both ways: gains are magnified, but so are losses — a modest adverse price move can wipe out a much larger share of your own money when leverage is involved.

## Margin requirements in this app

Opening a short position reserves a simplified margin requirement — **${MARGIN_REQUIREMENT_MULTIPLIER}×** the short position's market value — against your account, reducing your buying power for new purchases. That reservation isn't fixed: it's marked to market every day, rising if the price moves against you and falling if it moves in your favor.

::diagram[MarginCallDiagram]

## Margin calls and forced liquidation

If the price moves against a short position enough that your account equity falls below **${(MAINTENANCE_MARGIN_THRESHOLD * 100).toFixed(0)}%** of the margin requirement — the maintenance threshold — you're in a margin call. In a real brokerage, this typically means depositing more cash immediately or having positions force-sold without further warning, often at the worst possible time. This app simulates the warning (a banner across every page) but never auto-liquidates a flagged account — a real broker's agreement almost always reserves that right.

::callout[Key Takeaway]
Margin amplifies both gains and losses, and a margin call can force a sale at the worst possible moment.
- Margin requirements are marked to market daily, not fixed when a position opens
- A real margin call can mean forced liquidation with no further warning — this app only simulates the warning`,
        quiz: {
          id: "course-advanced-trading-l2-quiz",
          title: "Understanding Margin Trading quiz",
          questions: [
            {
              id: "course-advanced-trading-l2-q1",
              question: "What does trading on margin fundamentally mean?",
              choices: [
                "Trading only with your own cash",
                "Borrowing to increase buying power, which magnifies both gains and losses",
                "A type of dividend reinvestment",
                "A guarantee against losses",
              ],
              correctAnswerIndex: 1,
              explanation: "Margin is borrowed buying power — it amplifies outcomes in both directions, not just the upside.",
            },
            {
              id: "course-advanced-trading-l2-q2",
              question: "What triggers a margin call in this app's simplified model?",
              choices: [
                "Selling any position",
                "Account equity falling below the maintenance threshold relative to the margin requirement",
                "Buying too many shares",
                "Logging in too often",
              ],
              correctAnswerIndex: 1,
              explanation: "The nightly maintenance check flags an account once equity drops too low relative to its margin requirement, as shown in the diagram above.",
            },
            {
              id: "course-advanced-trading-l2-q3",
              question: "What does this app do when an account is flagged with a margin call?",
              choices: [
                "Automatically sells positions to raise cash",
                "Shows a simulated warning banner across the app, but never auto-liquidates",
                "Closes the account",
                "Nothing at all",
              ],
              correctAnswerIndex: 1,
              explanation: "This app only simulates the warning — real brokerages can and do force-liquidate positions in this situation.",
            },
            {
              id: "course-advanced-trading-l2-q4",
              question: "In a real brokerage, what can happen during a margin call that this app does not simulate?",
              choices: [
                "A warning banner",
                "Forced liquidation of positions without further notice",
                "A phone call from a bank",
                "An interest rate increase",
              ],
              correctAnswerIndex: 1,
              explanation: "Real brokers can force-liquidate a margin account's positions without further warning — a real risk this app deliberately doesn't simulate.",
            },
          ],
        },
      },
    ],
  },
];

/// Stable IDs referenced by app code for contextual cross-links (trade
/// ticket, security detail pages, portfolio tax-lot report) — kept separate
/// from the full content above so those call sites don't need to
/// import/scan all of it.
export const LEARNING_LINKS = {
  limitOrdersLesson: "course-order-types-l2",
  rrspVsTfsaLesson: "course-rrsp-vs-tfsa-l1",
  /// The mandatory education gate for short selling & margin — see
  /// `hasCompletedAdvancedTradingEducation` in `@/lib/learning` and the
  /// Settings toggle that reads it.
  advancedTradingLessons: {
    lessonIds: ["course-advanced-trading-l1", "course-advanced-trading-l2"],
    quizIds: ["course-advanced-trading-l1-quiz", "course-advanced-trading-l2-quiz"],
  },
  /// No dedicated course for CRYPTO yet — the security page's "start
  /// learning" nudge is simply skipped for it (see the lookup there).
  courseBySymbolAssetType: {
    STOCK: "course-stocks",
    ETF: "course-etfs",
    BOND: "course-bonds",
    COMMODITY: "course-commodities",
  } as Partial<Record<AssetType, string>>,
};

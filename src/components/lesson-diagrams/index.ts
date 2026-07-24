import type { ComponentType } from "react";

import { AssetAllocationPie } from "@/components/allocation-pie";

import { CompoundGrowthChart } from "./compound-growth-chart";
import { ContributionRoomTracker } from "./contribution-room-tracker";
import { CostBasisDiagram } from "./cost-basis-diagram";
import { DiversificationDiagram } from "./diversification-diagram";
import { HBPFHSAFlowDiagram } from "./hbp-fhsa-flow-diagram";
import { MarginCallDiagram } from "./margin-call-diagram";
import { OrderTypeDiagram } from "./order-type-diagram";
import { RiskReturnSpectrum } from "./risk-return-spectrum";
import { RRSPvsTFSAComparison } from "./rrsp-vs-tfsa-comparison";
import { RRSPvsTFSASavingsEstimator } from "./rrsp-vs-tfsa-savings-estimator";
import { SavingsRateDiagram } from "./savings-rate-diagram";
import { ShortSellingDiagram } from "./short-selling-diagram";
import { StockVsBondDiagram } from "./stock-vs-bond-diagram";

export { AssetAllocationPie } from "@/components/allocation-pie";
export { CompoundGrowthChart } from "./compound-growth-chart";
export { ContributionRoomTracker } from "./contribution-room-tracker";
export { CostBasisDiagram } from "./cost-basis-diagram";
export { DiversificationDiagram } from "./diversification-diagram";
export { HBPFHSAFlowDiagram } from "./hbp-fhsa-flow-diagram";
export { MarginCallDiagram } from "./margin-call-diagram";
export { OrderTypeDiagram } from "./order-type-diagram";
export { RiskReturnSpectrum } from "./risk-return-spectrum";
export { RRSPvsTFSAComparison } from "./rrsp-vs-tfsa-comparison";
export { RRSPvsTFSASavingsEstimator } from "./rrsp-vs-tfsa-savings-estimator";
export { SavingsRateDiagram } from "./savings-rate-diagram";
export { ShortSellingDiagram } from "./short-selling-diagram";
export { StockVsBondDiagram } from "./stock-vs-bond-diagram";
export type { AllocationSlice } from "@/components/allocation-pie";

/// Every diagram embeddable via `::diagram[Name]` in lesson content — the
/// name here must match exactly what's written in `prisma/seed-learning.ts`.
/// Add a new diagram by writing its component beside these and adding one
/// line here; nothing else needs to change.
export const LESSON_DIAGRAMS: Record<string, ComponentType<Record<string, unknown>>> = {
  DiversificationDiagram,
  StockVsBondDiagram,
  CompoundGrowthChart,
  OrderTypeDiagram,
  AssetAllocationPie,
  RiskReturnSpectrum,
  CostBasisDiagram,
  RRSPvsTFSAComparison,
  SavingsRateDiagram,
  ContributionRoomTracker,
  HBPFHSAFlowDiagram,
  RRSPvsTFSASavingsEstimator,
  ShortSellingDiagram,
  MarginCallDiagram,
};

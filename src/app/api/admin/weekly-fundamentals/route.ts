import { NextResponse } from "next/server";

import { AdminAccessError, requireAdmin } from "@/lib/admin";
import { updateAllFundamentals } from "@/lib/market-data";

/// Manually triggers the weekly fundamentals refresh on demand — the same
/// routine `pnpm job:weekly-fundamentals` runs, exposed here so an admin can
/// populate/refresh market cap, valuation ratios, and analyst ratings
/// without waiting for the weekly schedule.
export async function POST() {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }

  const summary = await updateAllFundamentals();
  return NextResponse.json({ summary });
}

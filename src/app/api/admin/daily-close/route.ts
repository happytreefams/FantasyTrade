import { NextResponse } from "next/server";

import { AdminAccessError, requireAdmin } from "@/lib/admin";
import { runDailyClose } from "@/lib/daily-close";

/// Manually triggers the overnight valuation job on demand — the same
/// routine `pnpm job:daily-close` runs, exposed here so an admin can test or
/// catch up pricing without shell access to the server.
export async function POST() {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }

  const summary = await runDailyClose();
  return NextResponse.json({ summary });
}

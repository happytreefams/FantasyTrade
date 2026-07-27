import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

/// Lightweight liveness/readiness check for uptime monitoring — deliberately
/// public (see middleware.ts's PUBLIC_API_PREFIXES; a monitor has no session
/// cookie) and deliberately minimal (no auth, no secrets, no app internals
/// beyond "can we reach the database"). A monitor should alert on anything
/// other than a 200 with `{ status: "ok" }`.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("[health] database check failed:", error);
    return NextResponse.json({ status: "error", timestamp: new Date().toISOString() }, { status: 503 });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAccount } from "@/lib/current-account";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  securityId: z.string().min(1),
  enabled: z.boolean(),
});

/// Toggles dividend reinvestment (DRIP) for one of the account's own
/// positions. When enabled, the next quarterly dividend `postQuarterlyDividends`
/// posts for this (account, security) is reinvested into more fractional
/// shares instead of sitting as cash — see `@/lib/dividends`.
export async function POST(request: Request) {
  const { account } = await requireAccount().catch(() => ({ account: null }));
  if (!account) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const position = await prisma.position.findUnique({
    where: { accountId_securityId: { accountId: account.id, securityId: parsed.data.securityId } },
  });
  if (!position) {
    return NextResponse.json({ error: "Position not found." }, { status: 404 });
  }

  await prisma.position.update({ where: { id: position.id }, data: { dripEnabled: parsed.data.enabled } });

  return NextResponse.json({ dripEnabled: parsed.data.enabled });
}

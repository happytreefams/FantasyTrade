import { NextResponse } from "next/server";
import { z } from "zod";

import { AdminAccessError, requireAdmin } from "@/lib/admin";
import { setFeatureFlagEnabled } from "@/lib/feature-flags";

const bodySchema = z.object({
  key: z.string().min(1),
  enabled: z.boolean(),
});

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "A flag key and enabled state are required." }, { status: 400 });
  }

  const flag = await setFeatureFlagEnabled(parsed.data.key, parsed.data.enabled);
  return NextResponse.json({ flag });
}

import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { createGroup } from "@/lib/groups";

const bodySchema = z.object({
  name: z.string().trim().min(1).max(100),
  startingCash: z.number().positive().max(1_000_000_000),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "A classroom name and positive starting cash are required." }, { status: 400 });
  }

  try {
    const group = await createGroup(session.user.id, parsed.data);
    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Couldn't create the classroom.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}

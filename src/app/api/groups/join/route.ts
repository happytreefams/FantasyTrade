import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { joinGroup } from "@/lib/groups";

const bodySchema = z.object({ joinCode: z.string().trim().min(1).max(20) });

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "A join code is required." }, { status: 400 });
  }

  try {
    const group = await joinGroup(session.user.id, parsed.data.joinCode);
    return NextResponse.json({ group });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Couldn't join that classroom.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}

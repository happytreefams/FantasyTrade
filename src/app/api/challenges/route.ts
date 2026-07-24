import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { createChallenge } from "@/lib/challenges";
import { requireGroupTeacher } from "@/lib/groups";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(500),
  startDate: z.string(),
  endDate: z.string(),
  groupId: z.string().min(1).nullable().optional(),
});

/// Global (groupId null) challenges are admin-only, mirroring how other
/// platform-wide content (securities, feature flags) is managed from
/// /admin. Group-scoped challenges are created by that group's teacher —
/// checked via the same `requireGroupTeacher` ownership guard the teacher
/// dashboard itself uses, not just a blanket TEACHER role check.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "A name, description, and valid date range are required." }, { status: 400 });
  }

  const { groupId } = parsed.data;
  if (groupId) {
    try {
      await requireGroupTeacher(groupId);
    } catch {
      return NextResponse.json({ error: "Not authorized to create a challenge for this classroom." }, { status: 403 });
    }
  } else if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only admins can create open (global) challenges." }, { status: 403 });
  }

  try {
    const challenge = await createChallenge(
      {
        name: parsed.data.name,
        description: parsed.data.description,
        startDate: new Date(parsed.data.startDate),
        endDate: new Date(parsed.data.endDate),
        groupId: groupId ?? null,
      },
      prisma,
    );
    return NextResponse.json({ challenge }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Couldn't create the challenge.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}

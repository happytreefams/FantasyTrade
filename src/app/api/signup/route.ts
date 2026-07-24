import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { joinGroup } from "@/lib/groups";
import { prisma } from "@/lib/prisma";

const signupSchema = z.object({
  name: z.string().trim().min(1).max(100).optional().or(z.literal("")),
  email: z.string().trim().email(),
  password: z.string().min(8).max(72),
  joinCode: z.string().trim().min(1).max(20).optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please provide a valid name, email, and password (min 8 characters)." },
      { status: 400 },
    );
  }

  const { email, password, joinCode } = parsed.data;
  const name = parsed.data.name || undefined;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json(
      { error: "An account with that email already exists." },
      { status: 409 },
    );
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      hashedPassword,
      account: { create: {} },
    },
    select: { id: true, email: true },
  });

  // Best-effort: an invalid/expired join code shouldn't block account
  // creation — the account still exists and can join a classroom later from
  // Settings, so we surface it as a warning rather than a signup failure.
  let joinWarning: string | undefined;
  if (joinCode) {
    try {
      await joinGroup(user.id, joinCode);
    } catch (error) {
      joinWarning = error instanceof Error ? error.message : "Couldn't join that classroom.";
    }
  }

  return NextResponse.json({ ...user, joinWarning }, { status: 201 });
}

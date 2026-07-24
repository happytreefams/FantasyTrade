import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { checkAndIssueCertificates } from "@/lib/certificates";
import { recordQuizAttempt } from "@/lib/learning";

const bodySchema = z.object({ quizId: z.string().min(1), score: z.number().min(0).max(100) });

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "A quizId and score (0-100) are required." }, { status: 400 });
  }

  await recordQuizAttempt(session.user.id, parsed.data.quizId, parsed.data.score);
  const certificatesIssued = await checkAndIssueCertificates(session.user.id);

  return NextResponse.json({
    recorded: true,
    certificatesIssued: certificatesIssued.map((cert) => ({ id: cert.id, title: cert.title })),
  });
}

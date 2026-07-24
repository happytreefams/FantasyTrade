import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { checkCourseCompletionBadges } from "@/lib/badges";
import { checkAndIssueCertificates } from "@/lib/certificates";
import { markLessonComplete } from "@/lib/learning";

const bodySchema = z.object({ lessonId: z.string().min(1) });

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "A lessonId is required." }, { status: 400 });
  }

  await markLessonComplete(session.user.id, parsed.data.lessonId);
  await checkCourseCompletionBadges(session.user.id);
  const certificatesIssued = await checkAndIssueCertificates(session.user.id);

  return NextResponse.json({
    completed: true,
    certificatesIssued: certificatesIssued.map((cert) => ({ id: cert.id, title: cert.title })),
  });
}

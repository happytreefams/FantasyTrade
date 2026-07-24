import { prisma } from "@/lib/prisma";

export type GlossaryTermRecord = {
  id: string;
  term: string;
  definition: string;
  relatedLessonId: string | null;
};

export async function getGlossaryTerms(): Promise<GlossaryTermRecord[]> {
  return prisma.glossary.findMany({
    orderBy: { term: "asc" },
    select: { id: true, term: true, definition: true, relatedLessonId: true },
  });
}

import Link from "next/link";
import { redirect } from "next/navigation";

import { GlossarySearch } from "@/components/glossary-search";
import { auth } from "@/lib/auth";
import { getGlossaryTerms } from "@/lib/glossary";

export default async function GlossaryPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const terms = await getGlossaryTerms();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <Link href="/learn" className="text-caption text-foreground-muted hover:text-foreground">
          ← Learn
        </Link>
        <h1 className="mt-1 text-display font-semibold tracking-tight">Glossary</h1>
        <p className="mt-1 text-body text-foreground-muted">
          Plain-language definitions of the financial terms used throughout Fantasy Trade.
        </p>
      </div>

      <GlossarySearch terms={terms} />
    </div>
  );
}

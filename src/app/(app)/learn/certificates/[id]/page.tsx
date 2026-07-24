import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { getCertificate } from "@/lib/certificates";
import { formatAsOfDate } from "@/lib/format";

export default async function CertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const certificate = await getCertificate(id, session.user.id);
  if (!certificate) {
    notFound();
  }

  const recipientName = session.user.name || session.user.email || "Fantasy Trade User";
  const achievementLabel = certificate.scope === "CATEGORY" ? `the ${certificate.title} category` : certificate.title;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <Link href="/settings" className="text-caption text-foreground-muted hover:text-foreground">
          ← Settings
        </Link>
      </div>

      <div className="flex flex-col items-center gap-6 rounded-lg border-2 border-accent bg-background-elevated p-10 text-center sm:p-16">
        <p className="text-caption font-semibold tracking-[0.2em] text-accent uppercase">Fantasy Trade</p>
        <h1 className="text-display font-semibold tracking-tight text-foreground">Certificate of Completion</h1>

        <div className="flex flex-col gap-1">
          <p className="text-body text-foreground-muted">This certifies that</p>
          <p className="text-title font-semibold text-foreground">{recipientName}</p>
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-body text-foreground-muted">has successfully completed</p>
          <p className="text-title font-semibold text-accent">{achievementLabel}</p>
        </div>

        <p className="text-caption text-foreground-subtle">Issued {formatAsOfDate(certificate.issuedAt)}</p>
      </div>

      <a
        href={`/api/certificates/${certificate.id}/pdf`}
        download
        className="self-center rounded-md bg-accent-solid px-4 py-2 text-body font-medium text-accent-foreground transition-colors hover:bg-accent-solid-hover"
      >
        Download PDF
      </a>
    </div>
  );
}

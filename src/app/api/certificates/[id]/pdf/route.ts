import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getCertificate } from "@/lib/certificates";
import { generateCertificatePdf } from "@/lib/certificates/pdf";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const certificate = await getCertificate(id, session.user.id);
  if (!certificate) {
    return NextResponse.json({ error: "Certificate not found." }, { status: 404 });
  }

  const recipientName = session.user.name || session.user.email || "Fantasy Trade User";
  const pdfBytes = await generateCertificatePdf({
    recipientName,
    title: certificate.scope === "CATEGORY" ? `the ${certificate.title} category` : certificate.title,
    issuedAt: certificate.issuedAt,
  });

  const fileNameSafeTitle = certificate.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase();

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="fantasy-trade-certificate-${fileNameSafeTitle}.pdf"`,
    },
  });
}

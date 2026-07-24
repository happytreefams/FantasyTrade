import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

const PAGE_WIDTH = 792; // US Letter, landscape
const PAGE_HEIGHT = 612;
const ACCENT = rgb(0.11, 0.42, 0.86);
const INK = rgb(0.13, 0.15, 0.18);
const MUTED = rgb(0.45, 0.47, 0.5);

/// Renders a certificate as a single-page landscape PDF using pdf-lib
/// directly (no headless-browser/React-PDF rendering pipeline) — enough for
/// a clean, branded, downloadable file without a heavier dependency.
export async function generateCertificatePdf(params: {
  recipientName: string;
  title: string;
  issuedAt: Date;
}): Promise<Uint8Array> {
  const { recipientName, title, issuedAt } = params;

  const doc = await PDFDocument.create();
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  const serifBold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const sans = await doc.embedFont(StandardFonts.Helvetica);

  const margin = 28;
  page.drawRectangle({
    x: margin,
    y: margin,
    width: PAGE_WIDTH - margin * 2,
    height: PAGE_HEIGHT - margin * 2,
    borderColor: ACCENT,
    borderWidth: 2,
  });
  page.drawRectangle({
    x: margin + 8,
    y: margin + 8,
    width: PAGE_WIDTH - (margin + 8) * 2,
    height: PAGE_HEIGHT - (margin + 8) * 2,
    borderColor: ACCENT,
    borderWidth: 0.75,
  });

  function centerText(text: string, y: number, font: typeof serif, size: number, color = INK) {
    const width = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: (PAGE_WIDTH - width) / 2, y, size, font, color });
  }

  centerText("FANTASY TRADE", PAGE_HEIGHT - 100, sans, 16, ACCENT);
  centerText("Certificate of Completion", PAGE_HEIGHT - 160, serifBold, 30, INK);

  centerText("This certifies that", PAGE_HEIGHT - 220, serif, 14, MUTED);
  centerText(recipientName, PAGE_HEIGHT - 260, serifBold, 26, INK);

  centerText("has successfully completed", PAGE_HEIGHT - 300, serif, 14, MUTED);
  centerText(title, PAGE_HEIGHT - 335, serifBold, 22, ACCENT);

  const dateLabel = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" }).format(
    issuedAt,
  );
  centerText(`Issued ${dateLabel}`, margin + 50, sans, 12, MUTED);

  return doc.save();
}

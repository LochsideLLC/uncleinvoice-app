import { PDFDocument, PDFString, StandardFonts, rgb } from "pdf-lib";
import { formatDate } from "@/lib/dates";
import { invoiceShowsBrand } from "@/lib/invoice-branding";
import {
  amountDue,
  formatMoney,
  invoiceTotal,
  lineTotal,
  paymentState,
  taxableSubtotal,
  taxCents,
} from "@/lib/money";

type PdfInvoice = {
  seededByUserId?: string | null;
  showBrand?: boolean;
  number: string;
  issueDate: Date;
  dueDate?: Date | null;
  poNumber?: string | null;
  paymentTerms?: string | null;
  paymentInstructions?: string | null;
  taxRateBps?: number | null;
  amountPaid?: number | null;
  fromTaxId?: string | null;
  billToTaxId?: string | null;
  fromContactName?: string | null;
  billToContactName?: string | null;
  fromAddressLine?: string | null;
  fromCity?: string | null;
  fromRegion?: string | null;
  fromPostalCode?: string | null;
  serviceStart: Date | null;
  serviceEnd: Date | null;
  notes: string | null;
  confirmedAt: Date | null;
  confirmedByEmail: string | null;
  workspace: {
    name: string;
    email: string;
    phone: string | null;
    addressLine: string | null;
    city: string | null;
    region: string | null;
    postalCode: string | null;
    taxId?: string | null;
  };
  contractor: {
    userId?: string | null;
    name: string;
    email: string | null;
    phone: string | null;
    addressLine?: string | null;
    city?: string | null;
    region?: string | null;
    postalCode?: string | null;
    taxId?: string | null;
  };
  lineItems: { description: string; quantity: number; unitPrice: number; taxable?: boolean }[];
};

function partyLines(
  person?: string | null,
  company?: string | null,
  attn = false,
): string[] {
  const personName = person?.trim() || "";
  const companyName = company?.trim() || "";
  if (personName && companyName && personName !== companyName) {
    return [companyName, attn ? `Attn: ${personName}` : personName];
  }
  return [companyName || personName].filter(Boolean);
}

function pdfSafe(value: string): string {
  return value
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u00b7\u2022\u2219]/g, "-")
    .replace(/\u00a0/g, " ")
    .replace(/[^\t\n\r\x20-\x7E]/g, " ");
}

export async function buildInvoicePdf(invoice: PdfInvoice): Promise<Buffer> {
  const showBrand = invoice.showBrand ?? await invoiceShowsBrand(invoice);
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.11, 0.1, 0.09);
  const muted = rgb(0.34, 0.33, 0.31);
  const green = rgb(0.12, 0.42, 0.29);

  const text = (value: string, opts: Parameters<typeof page.drawText>[1]) => {
    page.drawText(pdfSafe(value), opts);
  };

  let y = 740;
  const left = 56;

  text("INVOICE", { x: left, y, size: 22, font: bold, color: ink });
  y -= 22;
  text(`Invoice ${invoice.number}`, { x: left, y, size: 11, font, color: muted });
  y -= 16;
  text(`Date ${formatDate(invoice.issueDate)}`, { x: left, y, size: 11, font, color: muted });
  if (invoice.dueDate) {
    y -= 14;
    text(`Pay by ${formatDate(invoice.dueDate)}`, { x: left, y, size: 11, font, color: muted });
  }
  if (invoice.paymentTerms) {
    y -= 14;
    text(invoice.paymentTerms, { x: left, y, size: 11, font, color: muted });
  }
  if (invoice.poNumber) {
    y -= 14;
    text(`PO ${invoice.poNumber}`, { x: left, y, size: 11, font, color: muted });
  }
  if (invoice.serviceStart || invoice.serviceEnd) {
    y -= 14;
    text(
      `Service ${formatDate(invoice.serviceStart)} – ${formatDate(invoice.serviceEnd)}`,
      { x: left, y, size: 11, font, color: muted },
    );
  }

  y -= 28;
  text("BILL TO", { x: left, y, size: 9, font: bold, color: muted });
  text("FROM", { x: 320, y, size: 9, font: bold, color: muted });
  y -= 16;
  const fromHead = partyLines(invoice.fromContactName, invoice.contractor.name);
  const toHead = partyLines(invoice.billToContactName, invoice.workspace.name, true);
  text(toHead[0] ?? "", { x: left, y, size: 12, font: bold, color: ink });
  text(fromHead[0] ?? "", { x: 320, y, size: 12, font: bold, color: ink });
  if (fromHead[1] || toHead[1]) {
    y -= 14;
    if (toHead[1]) text(toHead[1], { x: left, y, size: 10, font, color: ink });
    if (fromHead[1]) text(fromHead[1], { x: 320, y, size: 10, font, color: ink });
  }

  const fromCity = [invoice.fromCity ?? invoice.contractor.city, invoice.fromRegion ?? invoice.contractor.region, invoice.fromPostalCode ?? invoice.contractor.postalCode]
    .filter(Boolean)
    .join(", ");
  const toCity = [invoice.workspace.city, invoice.workspace.region, invoice.workspace.postalCode]
    .filter(Boolean)
    .join(", ");

  const fromLines = [
    invoice.fromAddressLine ?? invoice.contractor.addressLine,
    fromCity,
    invoice.contractor.email,
    invoice.contractor.phone,
    invoice.fromTaxId ?? invoice.contractor.taxId ? `EIN ${invoice.fromTaxId ?? invoice.contractor.taxId}` : null,
  ].filter(Boolean);
  const toLines = [
    invoice.workspace.addressLine,
    toCity,
    invoice.workspace.email,
    invoice.workspace.phone,
    invoice.billToTaxId ?? invoice.workspace.taxId ? `Tax ID ${invoice.billToTaxId ?? invoice.workspace.taxId}` : null,
  ].filter(Boolean);

  const block = Math.max(fromLines.length, toLines.length);
  for (let i = 0; i < block; i += 1) {
    y -= 14;
    if (toLines[i]) text(String(toLines[i]).slice(0, 42), { x: left, y, size: 10, font, color: ink });
    if (fromLines[i]) text(String(fromLines[i]).slice(0, 42), { x: 320, y, size: 10, font, color: ink });
  }

  y -= 28;
  text("DESCRIPTION", { x: left, y, size: 9, font: bold, color: muted });
  text("QTY", { x: 360, y, size: 9, font: bold, color: muted });
  text("RATE", { x: 420, y, size: 9, font: bold, color: muted });
  text("AMOUNT", { x: 490, y, size: 9, font: bold, color: muted });
  y -= 8;
  page.drawLine({
    start: { x: left, y },
    end: { x: 556, y },
    thickness: 1,
    color: rgb(0.84, 0.83, 0.82),
  });

  for (const item of invoice.lineItems) {
    y -= 18;
    text(
      `${item.description.slice(0, 50)}${item.taxable ? " *" : ""}`,
      { x: left, y, size: 10, font, color: ink },
    );
    text(String(item.quantity), { x: 360, y, size: 10, font, color: ink });
    text(formatMoney(item.unitPrice), { x: 420, y, size: 10, font, color: ink });
    text(formatMoney(lineTotal(item.quantity, item.unitPrice)), {
      x: 490,
      y,
      size: 10,
      font,
      color: ink,
    });
  }

  const subtotal = invoiceTotal(invoice.lineItems);
  const tax = taxCents(taxableSubtotal(invoice.lineItems), invoice.taxRateBps ?? 0);
  const total = subtotal + tax;
  const paid = invoice.amountPaid ?? 0;
  const due = amountDue(total, paid);
  const paidStatus = paymentState(paid, total);

  y -= 16;
  page.drawLine({
    start: { x: 360, y },
    end: { x: 556, y },
    thickness: 1,
    color: rgb(0.84, 0.83, 0.82),
  });
  y -= 18;
  text("Subtotal", { x: 360, y, size: 10, font, color: muted });
  text(formatMoney(subtotal), { x: 490, y, size: 10, font, color: ink });
  if (tax) {
    y -= 16;
    text(`Tax (${((invoice.taxRateBps ?? 0) / 100).toFixed(2)}%)`, {
      x: 360,
      y,
      size: 10,
      font,
      color: muted,
    });
    text(formatMoney(tax), { x: 490, y, size: 10, font, color: ink });
  }
  y -= 18;
  text("Total", { x: 360, y, size: 12, font: bold, color: ink });
  text(formatMoney(total), { x: 490, y, size: 12, font: bold, color: ink });
  if (paidStatus !== "unpaid") {
    y -= 16;
    text("Paid", { x: 360, y, size: 10, font, color: muted });
    text(formatMoney(Math.min(paid, total)), { x: 490, y, size: 10, font, color: ink });
  }
  y -= 16;
  text("Still due", { x: 360, y, size: 10, font, color: muted });
  text(formatMoney(due), { x: 490, y, size: 10, font, color: ink });

  if (paidStatus === "paid") {
    page.drawText("PAID", {
      x: 430,
      y: 690,
      size: 28,
      font: bold,
      color: green,
    });
  } else if (paidStatus === "partial") {
    page.drawText("PARTIALLY PAID", {
      x: 360,
      y: 690,
      size: 18,
      font: bold,
      color: rgb(0.55, 0.42, 0.2),
    });
  }

  if (invoice.paymentInstructions) {
    y -= 32;
    text("HOW TO PAY", { x: left, y, size: 9, font: bold, color: muted });
    y -= 14;
    text(invoice.paymentInstructions.replace(/\n/g, " ").slice(0, 90), {
      x: left,
      y,
      size: 10,
      font,
      color: ink,
    });
  }

  if (invoice.notes) {
    y -= 28;
    text("NOTES", { x: left, y, size: 9, font: bold, color: muted });
    y -= 14;
    text(invoice.notes.slice(0, 110), { x: left, y, size: 10, font, color: ink });
  }

  if (invoice.confirmedAt) {
    y -= 24;
    text(
      `Confirmed by ${invoice.confirmedByEmail ?? invoice.contractor.name} on ${formatDate(invoice.confirmedAt)}.`,
      { x: left, y, size: 9, font, color: green },
    );
  }

  if (showBrand) {
    const site = "uncleinvoice.com";
    const tag = "Generate free invoices";
    const siteWidth = bold.widthOfTextAtSize(site, 10);
    const tagWidth = font.widthOfTextAtSize(tag, 8);
    const siteX = (612 - siteWidth) / 2;
    text(site, { x: siteX, y: 44, size: 10, font: bold, color: ink });
    text(tag, { x: (612 - tagWidth) / 2, y: 32, size: 8, font, color: muted });
    const link = doc.context.register(
      doc.context.obj({
        Type: "Annot",
        Subtype: "Link",
        Rect: [siteX, 40, siteX + siteWidth, 56],
        Border: [0, 0, 0],
        A: { Type: "Action", S: "URI", URI: PDFString.of("https://uncleinvoice.com") },
      }),
    );
    page.node.addAnnot(link);
  }

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

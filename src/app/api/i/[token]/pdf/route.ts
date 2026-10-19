import { NextResponse } from "next/server";
import { loadHostedInvoice } from "@/lib/hosted-invoices";
import { buildInvoicePdf } from "@/lib/pdf";
import { cappedInteger, consumeDailyLimit } from "@/lib/usage-limits";

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const hosted = await loadHostedInvoice(token);
  if (!hosted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const globalAllowed = await consumeDailyLimit({
    operation: "hosted_pdf",
    scope: "global",
    scopeKey: "all",
    limit: cappedInteger(process.env.PDF_GLOBAL_DAILY_LIMIT, 2000, 2000),
  });
  const invoiceAllowed = globalAllowed && await consumeDailyLimit({
    operation: "hosted_pdf",
    scope: "invoice",
    scopeKey: hosted.invoice.id,
    limit: cappedInteger(process.env.PDF_PER_INVOICE_DAILY_LIMIT, 50, 50),
  });
  if (!invoiceAllowed) return NextResponse.json({ error: "PDF limit reached. Try again tomorrow." }, { status: 429 });
  const pdf = await buildInvoicePdf(hosted.invoice);
  const download = new URL(request.url).searchParams.get("download") === "1";
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${hosted.invoice.number}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}

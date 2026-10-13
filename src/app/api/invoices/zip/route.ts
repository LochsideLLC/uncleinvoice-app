import { NextResponse } from "next/server";
import JSZip from "jszip";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { buildInvoicePdf } from "@/lib/pdf";
import { invoiceGrandTotal } from "@/lib/money";

/**
 * Bundles the selected invoices into a single zip.
 *
 * POSTed from a form so the browser treats the reply as a download; the ids
 * would not fit in a query string once a client has a few hundred invoices.
 * Every invoice is checked against the caller's workspace membership, so a
 * guessed id in the form body gets nothing.
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const form = await request.formData();
  const ids = form.getAll("id").map(String).filter(Boolean);
  if (!ids.length) {
    return NextResponse.json({ error: "Nothing selected" }, { status: 400 });
  }

  const memberships = await db.workspaceMember.findMany({
    where: { userId: user.id },
    select: { workspaceId: true },
  });
  const allowed = memberships.map((m) => m.workspaceId);

  const invoices = await db.invoice.findMany({
    where: {
      id: { in: ids },
      OR: [
        // A client this person keeps books for.
        { workspaceId: { in: allowed } },
        // Or their own invoices, as the contractor who issued them.
        { contractor: { userId: user.id } },
      ],
    },
    include: {
      contractor: true,
      workspace: true,
      lineItems: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: [{ issueDate: "asc" }, { number: "asc" }],
  });
  if (!invoices.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const zip = new JSZip();

  // A manifest so the invoices can be imported and matched against payments
  // already on the books without opening every PDF to read the numbers off it.
  const manifest = [
    "invoice_number,issue_date,contractor,bill_to,amount,amount_paid,status,confirmed_at,description",
  ];

  const used = new Set<string>();
  for (const invoice of invoices) {
    const stem = safeName(`${invoice.number} ${invoice.contractor.name}`);
    let name = `${stem}.pdf`;
    let n = 2;
    while (used.has(name)) name = `${stem} (${n++}).pdf`;
    used.add(name);
    zip.file(name, await buildInvoicePdf(invoice));

    const total = invoiceGrandTotal(invoice.lineItems, invoice.taxRateBps);
    manifest.push(
      [
        invoice.number,
        invoice.issueDate.toISOString().slice(0, 10),
        invoice.contractor.name,
        invoice.workspace.name,
        (total / 100).toFixed(2),
        (Math.min(Math.max(0, invoice.amountPaid), total) / 100).toFixed(2),
        invoice.confirmedAt ? "confirmed" : invoice.status,
        invoice.confirmedAt ? invoice.confirmedAt.toISOString() : "",
        invoice.lineItems[0]?.description ?? "",
      ]
        .map(csvCell)
        .join(","),
    );
  }

  zip.file("invoices.csv", manifest.join("\n") + "\n");

  const body = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  const label = safeName(invoices[0].workspace.name) || "invoices";
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${label} invoices ${stamp}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}

function csvCell(value: string) {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function safeName(value: string) {
  return value
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

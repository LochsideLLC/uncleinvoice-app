import { NextResponse } from "next/server";
import JSZip from "jszip";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canBulkDownload } from "@/lib/plan";
import { buildInvoicePdf } from "@/lib/pdf";
import { invoicesManifestCsv, invoicePdfName, safeName } from "@/lib/invoice-files";

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
  if (!canBulkDownload(user.plan)) {
    return NextResponse.json(
      { error: "Downloading invoices in bulk is part of the Bookkeeper plan." },
      { status: 402 },
    );
  }

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

  // One invoice is just that invoice. Asking someone to extract a zip to get
  // at a single PDF is a step for nothing, and on a phone it is a real wall.
  if (invoices.length === 1) {
    const only = invoices[0];
    return new NextResponse(new Uint8Array(await buildInvoicePdf(only)), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${invoicePdfName(only.number, only.contractor.name)}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const zip = new JSZip();
  const used = new Set<string>();
  for (const invoice of invoices) {
    let name = invoicePdfName(invoice.number, invoice.contractor.name);
    let n = 2;
    while (used.has(name)) name = invoicePdfName(`${invoice.number} (${n++})`, invoice.contractor.name);
    used.add(name);
    zip.file(name, await buildInvoicePdf(invoice));
  }
  zip.file("invoices.csv", invoicesManifestCsv(invoices));

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

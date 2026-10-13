import { NextResponse } from "next/server";
import JSZip from "jszip";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { buildInvoicePdf } from "@/lib/pdf";

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
  if (!allowed.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const invoices = await db.invoice.findMany({
    where: { id: { in: ids }, workspaceId: { in: allowed } },
    include: {
      contractor: true,
      workspace: true,
      lineItems: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: [{ issueDate: "asc" }, { number: "asc" }],
  });
  if (!invoices.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const zip = new JSZip();
  const used = new Set<string>();
  for (const invoice of invoices) {
    const stem = safeName(`${invoice.number} ${invoice.contractor.name}`);
    let name = `${stem}.pdf`;
    let n = 2;
    while (used.has(name)) name = `${stem} (${n++}).pdf`;
    used.add(name);
    zip.file(name, await buildInvoicePdf(invoice));
  }

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

function safeName(value: string) {
  return value
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/workspace";
import { csvRowToCents, csvRowToPaidCents, parsePaymentCsv } from "@/lib/csv";
import { centsToDollars } from "@/lib/money";
import { nextInvoiceNumber, recordEvent } from "@/lib/invoices";
import { parseDate } from "@/lib/dates";
import type { ActionState } from "@/actions/auth";
import type { InvoiceStatus } from "@/lib/status";
import { canImportInvoices, upgradeMessage } from "@/lib/plan";

export async function importPaymentsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const { user } = await requireWorkspace(workspaceId);
  if (!canImportInvoices(user.plan)) {
    return { error: upgradeMessage("Importing invoices from a spreadsheet") };
  }
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a CSV file first." };
  }

  const text = await file.text();
  let rows;
  try {
    rows = parsePaymentCsv(text);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not read that file." };
  }
  if (!rows.length) {
    return { error: "No invoice rows found. Need contractor_name and amount." };
  }

  // Rows with a blank amount_paid follow this default: backfilling payments
  // that already went out marks them paid, while bringing in invoices that
  // are still owed leaves them unpaid and ready to send. An explicit
  // amount_paid value on a row always wins over this default.
  const defaultPaid = String(formData.get("default_paid") ?? "owed") === "paid";

  let created = 0;
  let skipped = 0;
  for (const row of rows) {
    let contractor = row.contractorEmail
      ? await db.contractor.findFirst({
          where: { workspaceId, email: row.contractorEmail },
        })
      : await db.contractor.findFirst({
          where: { workspaceId, name: row.contractorName },
        });

    if (!contractor) {
      contractor = await db.contractor.create({
        data: {
          workspaceId,
          name: row.contractorName,
          email: row.contractorEmail || null,
        },
      });
    }

    const issueDate = parseDate(row.date) ?? new Date();
    let amount: number;
    try {
      amount = csvRowToCents(row.amount);
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Bad amount in the spreadsheet." };
    }

    const amountPaid = csvRowToPaidCents(row.amountPaid, amount, defaultPaid);

    // Re-importing the same spreadsheet must not double the books. There is no
    // source transaction id to key on, so a row counts as already imported when
    // this workspace already holds an invoice for the same contractor, on the
    // same date, for the same amount.
    const dayStart = new Date(issueDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(issueDate);
    dayEnd.setHours(23, 59, 59, 999);
    const duplicate = await db.invoice.findFirst({
      where: {
        workspaceId,
        contractorId: contractor.id,
        issueDate: { gte: dayStart, lte: dayEnd },
        lineItems: { some: { unitPrice: amount, quantity: 1 } },
      },
      select: { id: true },
    });
    if (duplicate) {
      skipped += 1;
      continue;
    }

    const number = await nextInvoiceNumber(workspaceId);
    const invoice = await db.invoice.create({
      data: {
        workspaceId,
        contractorId: contractor.id,
        number,
        status: "draft" satisfies InvoiceStatus,
        issueDate,
        amountPaid,
        notes: null,
        seededByUserId: user.id,
        lineItems: {
          create: {
            description: row.description || "Services",
            quantity: 1,
            unitPrice: amount,
            sortOrder: 0,
          },
        },
      },
    });
    await recordEvent(
      invoice.id,
      "seeded",
      `Imported from spreadsheet (${row.amount} on ${row.date || "today"}, ${
        amountPaid >= amount ? "paid in full" : amountPaid > 0 ? `${centsToDollars(amountPaid)} paid` : "unpaid"
      }).`,
      user,
    );
    created += 1;
  }

  redirect(`/app/w/${workspaceId}/invoices?imported=${created}&skipped=${skipped}`);
}

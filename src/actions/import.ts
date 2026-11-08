"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/workspace";
import { csvRowToCents, csvRowToPaidCents, parsePaymentCsv, type CsvPaymentRow } from "@/lib/csv";
import { formatMoney } from "@/lib/money";
import { hashToken } from "@/lib/crypto";
import { nextInvoiceNumber } from "@/lib/invoices";
import { parseDate, toDateInput } from "@/lib/dates";
import { cappedInteger, consumeDailyLimit } from "@/lib/usage-limits";
import type { ActionState } from "@/actions/auth";
import type { InvoiceStatus } from "@/lib/status";

const MAX_ROWS = 500;
const MAX_FILE_BYTES = 500_000;

type PreviewRow = {
  index: number;
  contractor: string;
  email: string;
  date: string;
  amount: number;
  paid: number;
  description: string;
  sourcePaymentId: string;
  status: "ready" | "already_imported" | "possible_duplicate";
};

export type ImportActionState = ActionState & {
  preview?: PreviewRow[];
  csvText?: string;
  defaultPaid?: string;
  readyCount?: number;
  duplicateCount?: number;
  possibleCount?: number;
};

type PreparedRow = CsvPaymentRow & {
  index: number;
  dateValue: Date;
  amountCents: number;
  paidCents: number;
  contractorId: string | null;
};

function parseRows(text: string, defaultPaid: boolean): PreparedRow[] {
  if (new TextEncoder().encode(text).length > MAX_FILE_BYTES) throw new Error("That file is too large. Keep it under 500 KB.");
  const rows = parsePaymentCsv(text);
  if (!rows.length) throw new Error("No invoice rows found. Need contractor_name and amount.");
  if (rows.length > MAX_ROWS) throw new Error(`That file has too many rows. Keep imports under ${MAX_ROWS} rows.`);

  const seenSourceIds = new Set<string>();
  return rows.map((row, index) => {
    const dateValue = parseDate(row.date);
    if (!dateValue) throw new Error(`Row ${index + 2} needs a valid payment date.`);
    const amountCents = csvRowToCents(row.amount);
    const paidCents = csvRowToPaidCents(row.amountPaid, amountCents, defaultPaid);
    const sourcePaymentId = row.sourcePaymentId.trim();
    if (sourcePaymentId.length > 160) throw new Error(`Row ${index + 2} has a source payment ID longer than 160 characters.`);
    if (sourcePaymentId && seenSourceIds.has(sourcePaymentId)) throw new Error(`The source payment ID "${sourcePaymentId}" appears more than once in this file.`);
    if (sourcePaymentId) seenSourceIds.add(sourcePaymentId);
    return { ...row, sourcePaymentId, index, dateValue, amountCents, paidCents, contractorId: null };
  });
}

async function inspectRows(workspaceId: string, rows: PreparedRow[]): Promise<{
  rows: PreparedRow[];
  preview: PreviewRow[];
}> {
  const contractors = await db.contractor.findMany({
    where: { workspaceId },
    select: { id: true, name: true, email: true },
  });
  const byEmail = new Map(contractors.filter((c) => c.email).map((c) => [c.email!.toLowerCase(), c]));
  const byName = new Map(contractors.map((c) => [c.name.trim().toLowerCase(), c]));
  const resolved = rows.map((row) => {
    const contractor = row.contractorEmail
      ? byEmail.get(row.contractorEmail.toLowerCase()) ?? byName.get(row.contractorName.trim().toLowerCase())
      : byName.get(row.contractorName.trim().toLowerCase());
    return { ...row, contractorId: contractor?.id ?? null };
  });
  const sourceIds = [...new Set(resolved.map((r) => r.sourcePaymentId).filter(Boolean))];
  const minDate = new Date(Math.min(...resolved.map((r) => r.dateValue.getTime())));
  const maxDate = new Date(Math.max(...resolved.map((r) => r.dateValue.getTime())));
  minDate.setHours(0, 0, 0, 0);
  maxDate.setHours(23, 59, 59, 999);
  const existing = await db.invoice.findMany({
    where: {
      workspaceId,
      OR: [
        ...(sourceIds.length ? [{ sourcePaymentId: { in: sourceIds } }] : []),
        { issueDate: { gte: minDate, lte: maxDate } },
      ],
    },
    include: { contractor: { select: { id: true } }, lineItems: { select: { unitPrice: true, quantity: true } } },
    take: 10_000,
  });

  const preview = resolved.map((row) => {
    const dayStart = new Date(row.dateValue);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(row.dateValue);
    dayEnd.setHours(23, 59, 59, 999);
    const sameSource = row.sourcePaymentId
      ? existing.some((invoice) => invoice.sourcePaymentId === row.sourcePaymentId)
      : false;
    const possibleLegacy = !row.sourcePaymentId && row.contractorId
      ? existing.some((invoice) =>
          invoice.contractor.id === row.contractorId &&
          invoice.issueDate >= dayStart && invoice.issueDate <= dayEnd &&
          invoice.lineItems.some((item) => item.unitPrice === row.amountCents && item.quantity === 1),
        )
      : false;
    return {
      index: row.index,
      contractor: row.contractorName,
      email: row.contractorEmail,
      date: toDateInput(row.dateValue),
      amount: row.amountCents,
      paid: row.paidCents,
      description: row.description || "Services",
      sourcePaymentId: row.sourcePaymentId,
      status: sameSource ? "already_imported" : possibleLegacy ? "possible_duplicate" : "ready",
    } as PreviewRow;
  });
  return { rows: resolved, preview };
}

/** Read-only first step: report exact duplicates and ambiguous old rows before writing invoices. */
export async function previewPaymentsAction(
  _prev: ImportActionState | null,
  formData: FormData,
): Promise<ImportActionState> {
  const workspaceId = String(formData.get("workspaceId") ?? "");
  await requireWorkspace(workspaceId);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a CSV file first." };
  if (file.size > MAX_FILE_BYTES) return { error: "That file is too large. Keep it under 500 KB." };
  const csvText = await file.text();
  const defaultPaid = String(formData.get("default_paid") ?? "owed");
  try {
    const prepared = parseRows(csvText, defaultPaid === "paid");
    const result = await inspectRows(workspaceId, prepared);
    return {
      ok: true,
      message: "Preview ready. Nothing has been added yet.",
      preview: result.preview,
      csvText,
      defaultPaid,
      readyCount: result.preview.filter((row) => row.status === "ready").length,
      duplicateCount: result.preview.filter((row) => row.status === "already_imported").length,
      possibleCount: result.preview.filter((row) => row.status === "possible_duplicate").length,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not read that file." };
  }
}

/** Commit only after preview. Rows that may match an older invoice stay skipped unless the user selects them. */
export async function importPaymentsAction(
  _prev: ImportActionState | null,
  formData: FormData,
): Promise<ImportActionState> {
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const { user } = await requireWorkspace(workspaceId);
  const csvText = String(formData.get("csvText") ?? "");
  if (!csvText) return { error: "Preview the CSV again before importing it." };
  const defaultPaid = String(formData.get("default_paid") ?? "owed");
  const includeAmbiguous = new Set(formData.getAll("includeAmbiguous").map((value) => Number(value)).filter(Number.isInteger));

  let prepared: PreparedRow[];
  let inspected: Awaited<ReturnType<typeof inspectRows>>;
  try {
    prepared = parseRows(csvText, defaultPaid === "paid");
    inspected = await inspectRows(workspaceId, prepared);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not read that file." };
  }

  const readyRows = inspected.rows.filter((row) => {
    const preview = inspected.preview[row.index];
    return preview.status === "ready" || (preview.status === "possible_duplicate" && includeAmbiguous.has(row.index));
  });
  const alreadyImportedCount = inspected.preview.filter((row) => row.status === "already_imported").length;
  const skipped = inspected.rows.length - readyRows.length;
  if (!readyRows.length) return { error: "No rows are ready to import. Resolve or skip the possible duplicates above." };

  const globalAllowed = await consumeDailyLimit({
    operation: "import_run",
    scope: "global",
    scopeKey: "all",
    limit: cappedInteger(process.env.IMPORT_GLOBAL_DAILY_LIMIT, 200, 200),
  });
  const userAllowed = globalAllowed && await consumeDailyLimit({
    operation: "import_run",
    scope: "user",
    scopeKey: user.id,
    limit: cappedInteger(process.env.IMPORT_PER_USER_DAILY_LIMIT, 10, 10),
  });
  if (!userAllowed) return { error: "Import limit reached. Try again tomorrow." };

  const fileKey = hashToken(csvText);
  let created = 0;
  let lateDuplicates = 0;
  const createdContractors = new Map<string, { id: string; workspaceId: string; email: string | null }>();
  for (const row of readyRows) {
    const contractorKey = row.contractorEmail
      ? `email:${row.contractorEmail.toLowerCase()}`
      : `name:${row.contractorName.trim().toLowerCase()}`;
    let contractor = row.contractorId
      ? await db.contractor.findFirst({ where: { id: row.contractorId, workspaceId } })
      : createdContractors.get(contractorKey) ?? await db.contractor.findFirst({
          where: row.contractorEmail
            ? { workspaceId, email: row.contractorEmail.toLowerCase() }
            : { workspaceId, name: row.contractorName },
        });
    if (!contractor) {
      contractor = await db.contractor.create({
        data: { workspaceId, name: row.contractorName, email: row.contractorEmail || null },
      });
    }
    createdContractors.set(contractorKey, contractor);

    const number = await nextInvoiceNumber(workspaceId);
    try {
      await db.invoice.create({
        data: {
          workspaceId,
          contractorId: contractor.id,
          number,
          status: "draft" satisfies InvoiceStatus,
          issueDate: row.dateValue,
          amountPaid: row.paidCents,
          sourcePaymentId: row.sourcePaymentId || null,
          notes: null,
          seededByUserId: user.id,
          lineItems: { create: { description: row.description || "Services", quantity: 1, unitPrice: row.amountCents, sortOrder: 0 } },
          events: {
            create: {
              type: "seeded",
              message: `Imported from spreadsheet (${row.amount} on ${row.date}, ${row.paidCents >= row.amountCents ? "paid in full" : row.paidCents > 0 ? `${formatMoney(row.paidCents)} paid` : "unpaid"}).`,
              actorEmail: user.email,
              actorName: user.name,
              dedupeKey: `payment-import:${workspaceId}:${fileKey}:${row.index}`,
              metadata: { sourcePaymentId: row.sourcePaymentId || null },
            },
          },
        },
      });
      created += 1;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        lateDuplicates += 1;
        continue;
      }
      throw error;
    }
  }

  redirect(`/app/w/${workspaceId}/invoices?imported=${created}&skipped=${skipped + lateDuplicates}&already=${alreadyImportedCount}`);
}

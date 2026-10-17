"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/workspace";
import { recordEvent } from "@/lib/invoices";
import type { ActionState } from "@/actions/auth";
import { canAttachDocuments, upgradeMessage } from "@/lib/plan";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "text/csv",
]);

export async function uploadAttachmentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const { user } = await requireWorkspace(workspaceId);
  if (!canAttachDocuments(user.plan)) {
    return { error: upgradeMessage("Attaching supporting documents") };
  }

  const invoice = await db.invoice.findFirst({ where: { id: invoiceId, workspaceId } });
  if (!invoice) return { error: "Invoice not found." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file first." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "That file is larger than 5 MB." };
  }
  const contentType = file.type || "application/octet-stream";
  if (!ALLOWED.has(contentType)) {
    return { error: "Attach a PDF, PNG, JPEG, or CSV." };
  }

  const label = String(formData.get("label") ?? "").trim() || null;
  const kind = String(formData.get("kind") ?? "source_record").trim() || "source_record";
  const bytes = Buffer.from(await file.arrayBuffer());

  await db.invoiceAttachment.create({
    data: {
      invoiceId,
      kind,
      label,
      filename: file.name,
      contentType,
      byteSize: bytes.byteLength,
      data: bytes,
      uploadedByUserId: user.id,
    },
  });
  await recordEvent(
    invoiceId,
    "attachment_added",
    `Attached supporting document "${label ?? file.name}".`,
    user,
  );
  revalidatePath(`/app/w/${workspaceId}/invoices/${invoiceId}`);
  return { ok: true, message: `Attached ${file.name}.` };
}

export async function deleteAttachmentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const attachmentId = String(formData.get("attachmentId") ?? "");
  await requireWorkspace(workspaceId);
  const attachment = await db.invoiceAttachment.findUnique({ where: { id: attachmentId } });
  if (!attachment || attachment.invoiceId !== invoiceId) return { error: "Not found." };
  await db.invoiceAttachment.delete({ where: { id: attachmentId } });
  revalidatePath(`/app/w/${workspaceId}/invoices/${invoiceId}`);
  return { ok: true, message: "Removed." };
}

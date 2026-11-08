"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/workspace";
import type { ActionState } from "@/actions/auth";

const serviceItemSchema = z.object({
  workspaceId: z.string().min(1),
  description: z.string().trim().min(1, "Describe the service").max(200),
  unitPriceCents: z.coerce.number().int().min(0).max(100_000_000),
  taxable: z.coerce.boolean(),
});

function formValues(formData: FormData) {
  return {
    workspaceId: formData.get("workspaceId"),
    description: formData.get("description"),
    unitPriceCents: formData.get("unitPriceCents"),
    taxable: formData.get("taxable") === "1" || formData.get("taxable") === "true",
  };
}

export type ServiceItemResult =
  | {
      ok: true;
      message: string;
      item: { id: string; description: string; unitPriceCents: number; taxable: boolean };
    }
  | { error: string };

export async function createServiceItemAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ServiceItemResult> {
  const parsed = serviceItemSchema.safeParse(formValues(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  await requireWorkspace(parsed.data.workspaceId);
  const item = await db.serviceItem.create({
    data: {
      workspaceId: parsed.data.workspaceId,
      description: parsed.data.description,
      unitPrice: parsed.data.unitPriceCents,
      taxable: parsed.data.taxable,
    },
  });
  return {
    ok: true,
    message: "Service saved.",
    item: {
      id: item.id,
      description: item.description,
      unitPriceCents: item.unitPrice,
      taxable: item.taxable,
    },
  };
}

export async function updateServiceItemAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = serviceItemSchema
    .extend({ itemId: z.string().min(1) })
    .safeParse({ ...formValues(formData), itemId: formData.get("itemId") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  const item = await db.serviceItem.findUnique({ where: { id: parsed.data.itemId } });
  if (!item || item.workspaceId !== parsed.data.workspaceId) {
    return { error: "That service was not found." };
  }
  await requireWorkspace(parsed.data.workspaceId);
  await db.serviceItem.update({
    where: { id: parsed.data.itemId },
    data: {
      description: parsed.data.description,
      unitPrice: parsed.data.unitPriceCents,
      taxable: parsed.data.taxable,
    },
  });
  return { ok: true, message: "Service saved." };
}

export async function deleteServiceItemAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const itemId = String(formData.get("itemId") ?? "");
  if (!workspaceId || !itemId) return { error: "Check the form." };
  const item = await db.serviceItem.findUnique({ where: { id: itemId } });
  if (!item || item.workspaceId !== workspaceId) {
    return { error: "That service was not found." };
  }
  await requireWorkspace(workspaceId);
  await db.serviceItem.delete({ where: { id: itemId } });
  return { ok: true, message: "Service deleted." };
}

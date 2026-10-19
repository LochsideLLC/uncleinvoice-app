"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/workspace";
import { cappedInteger, consumeDailyLimit } from "@/lib/usage-limits";
import type { ActionState } from "@/actions/auth";

const contractorSchema = z.object({
  name: z.string().trim().min(1, "Contractor name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

export async function createContractorAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const { user } = await requireWorkspace(workspaceId);
  // Abuse guard: contractor records are cheap, but a script adding thousands
  // is not bookkeeping. Fail safe at a generous daily ceiling.
  const contractorsAllowed = await consumeDailyLimit({
    operation: "contractor_create",
    scope: "global",
    scopeKey: "all",
    limit: cappedInteger(process.env.CONTRACTOR_GLOBAL_DAILY_LIMIT, 1000, 1000),
  }) && await consumeDailyLimit({
    operation: "contractor_create",
    scope: "user",
    scopeKey: user.id,
    limit: cappedInteger(process.env.CONTRACTOR_PER_USER_DAILY_LIMIT, 100, 100),
  });
  if (!contractorsAllowed) {
    return { error: "Contractor limit reached. Try again tomorrow." };
  }
  const parsed = contractorSchema.safeParse({
    name: formData.get("name"),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    phone: String(formData.get("phone") ?? "").trim() || undefined,
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  await db.contractor.create({
    data: {
      workspaceId,
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone ?? null,
      notes: parsed.data.notes ?? null,
    },
  });
  redirect(`/app/w/${workspaceId}/contractors`);
}

export async function updateContractorAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const contractorId = String(formData.get("contractorId") ?? "");
  await requireWorkspace(workspaceId);
  const parsed = contractorSchema.safeParse({
    name: formData.get("name"),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    phone: String(formData.get("phone") ?? "").trim() || undefined,
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  await db.contractor.update({
    where: { id: contractorId },
    data: {
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone ?? null,
      notes: parsed.data.notes ?? null,
    },
  });
  return { ok: true, message: "Contractor saved." };
}

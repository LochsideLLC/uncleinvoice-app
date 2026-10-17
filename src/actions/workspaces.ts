"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { requireWorkspace } from "@/lib/workspace";
import type { ActionState } from "@/actions/auth";
import { workspaceLimit } from "@/lib/plan";

const workspaceSchema = z.object({
  name: z.string().trim().min(1, "Client name is required"),
  email: z.string().email("Client needs an email so finished invoices have somewhere to go"),
  phone: z.string().optional(),
  addressLine: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  postalCode: z.string().optional(),
});

/**
 * How many clients this person may have, against how many they already keep.
 * Checked here rather than only on the button, because the form posts
 * straight to this action.
 */
async function clientLimitReached(user: { id: string; plan: string }) {
  const limit = workspaceLimit(user.plan);
  if (limit === Infinity) return false;
  const existing = await db.workspaceMember.count({ where: { userId: user.id } });
  return existing >= limit;
}

export async function createWorkspaceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = workspaceSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: emptyToUndef(formData.get("phone")),
    addressLine: emptyToUndef(formData.get("addressLine")),
    city: emptyToUndef(formData.get("city")),
    region: emptyToUndef(formData.get("region")),
    postalCode: emptyToUndef(formData.get("postalCode")),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  if (await clientLimitReached(user)) {
    return {
      error: "The Free and Invoice plans keep one client. The Bookkeeper plan keeps as many as you need — see Upgrade in your profile.",
    };
  }

  const workspace = await db.workspace.create({
    data: {
      ...parsed.data,
      createdById: user.id,
      members: {
        create: { userId: user.id, role: "owner" },
      },
    },
  });
  redirect(`/app/w/${workspace.id}`);
}

export type InlineWorkspaceResult =
  | {
      ok: true;
      workspace: {
        id: string;
        name: string;
        email: string;
        phone: string | null;
        addressLine: string | null;
        city: string | null;
        region: string | null;
        postalCode: string | null;
        nextNumber: string;
      };
    }
  | { error: string };

/**
 * Create a client without leaving the page.
 *
 * `createWorkspaceAction` ends in a redirect to the new workspace, which is
 * what the standalone Add-a-client page wants. The invoice form's slide-in
 * panel needs the new record back instead, so it can fill the bill-to
 * fields immediately.
 */
export async function createWorkspaceInlineAction(
  _prev: unknown,
  formData: FormData,
): Promise<InlineWorkspaceResult> {
  const user = await requireUser();
  const parsed = workspaceSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: emptyToUndef(formData.get("phone")),
    addressLine: emptyToUndef(formData.get("addressLine")),
    city: emptyToUndef(formData.get("city")),
    region: emptyToUndef(formData.get("region")),
    postalCode: emptyToUndef(formData.get("postalCode")),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  if (await clientLimitReached(user)) {
    return {
      error: "The Free and Invoice plans keep one client. The Bookkeeper plan keeps as many as you need — see Upgrade in your profile.",
    };
  }

  const workspace = await db.workspace.create({
    data: {
      ...parsed.data,
      createdById: user.id,
      members: {
        create: { userId: user.id, role: "owner" },
      },
    },
  });
  return {
    ok: true,
    workspace: {
      id: workspace.id,
      name: workspace.name,
      email: workspace.email,
      phone: workspace.phone,
      addressLine: workspace.addressLine,
      city: workspace.city,
      region: workspace.region,
      postalCode: workspace.postalCode,
      nextNumber: `${workspace.invoicePrefix}-${String(workspace.nextInvoiceNumber).padStart(4, "0")}`,
    },
  };
}

export async function updateWorkspaceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const workspaceId = String(formData.get("workspaceId") ?? "");
  await requireWorkspace(workspaceId);
  const parsed = workspaceSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: emptyToUndef(formData.get("phone")),
    addressLine: emptyToUndef(formData.get("addressLine")),
    city: emptyToUndef(formData.get("city")),
    region: emptyToUndef(formData.get("region")),
    postalCode: emptyToUndef(formData.get("postalCode")),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  await db.workspace.update({ where: { id: workspaceId }, data: parsed.data });
  return { ok: true, message: "Client details saved." };
}

function emptyToUndef(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text ? text : undefined;
}

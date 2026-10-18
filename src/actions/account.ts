"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hashPassword, requireUser, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { optionalText } from "@/lib/invoice-fields";
import { formatUsPhone, phoneDigits } from "@/lib/us-address";
import type { ActionState } from "@/actions/auth";

import { CLIENT_TERMS } from "@/lib/client-terms";
import { ACCOUNT_TYPES } from "@/lib/account-type";

const MAX_LOGO_CHARS = 400_000;
const LOGO_PATTERN = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=\s]+$/;

function refreshAccountPages() {
  revalidatePath("/", "layout");
  revalidatePath("/app");
  revalidatePath("/app/profile");
}

export async function updateAccountTypeAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const raw = String(formData.get("accountType") ?? "");
  if (!(ACCOUNT_TYPES as readonly string[]).includes(raw)) return;
  await db.user.update({ where: { id: user.id }, data: { accountType: raw } });
  revalidatePath("/app");
  if (raw === "bookkeeper") redirect("/app/plans?welcome=bookkeeper");
  redirect("/app");
}

export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name is required." };
  const backupEmail = optionalText(formData.get("backupEmail"))?.toLowerCase() ?? null;
  if (backupEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(backupEmail)) {
    return { error: "Enter a valid backup email." };
  }

  const raw = String(formData.get("clientTerm"));
  const clientTerm: (typeof CLIENT_TERMS)[number] = CLIENT_TERMS.includes(raw as (typeof CLIENT_TERMS)[number])
    ? (raw as (typeof CLIENT_TERMS)[number])
    : "clients";

  const emailSignature = optionalText(formData.get("emailSignature")) ?? null;
  if (emailSignature && emailSignature.length > 1000) {
    return { error: "Keep the signature under 1,000 characters." };
  }

  await db.user.update({
    where: { id: user.id },
    data: { name, backupEmail, clientTerm, emailSignature },
  });
  refreshAccountPages();
  return { ok: true, message: "Profile saved." };
}

export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  if (newPassword.length < 8) {
    return { error: "New password must be at least 8 characters." };
  }
  if (user.passwordHash) {
    if (!currentPassword) {
      return { error: "Enter your current password." };
    }
    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) {
      return { error: "That current password does not match." };
    }
  }
  await db.user.update({
    where: { id: user.id },
    // Clearing mustSetPassword is the point of the first-run form: the
    // temporary password someone else knows is now gone.
    data: { passwordHash: await hashPassword(newPassword), mustSetPassword: false },
  });
  refreshAccountPages();
  return { ok: true, message: "Password saved. Use it next time you sign in." };
}

export async function updateBusinessAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const businessEmail = optionalText(formData.get("businessEmail"))?.toLowerCase() ?? null;
  if (businessEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(businessEmail)) {
    return { error: "Enter a valid email." };
  }
  const rawPhone = optionalText(formData.get("phone"));
  if (rawPhone && phoneDigits(rawPhone).length !== 10) {
    return { error: "Enter a 10-digit phone number." };
  }
  await db.user.update({
    where: { id: user.id },
    data: {
      businessName: optionalText(formData.get("businessName")),
      businessEmail,
      phone: rawPhone ? formatUsPhone(rawPhone) : null,
      addressLine: optionalText(formData.get("addressLine")),
      addressLine2: optionalText(formData.get("addressLine2")),
      city: optionalText(formData.get("city")),
      region: optionalText(formData.get("region")),
      postalCode: optionalText(formData.get("postalCode")),
      businessLogoKind: parseLogoKind(formData.get("businessLogoKind")),
    },
  });
  refreshAccountPages();
  return { ok: true, message: "Business info saved." };
}

function parseLogoKind(value: FormDataEntryValue | null) {
  return value === "wide" ? "wide" : "mark";
}

export async function updateLogoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const logoUrl = String(formData.get("logoUrl") ?? "").trim();
  if (!LOGO_PATTERN.test(logoUrl) || logoUrl.length > MAX_LOGO_CHARS) {
    return { error: "Use a JPG or PNG under about 300 KB." };
  }

  await db.user.update({
    where: { id: user.id },
    data: { logoUrl },
  });
  refreshAccountPages();
  return { ok: true, message: "Logo saved." };
}

export async function removeLogoAction(): Promise<void> {
  const user = await requireUser();
  await db.user.update({
    where: { id: user.id },
    data: { logoUrl: null },
  });
  refreshAccountPages();
}

export async function updateBusinessLogoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const image = String(formData.get("logoUrl") ?? "").trim();
  const kind = parseLogoKind(formData.get("kind"));
  if (!LOGO_PATTERN.test(image) || image.length > MAX_LOGO_CHARS) {
    return { error: "Use a JPG or PNG under about 300 KB." };
  }

  await db.user.update({
    where: { id: user.id },
    data:
      kind === "wide"
        ? { businessWordmarkUrl: image, businessLogoKind: "wide" }
        : { businessLogoUrl: image, businessLogoKind: "mark" },
  });
  refreshAccountPages();
  return { ok: true, message: "Business logo saved." };
}

export async function removeBusinessLogoAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const kind = parseLogoKind(formData.get("kind"));
  await db.user.update({
    where: { id: user.id },
    data: kind === "wide" ? { businessWordmarkUrl: null } : { businessLogoUrl: null },
  });
  refreshAccountPages();
}

export async function updateBusinessLogoKindAction(kind: "mark" | "wide"): Promise<void> {
  const user = await requireUser();
  await db.user.update({
    where: { id: user.id },
    data: { businessLogoKind: kind },
  });
  refreshAccountPages();
}

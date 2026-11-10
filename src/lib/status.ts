export const INVOICE_STATUSES = [
  "draft",
  "awaiting_review",
  "confirmed",
  "sent",
] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: "Draft",
  awaiting_review: "Draft",
  confirmed: "Saved",
  sent: "Sent",
};

export const STATUS_TONE: Record<InvoiceStatus, string> = {
  draft: "bg-[#efe4d2] text-[#5c4a38]",
  awaiting_review: "bg-[#efe4d2] text-[#5c4a38]",
  confirmed: "bg-[#dce3d0] text-[#3d4a30]",
  sent: "bg-[#ead9b8] text-[#5a4630]",
};

export function isInvoiceStatus(value: string): value is InvoiceStatus {
  return INVOICE_STATUSES.includes(value as InvoiceStatus);
}

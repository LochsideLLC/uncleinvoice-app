type InvoiceDisplayStatusProps = {
  status: string;
  dueDate: Date | null;
  amountPaid: number;
  totalCents: number;
};

const WORKFLOW_LABEL: Record<string, { label: string; tone: string }> = {
  draft: { label: "Draft", tone: "bg-[#efe4d2] text-[#5c4a38]" },
  awaiting_review: { label: "Draft", tone: "bg-[#efe4d2] text-[#5c4a38]" },
  confirmed: { label: "Saved", tone: "bg-[#dce3d0] text-[#3d4a30]" },
  sent: { label: "Sent", tone: "bg-[#ead9b8] text-[#5a4630]" },
};

function Badge({ label, tone }: { label: string; tone: string }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 font-medium ${tone}`} style={{ fontSize: "14px", lineHeight: "16px" }}>{label}</span>;
}

export function InvoiceDisplayStatus({
  status,
  dueDate,
  amountPaid,
  totalCents,
}: InvoiceDisplayStatusProps) {
  const workflow = WORKFLOW_LABEL[status] ?? { label: status, tone: "bg-stone-100 text-stone-700" };
  const workflowLabel = workflow.label;

  let paymentLabel: string | null = null;
  let paymentTone = "";
  if (totalCents > 0 && amountPaid >= totalCents) {
    paymentLabel = "Paid";
    paymentTone = "bg-emerald-100 text-emerald-900";
  } else if (status === "sent" && dueDate && amountPaid < totalCents) {
    const due = new Date(dueDate);
    const today = new Date();
    due.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    if (due < today) {
      paymentLabel = "Overdue";
      paymentTone = "bg-red-100 text-red-800";
    } else if (amountPaid > 0) {
      paymentLabel = "Partly paid";
      paymentTone = "bg-amber-100 text-amber-900";
    }
  } else if (amountPaid > 0 && totalCents > amountPaid) {
    paymentLabel = "Partly paid";
    paymentTone = "bg-amber-100 text-amber-900";
  }

  return (
    <span className="flex flex-wrap items-center justify-end gap-1">
      <Badge label={workflowLabel} tone={workflow.tone} />
      {paymentLabel ? <Badge label={paymentLabel} tone={paymentTone} /> : null}
    </span>
  );
}

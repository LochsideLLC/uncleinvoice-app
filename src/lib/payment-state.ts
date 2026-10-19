export type StripePaymentState =
  | "pending"
  | "succeeded"
  | "failed"
  | "partially_refunded"
  | "fully_refunded"
  | "disputed";

export function classifyStripePayment(args: {
  intentStatus: string;
  amountReceived: number;
  refundedAmount: number;
  disputed: boolean;
  hasFailure: boolean;
}): StripePaymentState {
  if (args.intentStatus === "succeeded") {
    if (args.disputed) return "disputed";
    if (args.amountReceived > 0 && args.refundedAmount >= args.amountReceived) return "fully_refunded";
    if (args.refundedAmount > 0) return "partially_refunded";
    return "succeeded";
  }
  return args.intentStatus === "canceled" || args.hasFailure ? "failed" : "pending";
}

export function netPaidAmount(status: StripePaymentState | string, amount: number, refundedAmount: number) {
  if (!["succeeded", "partially_refunded", "fully_refunded", "disputed"].includes(status)) return 0;
  return Math.max(0, amount - refundedAmount);
}

export function checkoutMatchesBalance(
  attempt: { amount: number; currency: string; connectedAccountId: string },
  current: { balance: number; currency: string; connectedAccountId: string },
) {
  return attempt.amount === current.balance &&
    attempt.currency === current.currency &&
    attempt.connectedAccountId === current.connectedAccountId;
}

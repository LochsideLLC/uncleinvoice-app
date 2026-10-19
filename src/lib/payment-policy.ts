export const REQUIRED_CONNECT_CONFIGURATION = {
  dashboardType: "full",
  feesCollector: "stripe",
  lossesCollector: "stripe",
  requirementsCollector: "stripe",
} as const;

export type ConnectConfigurationSnapshot = {
  dashboardType: string | null;
  feesCollector: string | null;
  lossesCollector: string | null;
  requirementsCollector: string | null;
  cardPaymentsStatus?: string | null;
  requirements?: unknown;
};

export type PaymentAccountSnapshot = ConnectConfigurationSnapshot & {
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  disconnectedAt: Date | null;
};

export type PaymentEligibility =
  | { eligible: true; total: number; balance: number }
  | { eligible: false; reason: string; total: number; balance: number };

export function isSafeConnectConfiguration(snapshot: ConnectConfigurationSnapshot) {
  return (
    snapshot.dashboardType === REQUIRED_CONNECT_CONFIGURATION.dashboardType &&
    snapshot.feesCollector === REQUIRED_CONNECT_CONFIGURATION.feesCollector &&
    snapshot.lossesCollector === REQUIRED_CONNECT_CONFIGURATION.lossesCollector &&
    snapshot.requirementsCollector === REQUIRED_CONNECT_CONFIGURATION.requirementsCollector
  );
}

export function onlinePaymentEligibility(args: {
  total: number;
  amountPaid: number;
  status: string;
  collectionMode: string;
  onlinePaymentEnabled: boolean;
  ownerUserId: string | null;
  requestingUserId?: string;
  account: PaymentAccountSnapshot | null;
}): PaymentEligibility {
  const balance = Math.max(0, args.total - args.amountPaid);
  const base = { total: args.total, balance };
  if (!args.ownerUserId) {
    return { eligible: false, reason: "The contractor must claim this invoice before payment can be enabled.", ...base };
  }
  if (args.requestingUserId && args.ownerUserId !== args.requestingUserId) {
    return { eligible: false, reason: "Only the contractor who issued this invoice can collect payment.", ...base };
  }
  if (!args.account || args.account.disconnectedAt) {
    return { eligible: false, reason: "Connect Stripe first.", ...base };
  }
  if (!isSafeConnectConfiguration(args.account)) {
    return { eligible: false, reason: "Stripe responsibility settings are not safe.", ...base };
  }
  if (
    !args.account.chargesEnabled ||
    !args.account.payoutsEnabled ||
    !args.account.detailsSubmitted ||
    args.account.cardPaymentsStatus !== "active"
  ) {
    return { eligible: false, reason: "Stripe onboarding is not complete.", ...base };
  }
  if (!args.onlinePaymentEnabled || args.collectionMode !== "stripe") {
    return { eligible: false, reason: "Online payment is not enabled for this invoice.", ...base };
  }
  if (!args.status || args.status === "draft" || args.status === "awaiting_review") {
    return { eligible: false, reason: "The invoice must be confirmed before payment.", ...base };
  }
  if (balance <= 0) {
    return { eligible: false, reason: "This invoice is already paid.", ...base };
  }
  return { eligible: true, ...base };
}

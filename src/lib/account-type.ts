export const ACCOUNT_TYPES = ["contractor", "bookkeeper", "other"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export function asAccountType(value: unknown): AccountType {
  return (ACCOUNT_TYPES as readonly unknown[]).includes(value) ? (value as AccountType) : "other";
}

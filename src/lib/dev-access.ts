export const DEV_ACCOUNT_EMAIL = "test@bookkeepingconroe.com";

export function localDevAccessEnabled() {
  if (process.env.NODE_ENV !== "development") return false;
  try {
    const host = new URL(process.env.DATABASE_URL ?? "").hostname;
    return ["localhost", "127.0.0.1", "::1", "db", "postgres"].includes(host);
  } catch {
    return false;
  }
}

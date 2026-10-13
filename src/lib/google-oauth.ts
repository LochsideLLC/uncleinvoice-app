import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";

export const GOOGLE_OAUTH_COOKIE = "ir_google_oauth";

export type GoogleOAuthState = {
  state: string;
  verifier: string;
  next: string;
  from: string;
  redirectUri: string;
};

export function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function appOrigin() {
  return (process.env.APP_URL ?? "http://localhost:3000").trim().replace(/\/$/, "");
}

export function googleCallbackUri() {
  return `${appOrigin()}/api/auth/google/callback`;
}

export function safeAuthReturnPath(raw: string | null) {
  return raw === "/signup" ? "/signup" : "/login";
}

function base64url(buf: Buffer) {
  return buf.toString("base64url");
}

export function createGoogleOAuthChallenge() {
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash("sha256").update(verifier).digest());
  const state = base64url(randomBytes(24));
  return { verifier, challenge, state };
}

export function buildGoogleAuthUrl(input: {
  state: string;
  challenge: string;
  redirectUri: string;
}) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID ?? "");
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", input.state);
  url.searchParams.set("code_challenge", input.challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

export function encodeGoogleOAuthState(value: GoogleOAuthState) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

export function decodeGoogleOAuthState(raw: string | undefined): GoogleOAuthState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Partial<GoogleOAuthState>;
    if (
      typeof parsed.state !== "string" ||
      typeof parsed.verifier !== "string" ||
      typeof parsed.redirectUri !== "string"
    ) {
      return null;
    }
    return {
      state: parsed.state,
      verifier: parsed.verifier,
      next: typeof parsed.next === "string" ? parsed.next : "",
      from: safeAuthReturnPath(typeof parsed.from === "string" ? parsed.from : null),
      redirectUri: parsed.redirectUri,
    };
  } catch {
    return null;
  }
}

export function sameOAuthValue(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function exchangeGoogleCode(code: string, verifier: string, redirectUri: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
    cache: "no-store",
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as { access_token?: string };
  return payload.access_token ?? null;
}

export async function fetchGoogleProfile(accessToken: string) {
  const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const profile = (await response.json()) as {
    email?: string;
    email_verified?: boolean | string;
    name?: string;
  };
  const email = profile.email?.trim().toLowerCase();
  const verified = profile.email_verified === true || profile.email_verified === "true";
  if (!email || !verified) return null;
  return {
    email,
    name: profile.name?.trim() || email.split("@")[0] || "User",
  };
}

export async function findOrCreateGoogleUser(profile: { email: string; name: string }) {
  const existing = await db.user.findUnique({ where: { email: profile.email } });
  const user =
    existing ??
    (await db.user.create({
      data: { email: profile.email, name: profile.name },
    }));

  await db.contractor.updateMany({
    where: { email: profile.email, userId: null },
    data: { userId: user.id },
  });
  return user;
}

export function googleAuthErrorMessage(code: string | undefined) {
  switch (code) {
    case "link_missing":
      return "That sign-in link is incomplete. Request a new one.";
    case "link_invalid":
      return "That sign-in link is invalid or has expired. Request a new one.";
    case "missing_config":
      return "Google sign-in is not configured yet.";
    case "denied":
      return "Google sign-in was cancelled.";
    case "no_email":
      return "Google did not share a verified email. Allow email access and try again.";
    case "invalid":
    case "failed":
      return "Google sign-in could not be completed. Try again.";
    default:
      return null;
  }
}

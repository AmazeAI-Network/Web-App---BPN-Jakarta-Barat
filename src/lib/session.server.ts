// Server-only session helpers. HMAC-signed session token stored in an
// HttpOnly cookie. Used to authenticate admin server functions and to
// gate the transactional email endpoint.
import { createHmac, timingSafeEqual } from "node:crypto";
import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";

export type SessionRole = "admin" | "petugas_loket" | "verifikator";
export type SessionPayload = {
  uid: string;
  username: string;
  role: SessionRole;
  exp: number; // unix seconds
};

const COOKIE_NAME = "bpn_sess";
const MAX_AGE = 60 * 60 * 12; // 12 hours

function getSecret(): string {
  const s =
    process.env.SESSION_SECRET ||
    process.env.SIGNED_URL_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "";
  if (!s || s.length < 16) {
    throw new Error("Session secret is not configured");
  }
  return s;
}

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString("base64url");
}
function b64urlDecode(s: string): Buffer {
  return Buffer.from(s, "base64url");
}

function sign(data: string): string {
  return createHmac("sha256", getSecret()).update(data).digest("base64url");
}

export function createSessionToken(p: Omit<SessionPayload, "exp">): string {
  const payload: SessionPayload = { ...p, exp: Math.floor(Date.now() / 1000) + MAX_AGE };
  const body = b64url(JSON.stringify(payload));
  const sig = sign(body);
  return `${body}.${sig}`;
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token || typeof token !== "string") return null;
  const idx = token.lastIndexOf(".");
  if (idx <= 0) return null;
  const body = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  let expected: string;
  try {
    expected = sign(body);
  } catch {
    return null;
  }
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  let payload: SessionPayload;
  try {
    payload = JSON.parse(b64urlDecode(body).toString("utf8")) as SessionPayload;
  } catch {
    return null;
  }
  if (!payload?.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

export function setSessionCookie(token: string): void {
  setCookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export function clearSessionCookie(): void {
  deleteCookie(COOKIE_NAME, { path: "/" });
}

export function getSession(): SessionPayload | null {
  try {
    return verifySessionToken(getCookie(COOKIE_NAME));
  } catch {
    return null;
  }
}

export function requireSession(): SessionPayload {
  const s = getSession();
  if (!s) throw new Error("Unauthorized");
  return s;
}

export function requireAdmin(): SessionPayload {
  const s = requireSession();
  if (s.role !== "admin") throw new Error("Forbidden: admin only");
  return s;
}

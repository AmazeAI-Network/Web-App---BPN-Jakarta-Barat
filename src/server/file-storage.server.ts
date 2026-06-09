// Server-only file storage for pengamanan PDFs. Files live on local disk under
// FILE_STORAGE_DIR/pengamanan/. Downloads go through a short-lived HMAC-signed
// URL so the folder doesn't need to be publicly served.
import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

function rootDir(): string {
  return resolve(process.env.FILE_STORAGE_DIR || "./uploads");
}
function pengamananDir(): string {
  return join(rootDir(), "pengamanan");
}

function getSecret(): string {
  const s =
    process.env.SIGNED_URL_SECRET ||
    process.env.SESSION_SECRET ||
    "";
  if (!s || s.length < 16) throw new Error("SIGNED_URL_SECRET is not configured");
  return s;
}

const SAFE_NAME = /^[a-zA-Z0-9._-]+$/;

export function assertSafeName(name: string): void {
  if (!SAFE_NAME.test(name) || name.includes("..")) throw new Error("Nama file tidak valid");
}

export async function saveFile(name: string, bytes: Uint8Array): Promise<void> {
  assertSafeName(name);
  await mkdir(pengamananDir(), { recursive: true });
  await writeFile(join(pengamananDir(), name), bytes);
}

export async function readFileBytes(name: string): Promise<Uint8Array> {
  assertSafeName(name);
  const buf = await readFile(join(pengamananDir(), name));
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function buildSignedUrl(name: string, ttlSeconds = 600): string {
  assertSafeName(name);
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = sign(`${name}.${exp}`);
  return `/api/files/pengamanan/${encodeURIComponent(name)}?exp=${exp}&sig=${sig}`;
}

export function verifySignedUrl(name: string, exp: number, sig: string): boolean {
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  let expected: string;
  try {
    expected = sign(`${name}.${exp}`);
  } catch {
    return false;
  }
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

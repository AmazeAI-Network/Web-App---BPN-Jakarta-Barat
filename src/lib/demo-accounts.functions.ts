import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  clearSessionCookie,
  createSessionToken,
  getSession,
  requireAdmin,
  setSessionCookie,
} from "@/lib/session.server";

// All access to public.demo_accounts goes through these server functions.
// RLS denies all anon/authenticated access; supabaseAdmin bypasses RLS.
// Passwords are stored as bcrypt hashes and NEVER returned to the client.
// Admin endpoints require an HMAC-signed session cookie with role=admin.

export type UserRole = "admin" | "petugas_loket" | "verifikator";

export type DemoUserPublic = {
  id: string;
  username: string;
  name: string;
  nip: string;
  email: string;
  unitKerja: string;
  role: UserRole;
  roleLabel: string;
  active: boolean;
  lastLogin: string | null;
};

const SAFE_COLUMNS =
  "id,username,name,nip,email,unit_kerja,role,role_label,active,last_login";

type DbRow = {
  id: string;
  username: string;
  name: string;
  nip: string;
  email: string;
  unit_kerja: string;
  role: UserRole;
  role_label: string;
  active: boolean;
  last_login: string | null;
};

function rowToPublic(r: DbRow): DemoUserPublic {
  return {
    id: r.id,
    username: r.username,
    name: r.name,
    nip: r.nip,
    email: r.email,
    unitKerja: r.unit_kerja,
    role: r.role,
    roleLabel: r.role_label,
    active: r.active,
    lastLogin: r.last_login,
  };
}

const BCRYPT_COST = 10;
function isBcryptHash(s: string): boolean {
  return /^\$2[aby]\$\d{2}\$/.test(s);
}
async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  if (isBcryptHash(stored)) return bcrypt.compare(plain, stored);
  // Legacy plaintext fallback (will be upgraded on next successful login)
  return stored === plain;
}

// ---------- Login / Session ----------

export const verifyDemoLogin = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        username: z.string().trim().min(1).max(100).toLowerCase(),
        password: z.string().min(1).max(200),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("demo_accounts")
      .select(SAFE_COLUMNS + ",password")
      .eq("username", data.username)
      .maybeSingle();

    if (error) throw new Error("Tidak dapat memverifikasi akun. Coba lagi.");
    const account = row as (DbRow & { password: string }) | null;
    if (!account || !account.active) {
      throw new Error("Username atau password salah");
    }
    const ok = await verifyPassword(data.password, account.password);
    if (!ok) throw new Error("Username atau password salah");

    // Opportunistic upgrade of legacy plaintext to bcrypt
    if (!isBcryptHash(account.password)) {
      const hash = await bcrypt.hash(data.password, BCRYPT_COST);
      await supabaseAdmin
        .from("demo_accounts")
        .update({ password: hash })
        .eq("id", account.id);
    }

    await supabaseAdmin
      .from("demo_accounts")
      .update({ last_login: new Date().toISOString() })
      .eq("id", account.id);

    // Issue signed session cookie
    const token = createSessionToken({
      uid: account.id,
      username: account.username,
      role: account.role,
    });
    setSessionCookie(token);

    const { password: _pw, ...rest } = account;
    return rowToPublic(rest as DbRow);
  });

export const logoutDemoSession = createServerFn({ method: "POST" }).handler(
  async () => {
    clearSessionCookie();
    return { ok: true as const };
  },
);

export const getCurrentSession = createServerFn({ method: "GET" }).handler(
  async () => {
    const s = getSession();
    if (!s) return { authenticated: false as const };
    return {
      authenticated: true as const,
      username: s.username,
      role: s.role,
    };
  },
);

// ---------- Admin CRUD (admin-only) ----------

export const listDemoAccounts = createServerFn({ method: "GET" }).handler(
  async () => {
    requireAdmin();
    const { data, error } = await supabaseAdmin
      .from("demo_accounts")
      .select(SAFE_COLUMNS)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return ((data as DbRow[]) ?? []).map(rowToPublic);
  },
);

const writeSchema = z.object({
  id: z.string().uuid().optional(),
  username: z.string().trim().min(1).max(100).toLowerCase(),
  name: z.string().trim().min(1).max(200),
  nip: z.string().trim().max(50).default(""),
  email: z.string().trim().email().max(255),
  unitKerja: z.string().trim().max(200).default(""),
  role: z.enum(["admin", "petugas_loket", "verifikator"]),
  active: z.boolean().default(true),
  password: z.string().min(1).max(200).optional(),
});

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Administrator",
  verifikator: "Informasi",
  petugas_loket: "Petugas Loket",
};

export const upsertDemoAccount = createServerFn({ method: "POST" })
  .inputValidator((input) => writeSchema.parse(input))
  .handler(async ({ data }) => {
    requireAdmin();
    const payload: Record<string, unknown> = {
      username: data.username,
      name: data.name,
      nip: data.nip,
      email: data.email,
      unit_kerja: data.unitKerja,
      role: data.role,
      role_label: ROLE_LABEL[data.role],
      active: data.active,
    };
    if (data.password) {
      payload.password = await bcrypt.hash(data.password, BCRYPT_COST);
    }

    if (data.id) {
      const { error } = await supabaseAdmin
        .from("demo_accounts")
        .update(payload as never)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true as const, id: data.id };
    }
    if (!data.password) throw new Error("Password wajib diisi untuk user baru");
    const { data: inserted, error } = await supabaseAdmin
      .from("demo_accounts")
      .insert([payload as never])
      .select("id")
      .single();
    if (error) {
      throw new Error(
        error.message.includes("duplicate") ? "Username sudah dipakai" : error.message,
      );
    }
    return { ok: true as const, id: (inserted as { id: string }).id };
  });

export const deleteDemoAccount = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    requireAdmin();
    const { error } = await supabaseAdmin
      .from("demo_accounts")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const setDemoAccountActive = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), active: z.boolean() }).parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin();
    const { error } = await supabaseAdmin
      .from("demo_accounts")
      .update({ active: data.active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const resetDemoAccountPassword = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        newPassword: z.string().min(6).max(200).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin();
    const newPassword = data.newPassword ?? generateTempPassword();
    const hash = await bcrypt.hash(newPassword, BCRYPT_COST);
    const { error } = await supabaseAdmin
      .from("demo_accounts")
      .update({ password: hash })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    // Returned once so the admin can communicate it; not logged server-side.
    return { ok: true as const, newPassword };
  });

function generateTempPassword(): string {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

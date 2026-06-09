// User/session management. Backed by MySQL `demo_accounts`. Passwords are
// bcrypt-hashed; sessions use an HMAC-signed HttpOnly cookie (see
// src/lib/session.server.ts).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import bcrypt from "bcryptjs";
import {
  clearSessionCookie,
  createSessionToken,
  getSession,
  requireAdmin,
  setSessionCookie,
} from "@/lib/session.server";

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
  "id, username, name, nip, email, unit_kerja, role, role_label, active, last_login";

type DbRow = {
  id: string;
  username: string;
  name: string;
  nip: string;
  email: string;
  unit_kerja: string;
  role: UserRole;
  role_label: string;
  active: number | boolean;
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
    active: Boolean(r.active),
    lastLogin: r.last_login,
  };
}

const BCRYPT_COST = 10;
function isBcryptHash(s: string): boolean {
  return /^\$2[aby]\$\d{2}\$/.test(s);
}
async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  if (isBcryptHash(stored)) return bcrypt.compare(plain, stored);
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
    const { q, exec } = await import("@/server/db.server");
    const rows = await q<DbRow & { password: string }>(
      `SELECT ${SAFE_COLUMNS}, password FROM demo_accounts WHERE username=? LIMIT 1`,
      [data.username],
    );
    const account = rows[0];
    if (!account || !account.active) {
      throw new Error("Username atau password salah");
    }
    const ok = await verifyPassword(data.password, account.password);
    if (!ok) throw new Error("Username atau password salah");

    if (!isBcryptHash(account.password)) {
      const hash = await bcrypt.hash(data.password, BCRYPT_COST);
      await exec(`UPDATE demo_accounts SET password=? WHERE id=?`, [hash, account.id]);
    }
    await exec(`UPDATE demo_accounts SET last_login=NOW(3) WHERE id=?`, [account.id]);

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
    return { authenticated: true as const, username: s.username, role: s.role };
  },
);

// ---------- Admin CRUD (admin-only) ----------

export const listDemoAccounts = createServerFn({ method: "GET" }).handler(async () => {
  requireAdmin();
  const { q } = await import("@/server/db.server");
  const rows = await q<DbRow>(
    `SELECT ${SAFE_COLUMNS} FROM demo_accounts ORDER BY created_at DESC`,
  );
  return rows.map(rowToPublic);
});

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
  verifikator: "Verifikator",
  petugas_loket: "Petugas Loket",
};

export const upsertDemoAccount = createServerFn({ method: "POST" })
  .inputValidator((input) => writeSchema.parse(input))
  .handler(async ({ data }) => {
    requireAdmin();
    const { exec, newUuid } = await import("@/server/db.server");
    const passwordHash = data.password
      ? await bcrypt.hash(data.password, BCRYPT_COST)
      : undefined;

    if (data.id) {
      const fields = [
        "username=?","name=?","nip=?","email=?","unit_kerja=?",
        "role=?","role_label=?","active=?",
      ];
      const params: unknown[] = [
        data.username, data.name, data.nip, data.email, data.unitKerja,
        data.role, ROLE_LABEL[data.role], data.active ? 1 : 0,
      ];
      if (passwordHash) {
        fields.push("password=?");
        params.push(passwordHash);
      }
      params.push(data.id);
      await exec(`UPDATE demo_accounts SET ${fields.join(",")} WHERE id=?`, params);
      return { ok: true as const, id: data.id };
    }
    if (!passwordHash) throw new Error("Password wajib diisi untuk user baru");
    const id = newUuid();
    try {
      await exec(
        `INSERT INTO demo_accounts
         (id, username, password, name, nip, email, unit_kerja, role, role_label, active)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [
          id, data.username, passwordHash, data.name, data.nip, data.email,
          data.unitKerja, data.role, ROLE_LABEL[data.role], data.active ? 1 : 0,
        ],
      );
    } catch (e) {
      const msg = (e as { message?: string })?.message ?? "";
      if (/duplicate/i.test(msg)) throw new Error("Username sudah dipakai");
      throw e;
    }
    return { ok: true as const, id };
  });

export const deleteDemoAccount = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    requireAdmin();
    const { exec } = await import("@/server/db.server");
    await exec(`DELETE FROM demo_accounts WHERE id=?`, [data.id]);
    return { ok: true as const };
  });

export const setDemoAccountActive = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), active: z.boolean() }).parse(input),
  )
  .handler(async ({ data }) => {
    requireAdmin();
    const { exec } = await import("@/server/db.server");
    await exec(`UPDATE demo_accounts SET active=? WHERE id=?`, [data.active ? 1 : 0, data.id]);
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
    const { exec } = await import("@/server/db.server");
    const newPassword = data.newPassword ?? generateTempPassword();
    const hash = await bcrypt.hash(newPassword, BCRYPT_COST);
    await exec(`UPDATE demo_accounts SET password=? WHERE id=?`, [hash, data.id]);
    return { ok: true as const, newPassword };
  });

function generateTempPassword(): string {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

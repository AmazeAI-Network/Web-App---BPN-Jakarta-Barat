// Data-access server functions (MySQL). All access to peminjaman / peminjam /
// kegiatan goes through these handlers, which validate the HMAC session cookie
// before touching the database.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin, requireSession } from "@/lib/session.server";

// ---------------- Peminjaman ----------------

const PeminjamanInsertSchema = z.object({
  no_register: z.string().min(1).max(64),
  peminjam: z.string().min(1).max(255),
  email: z.string().email().max(255).nullable().optional(),
  kegiatan: z.string().min(1).max(255),
  no_hak: z.string().max(64),
  jenis_hak: z.string().max(64),
  desa: z.string().max(128).nullable().optional(),
  kecamatan: z.string().max(128).nullable().optional(),
  no_su: z.string().max(64).nullable().optional(),
  no_warkah: z.string().max(64).nullable().optional(),
  no_ht: z.string().max(64).nullable().optional(),
  jenis_peminjaman: z.string().max(64).nullable().optional(),
  file_pengamanan_url: z.string().max(512).nullable().optional(),
  status: z.string().min(1).max(64),
  tipe: z.enum(["register", "pengamanan"]),
  created_by: z.string().max(128).nullable().optional(),
  catatan: z.string().max(2000).nullable().optional(),
});

export const listPeminjaman = createServerFn({ method: "GET" }).handler(async () => {
  requireSession();
  const { q } = await import("@/server/db.server");
  return q(
    `SELECT * FROM peminjaman ORDER BY tgl_pengajuan DESC`,
  );
});

export const insertPeminjaman = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ rows: z.array(PeminjamanInsertSchema).min(1).max(50) }).parse(input),
  )
  .handler(async ({ data }) => {
    const session = requireSession();
    const { exec, newUuid } = await import("@/server/db.server");
    const cols = [
      "id","no_register","peminjam","email","kegiatan","no_hak","jenis_hak",
      "desa","kecamatan","no_su","no_warkah","no_ht","jenis_peminjaman",
      "file_pengamanan_url","status","tipe","created_by","catatan",
    ];
    const placeholders = "(" + cols.map(() => "?").join(",") + ")";
    const values: unknown[] = [];
    for (const r of data.rows) {
      values.push(
        newUuid(), r.no_register, r.peminjam, r.email ?? null, r.kegiatan,
        r.no_hak, r.jenis_hak, r.desa ?? null, r.kecamatan ?? null,
        r.no_su ?? null, r.no_warkah ?? null, r.no_ht ?? null,
        r.jenis_peminjaman ?? null, r.file_pengamanan_url ?? null,
        r.status, r.tipe, session.username, r.catatan ?? null,
      );
    }
    const sql =
      `INSERT INTO peminjaman (${cols.join(",")}) VALUES ` +
      data.rows.map(() => placeholders).join(",");
    await exec(sql, values);
    return { ok: true as const, count: data.rows.length };
  });

const UpdateStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.string().min(1).max(64),
  catatan: z.string().max(2000).nullable().optional(),
  dikonfirmasi_oleh: z.string().max(128).optional(),
});

export const updatePeminjamanStatus = createServerFn({ method: "POST" })
  .inputValidator((input) => UpdateStatusSchema.parse(input))
  .handler(async ({ data }) => {
    requireSession();
    const { exec } = await import("@/server/db.server");
    const now = new Date();
    const nowIso = now.toISOString().slice(0, 19).replace("T", " ");
    if (data.dikonfirmasi_oleh) {
      await exec(
        `UPDATE peminjaman
         SET status=?, tgl_update=?, catatan=?, dikonfirmasi_oleh=?, tgl_konfirmasi=?
         WHERE id=?`,
        [data.status, nowIso, data.catatan ?? null, data.dikonfirmasi_oleh, nowIso, data.id],
      );
    } else {
      await exec(
        `UPDATE peminjaman SET status=?, tgl_update=?, catatan=? WHERE id=?`,
        [data.status, nowIso, data.catatan ?? null, data.id],
      );
    }
    return { ok: true as const, tgl_update: now.toISOString() };
  });

export const deletePeminjaman = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    requireAdmin();
    const { exec } = await import("@/server/db.server");
    await exec(`DELETE FROM peminjaman WHERE id=?`, [data.id]);
    return { ok: true as const };
  });

// ---------------- Kegiatan ----------------

const KegiatanWriteSchema = z.object({
  id: z.string().uuid().optional(),
  nama: z.string().trim().min(1).max(200),
  deskripsi: z.string().trim().max(1000).nullable().optional(),
  aktif: z.boolean().default(true),
});

export const listKegiatan = createServerFn({ method: "GET" }).handler(async () => {
  requireSession();
  const { q } = await import("@/server/db.server");
  return q(`SELECT id, nama, deskripsi, aktif FROM kegiatan ORDER BY nama`);
});

export const upsertKegiatan = createServerFn({ method: "POST" })
  .inputValidator((input) => KegiatanWriteSchema.parse(input))
  .handler(async ({ data }) => {
    requireAdmin();
    const { exec, newUuid } = await import("@/server/db.server");
    if (data.id) {
      await exec(
        `UPDATE kegiatan SET nama=?, deskripsi=?, aktif=? WHERE id=?`,
        [data.nama, data.deskripsi ?? null, data.aktif ? 1 : 0, data.id],
      );
      return { ok: true as const, id: data.id };
    }
    const id = newUuid();
    await exec(
      `INSERT INTO kegiatan (id, nama, deskripsi, aktif) VALUES (?,?,?,?)`,
      [id, data.nama, data.deskripsi ?? null, data.aktif ? 1 : 0],
    );
    return { ok: true as const, id };
  });

export const deleteKegiatan = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    requireAdmin();
    const { exec } = await import("@/server/db.server");
    await exec(`DELETE FROM kegiatan WHERE id=?`, [data.id]);
    return { ok: true as const };
  });

// ---------------- Peminjam (master) ----------------

const PeminjamWriteSchema = z.object({
  id: z.string().uuid().optional(),
  kode: z.string().trim().min(1).max(64),
  nama: z.string().trim().min(1).max(200),
  jenis: z.string().trim().max(64),
  email: z.string().trim().email().max(255).nullable().optional(),
  telepon: z.string().trim().max(64).nullable().optional(),
  aktif: z.boolean().default(true),
});

export const listPeminjamMaster = createServerFn({ method: "GET" }).handler(async () => {
  requireSession();
  const { q } = await import("@/server/db.server");
  return q(
    `SELECT id, kode, nama, jenis, email, telepon, aktif FROM peminjam ORDER BY kode`,
  );
});

export const upsertPeminjamMaster = createServerFn({ method: "POST" })
  .inputValidator((input) => PeminjamWriteSchema.parse(input))
  .handler(async ({ data }) => {
    requireAdmin();
    const { exec, newUuid } = await import("@/server/db.server");
    const kode = data.kode.toUpperCase();
    if (data.id) {
      await exec(
        `UPDATE peminjam SET kode=?, nama=?, jenis=?, email=?, telepon=?, aktif=? WHERE id=?`,
        [kode, data.nama, data.jenis, data.email ?? null, data.telepon ?? null, data.aktif ? 1 : 0, data.id],
      );
      return { ok: true as const, id: data.id };
    }
    const id = newUuid();
    await exec(
      `INSERT INTO peminjam (id, kode, nama, jenis, email, telepon, aktif) VALUES (?,?,?,?,?,?,?)`,
      [id, kode, data.nama, data.jenis, data.email ?? null, data.telepon ?? null, data.aktif ? 1 : 0],
    );
    return { ok: true as const, id };
  });

export const deletePeminjamMaster = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    requireAdmin();
    const { exec } = await import("@/server/db.server");
    await exec(`DELETE FROM peminjam WHERE id=?`, [data.id]);
    return { ok: true as const };
  });

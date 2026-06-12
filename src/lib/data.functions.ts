// Guarded data-access server functions. The browser no longer talks to the
// peminjaman / peminjam / kegiatan tables directly — every read and write
// goes through these handlers, which validate the HMAC session cookie before
// using the service-role Supabase client.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
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
  file_pengamanan_url: z
    .string()
    .max(512)
    .regex(
      /^https?:\/\/[^/]+\/storage\/v1\/object\/(public|sign)\/pengamanan-files\/[a-zA-Z0-9._\-\/?=&%]+$/,
      "URL file pengamanan tidak valid",
    )
    .nullable()
    .optional(),
  status: z.string().min(1).max(64),
  tipe: z.enum(["register", "pengamanan"]),
  created_by: z.string().max(128).nullable().optional(),
  catatan: z.string().max(2000).nullable().optional(),
});

export const listPeminjaman = createServerFn({ method: "GET" }).handler(
  async () => {
    requireSession();
    const { data, error } = await supabaseAdmin
      .from("peminjaman")
      .select("*")
      .order("tgl_pengajuan", { ascending: false });
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Array<Record<string, unknown>>;
    // Attach created_by_role via demo_accounts lookup so the UI can route
    // admin-registered peminjaman to the admin-only pengembalian menu.
    const usernames = Array.from(
      new Set(rows.map((r) => r.created_by).filter((v): v is string => !!v)),
    );
    const roleMap = new Map<string, string>();
    if (usernames.length) {
      const { data: accounts } = await supabaseAdmin
        .from("demo_accounts")
        .select("username,role")
        .in("username", usernames);
      for (const a of (accounts ?? []) as Array<{ username: string; role: string }>) {
        roleMap.set(a.username, a.role);
      }
    }
    return rows.map((r) => ({
      ...r,
      created_by_role:
        typeof r.created_by === "string" ? (roleMap.get(r.created_by) ?? null) : null,
    }));
  },
);

export const insertPeminjaman = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ rows: z.array(PeminjamanInsertSchema).min(1).max(50) }).parse(input),
  )
  .handler(async ({ data }) => {
    const session = requireSession();
    // Stamp created_by from the trusted session, ignore any client value.
    const rows = data.rows.map((r) => ({ ...r, created_by: session.username }));
    const { error } = await supabaseAdmin.from("peminjaman").insert(rows as never);
    if (error) throw new Error(error.message);
    return { ok: true as const, count: rows.length };
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
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = {
      status: data.status,
      tgl_update: now,
      catatan: data.catatan ?? null,
    };
    if (data.dikonfirmasi_oleh) {
      patch.dikonfirmasi_oleh = data.dikonfirmasi_oleh;
      patch.tgl_konfirmasi = now;
    }
    const { error } = await supabaseAdmin
      .from("peminjaman")
      .update(patch as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const, tgl_update: now };
  });

export const deletePeminjaman = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    requireAdmin();
    const { error } = await supabaseAdmin
      .from("peminjaman")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ---------------- Kegiatan ----------------

const KegiatanWriteSchema = z.object({
  id: z.string().uuid().optional(),
  nama: z.string().trim().min(1).max(200),
  deskripsi: z.string().trim().max(1000).nullable().optional(),
  aktif: z.boolean().default(true),
});

export const listKegiatan = createServerFn({ method: "GET" }).handler(
  async () => {
    requireSession();
    const { data, error } = await supabaseAdmin
      .from("kegiatan")
      .select("id,nama,deskripsi,aktif")
      .order("nama");
    if (error) throw new Error(error.message);
    return data ?? [];
  },
);

export const upsertKegiatan = createServerFn({ method: "POST" })
  .inputValidator((input) => KegiatanWriteSchema.parse(input))
  .handler(async ({ data }) => {
    requireAdmin();
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("kegiatan")
        .update({
          nama: data.nama,
          deskripsi: data.deskripsi ?? null,
          aktif: data.aktif,
        } as never)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true as const, id: data.id };
    }
    const { data: inserted, error } = await supabaseAdmin
      .from("kegiatan")
      .insert([
        {
          nama: data.nama,
          deskripsi: data.deskripsi ?? null,
          aktif: data.aktif,
        } as never,
      ])
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true as const, id: (inserted as { id: string }).id };
  });

export const deleteKegiatan = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    requireAdmin();
    const { error } = await supabaseAdmin
      .from("kegiatan")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
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

export const listPeminjamMaster = createServerFn({ method: "GET" }).handler(
  async () => {
    requireSession();
    const { data, error } = await supabaseAdmin
      .from("peminjam")
      .select("id,kode,nama,jenis,email,telepon,aktif")
      .order("kode");
    if (error) throw new Error(error.message);
    return data ?? [];
  },
);

export const upsertPeminjamMaster = createServerFn({ method: "POST" })
  .inputValidator((input) => PeminjamWriteSchema.parse(input))
  .handler(async ({ data }) => {
    requireAdmin();
    const payload = {
      kode: data.kode.toUpperCase(),
      nama: data.nama,
      jenis: data.jenis,
      email: data.email ?? null,
      telepon: data.telepon ?? null,
      aktif: data.aktif,
    };
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("peminjam")
        .update(payload as never)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true as const, id: data.id };
    }
    const { data: inserted, error } = await supabaseAdmin
      .from("peminjam")
      .insert([payload as never])
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true as const, id: (inserted as { id: string }).id };
  });

export const deletePeminjamMaster = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    requireAdmin();
    const { error } = await supabaseAdmin
      .from("peminjam")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// Client-side data-access wrappers backed by the Laravel API.
import { api, unwrap } from "@/lib/api";

// ---------------- Peminjaman ----------------

export type PeminjamanRow = Record<string, unknown> & {
  id: string;
  created_by?: string | null;
  created_by_role?: string | null;
};

export async function listPeminjaman(): Promise<PeminjamanRow[]> {
  return api.get<PeminjamanRow[]>("/peminjaman");
}

type InsertInput = { rows: Array<Record<string, unknown>> };

export async function insertPeminjaman(
  input: { data: InsertInput } | InsertInput,
): Promise<{ ok: true; count: number }> {
  const data = unwrap<InsertInput>(input)!;
  const r = await api.post<{ count: number }>("/peminjaman", { rows: data.rows });
  return { ok: true, count: r.count };
}

type UpdateStatusInput = {
  id: string;
  status: string;
  catatan?: string | null;
  dikonfirmasi_oleh?: string;
};

export async function updatePeminjamanStatus(
  input: { data: UpdateStatusInput } | UpdateStatusInput,
): Promise<{ ok: true; tgl_update: string }> {
  const data = unwrap<UpdateStatusInput>(input)!;
  const r = await api.patch<{ tgl_update: string }>(
    `/peminjaman/${data.id}/status`,
    {
      status: data.status,
      catatan: data.catatan ?? null,
      dikonfirmasi_oleh: data.dikonfirmasi_oleh,
    },
  );
  return { ok: true, tgl_update: r.tgl_update };
}

export async function deletePeminjaman(
  input: { data: { id: string } } | { id: string },
): Promise<{ ok: true }> {
  const { id } = unwrap<{ id: string }>(input)!;
  await api.del(`/peminjaman/${id}`);
  return { ok: true };
}

// ---------------- Kegiatan ----------------

export type KegiatanRow = {
  id: string;
  nama: string;
  deskripsi: string | null;
  aktif: boolean;
};

type KegiatanWrite = {
  id?: string;
  nama: string;
  deskripsi?: string | null;
  aktif?: boolean;
};

export async function listKegiatan(): Promise<KegiatanRow[]> {
  return api.get<KegiatanRow[]>("/kegiatan");
}

export async function upsertKegiatan(
  input: { data: KegiatanWrite } | KegiatanWrite,
): Promise<{ ok: true; id: string }> {
  const data = unwrap<KegiatanWrite>(input)!;
  if (data.id) {
    const r = await api.put<{ id: string }>(`/kegiatan/${data.id}`, data);
    return { ok: true, id: r.id };
  }
  const r = await api.post<{ id: string }>("/kegiatan", data);
  return { ok: true, id: r.id };
}

export async function deleteKegiatan(
  input: { data: { id: string } } | { id: string },
): Promise<{ ok: true }> {
  const { id } = unwrap<{ id: string }>(input)!;
  await api.del(`/kegiatan/${id}`);
  return { ok: true };
}

// ---------------- Peminjam (master) ----------------

export type PeminjamRow = {
  id: string;
  kode: string;
  nama: string;
  jenis: string;
  email: string | null;
  telepon: string | null;
  aktif: boolean;
};

type PeminjamWrite = {
  id?: string;
  kode: string;
  nama: string;
  jenis: string;
  email?: string | null;
  telepon?: string | null;
  aktif?: boolean;
};

export async function listPeminjamMaster(): Promise<PeminjamRow[]> {
  return api.get<PeminjamRow[]>("/peminjam");
}

export async function upsertPeminjamMaster(
  input: { data: PeminjamWrite } | PeminjamWrite,
): Promise<{ ok: true; id: string }> {
  const data = unwrap<PeminjamWrite>(input)!;
  if (data.id) {
    const r = await api.put<{ id: string }>(`/peminjam/${data.id}`, data);
    return { ok: true, id: r.id };
  }
  const r = await api.post<{ id: string }>("/peminjam", data);
  return { ok: true, id: r.id };
}

export async function deletePeminjamMaster(
  input: { data: { id: string } } | { id: string },
): Promise<{ ok: true }> {
  const { id } = unwrap<{ id: string }>(input)!;
  await api.del(`/peminjam/${id}`);
  return { ok: true };
}

import { useEffect, useState, useCallback } from "react";
import { listKegiatan, listPeminjamMaster } from "@/lib/data.functions";

export type Kegiatan = {
  id: string;
  nama: string;
  deskripsi: string | null;
  aktif: boolean;
};

export type Peminjam = {
  id: string;
  kode: string;
  nama: string;
  jenis: string;
  email: string | null;
  telepon: string | null;
  aktif: boolean;
};

export function useKegiatan() {
  const [items, setItems] = useState<Kegiatan[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await listKegiatan();
      setItems((data as Kegiatan[]) ?? []);
    } catch {
      // ignore — UI handles empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { items, loading, refresh };
}

export function usePeminjamMaster() {
  const [items, setItems] = useState<Peminjam[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await listPeminjamMaster();
      setItems((data as Peminjam[]) ?? []);
    } catch {
      // ignore — UI handles empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { items, loading, refresh };
}

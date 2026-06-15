import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { listPeminjaman, updatePeminjamanStatus } from "@/lib/data.functions";
import { sendStatusEmail } from "./email";
import { useAuth } from "@/lib/auth";

export type StatusPeminjaman =
  | "Proses Pencarian"
  | "Siap Diserahkan"
  | "Sedang Dipinjam"
  | "Proses Dikembalikan"
  | "Sudah Dikembalikan"
  | "Pengembalian Diterima"
  | "Diamankan"
  | "Dikembalikan";

export const STATUS_LIST: StatusPeminjaman[] = [
  "Proses Pencarian",
  "Siap Diserahkan",
  "Sedang Dipinjam",
  "Proses Dikembalikan",
  "Sudah Dikembalikan",
  "Pengembalian Diterima",
];

// Label tampilan ringkas untuk Monitoring Peminjaman
export const STATUS_LABEL: Record<StatusPeminjaman, string> = {
  "Proses Pencarian": "Proses",
  "Siap Diserahkan": "Siap Diserahkan",
  "Sedang Dipinjam": "Dipinjam",
  "Proses Dikembalikan": "Proses Dikembalikan",
  "Sudah Dikembalikan": "Sudah Dikembalikan",
  "Pengembalian Diterima": "Pengembalian Diterima",
  "Diamankan": "Diamankan",
  "Dikembalikan": "Dikembalikan",
};

// Status khusus untuk jalur Pengamanan
export const STATUS_PENGAMANAN: StatusPeminjaman[] = ["Diamankan", "Dikembalikan"];

export type TipePeminjaman = "register" | "pengamanan";

export type Peminjaman = {
  id: string;
  noRegister: string;
  peminjam: string;
  email: string;
  kegiatan: string;
  noHak: string;
  jenisHak: string;
  desa: string;
  kecamatan: string;
  noSu?: string;
  noWarkah?: string;
  noHt?: string;
  jenisPeminjaman?: string;
  filePengamananUrl?: string;

  status: StatusPeminjaman;
  tipe: TipePeminjaman;
  createdBy?: string;
  createdByRole?: "admin" | "petugas_loket" | "verifikator" | "verifikasi";
  tglPengajuan: string;
  tglUpdate: string;
  catatan?: string;
  dikonfirmasiOleh?: string;
  tglKonfirmasi?: string;
};

type DbRow = {
  id: string;
  no_register: string;
  peminjam: string;
  email: string | null;
  kegiatan: string;
  no_hak: string;
  jenis_hak: string;
  desa: string | null;
  kecamatan: string | null;
  no_su: string | null;
  no_warkah: string | null;
  no_ht: string | null;
  jenis_peminjaman: string | null;
  file_pengamanan_url: string | null;
  status: string;
  tipe: string | null;
  created_by: string | null;
  created_by_role: string | null;
  catatan: string | null;
  tgl_pengajuan: string;
  tgl_update: string;
  dikonfirmasi_oleh: string | null;
  tgl_konfirmasi: string | null;
};

function rowToPeminjaman(r: DbRow): Peminjaman {
  return {
    id: r.id,
    noRegister: r.no_register,
    peminjam: r.peminjam,
    email: r.email ?? "",
    kegiatan: r.kegiatan,
    noHak: r.no_hak,
    jenisHak: r.jenis_hak,
    desa: r.desa ?? "",
    kecamatan: r.kecamatan ?? "",
    noSu: r.no_su ?? undefined,
    noWarkah: r.no_warkah ?? undefined,
    noHt: r.no_ht ?? undefined,
    jenisPeminjaman: r.jenis_peminjaman ?? undefined,
    filePengamananUrl: r.file_pengamanan_url ?? undefined,
    status: r.status as StatusPeminjaman,
    tipe: (r.tipe as TipePeminjaman) ?? "register",
    createdBy: r.created_by ?? undefined,
    createdByRole: (r.created_by_role as Peminjaman["createdByRole"]) ?? undefined,
    tglPengajuan: r.tgl_pengajuan,
    tglUpdate: r.tgl_update,
    catatan: r.catatan ?? undefined,
    dikonfirmasiOleh: r.dikonfirmasi_oleh ?? undefined,
    tglKonfirmasi: r.tgl_konfirmasi ?? undefined,
  };
}

type Notif = {
  id: string;
  title: string;
  body: string;
  ts: string;
  read: boolean;
  peminjamanId?: string;
};

type Ctx = {
  items: Peminjaman[];
  loading: boolean;
  notifs: Notif[];
  unreadCount: number;
  changeStatus: (
    id: string,
    next: StatusPeminjaman,
    catatan?: string,
    confirmedBy?: string,
  ) => Promise<void>;
  refresh: () => Promise<void>;
  markAllRead: () => void;
  requestNotificationPermission: () => Promise<NotificationPermission>;
  notifPermission: NotificationPermission | "unsupported";
};

const PeminjamanCtx = createContext<Ctx | null>(null);
const NOTIF_KEY = "bpn_notifs_v2";

function nowIso() {
  return new Date().toISOString();
}

/* ----- audio (synth ding via WebAudio) ----- */
function playDing() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const tone = (freq: number, start: number, dur: number, gain: number) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + start);
      g.gain.setValueAtTime(0, now + start);
      g.gain.linearRampToValueAtTime(gain, now + start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      osc.connect(g).connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur + 0.05);
    };
    tone(880, 0, 0.18, 0.18);
    tone(1320, 0.12, 0.22, 0.14);
    setTimeout(() => ctx.close().catch(() => {}), 700);
  } catch {
    // ignore
  }
}

export function PeminjamanProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Peminjaman[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifs, setNotifs] = useState<Notif[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(NOTIF_KEY);
      return raw ? (JSON.parse(raw) as Notif[]) : [];
    } catch {
      return [];
    }
  });
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">(
    "default"
  );
  const isFirstNotifRender = useRef(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) setNotifPermission("unsupported");
    else setNotifPermission(Notification.permission);
  }, []);

  useEffect(() => {
    if (isFirstNotifRender.current) {
      isFirstNotifRender.current = false;
      return;
    }
    try {
      window.localStorage.setItem(NOTIF_KEY, JSON.stringify(notifs.slice(0, 50)));
    } catch {
      // ignore
    }
  }, [notifs]);

  const { user, isReady } = useAuth();

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    try {
      const data = await listPeminjaman();
      setItems((data as DbRow[]).map(rowToPeminjaman));
    } catch (e) {
      console.error("Failed to load peminjaman", e);
      // Silent: avoid noisy toasts during the 5s polling loop / when signed out.
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isReady) return;
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    void refresh();
    // Polling tiap 5 detik supaya semua role tetap melihat update.
    const id = setInterval(() => void refresh(), 5000);
    return () => clearInterval(id);
  }, [refresh, user, isReady]);


  const requestNotificationPermission = useCallback(async () => {
    if (!("Notification" in window)) return "denied" as NotificationPermission;
    if (Notification.permission === "granted") {
      setNotifPermission("granted");
      return "granted";
    }
    const res = await Notification.requestPermission();
    setNotifPermission(res);
    return res;
  }, []);

  const pushBrowserNotification = useCallback((title: string, body: string) => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    try {
      const n = new Notification(title, {
        body,
        icon: "/favicon.png",
        badge: "/favicon.png",
        tag: "bpn-status-update",
        requireInteraction: false,
      });
      setTimeout(() => n.close(), 8000);
    } catch {
      // ignore
    }
  }, []);

  const changeStatus = useCallback(
    async (id: string, next: StatusPeminjaman, catatan?: string, confirmedBy?: string) => {
      const target = items.find((p) => p.id === id);
      if (!target) return;

      const nowTs = nowIso();
      try {
        await updatePeminjamanStatus({
          data: {
            id,
            status: next,
            catatan: catatan ?? null,
            ...(next === "Sedang Dipinjam" && confirmedBy
              ? { dikonfirmasi_oleh: confirmedBy }
              : {}),
          },
        });
      } catch (e) {
        toast.error("Gagal mengubah status", { description: (e as Error).message });
        return;
      }

      // Optimistic local update (realtime juga akan menyusul)
      setItems((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                status: next,
                tglUpdate: nowTs,
                catatan,
                ...(next === "Sedang Dipinjam" && confirmedBy
                  ? { dikonfirmasiOleh: confirmedBy, tglKonfirmasi: nowTs }
                  : {}),
              }
            : p,
        ),
      );

      const titleByStatus: Record<StatusPeminjaman, string> = {
        "Proses Pencarian": "Pencarian Data Peminjaman Dimulai",
        "Siap Diserahkan": "📬 Berkas Siap Diserahkan",
        "Sedang Dipinjam": "Berkas Sedang Dipinjam",
        "Proses Dikembalikan": "🔄 Proses Pengembalian Berkas",
        "Sudah Dikembalikan": "✅ Berkas Sudah Dikembalikan",
        "Pengembalian Diterima": "🗂️ Pengembalian Diterima & Diarsip",
        "Diamankan": "🛡️ Berkas Diamankan",
        "Dikembalikan": "✅ Berkas Dikembalikan",
      };
      const title = titleByStatus[next];
      const body = `${target.noRegister} — ${target.peminjam}`;

      // Kirim email notifikasi setiap perubahan status (fire & forget)
      if (target.email) {
        void sendStatusEmail({
          to: target.email,
          peminjam: target.peminjam,
          noRegister: target.noRegister,
          noHak: target.noHak,
          jenisHak: target.jenisHak,
          desa: target.desa,
          kecamatan: target.kecamatan,
          status: next,
          catatan,
        });
      }

      if (next === "Siap Diserahkan") {
        toast.success(title, {
          description: `${body}. Email pemberitahuan dikirim ke ${target.email}.`,
          duration: 8000,
        });
        playDing();
        pushBrowserNotification(title, `${body}\nSilakan diambil di loket.`);
      } else if (next === "Sudah Dikembalikan") {
        toast.success(title, { description: body, duration: 5000 });
        playDing();
        pushBrowserNotification(title, body);
      } else {
        toast(title, { description: body });
      }

      setNotifs((ns) => [
        {
          id: crypto.randomUUID(),
          title,
          body,
          ts: nowIso(),
          read: false,
          peminjamanId: id,
        },
        ...ns,
      ]);
    },
    [items, pushBrowserNotification]
  );

  const markAllRead = useCallback(() => {
    setNotifs((ns) => ns.map((n) => ({ ...n, read: true })));
  }, []);

  const unreadCount = useMemo(() => notifs.filter((n) => !n.read).length, [notifs]);

  return (
    <PeminjamanCtx.Provider
      value={{
        items,
        loading,
        notifs,
        unreadCount,
        changeStatus,
        refresh,
        markAllRead,
        requestNotificationPermission,
        notifPermission,
      }}
    >
      {children}
    </PeminjamanCtx.Provider>
  );
}

export function usePeminjaman() {
  const ctx = useContext(PeminjamanCtx);
  if (!ctx) throw new Error("usePeminjaman must be used within PeminjamanProvider");
  return ctx;
}

export function statusBadgeClasses(s: StatusPeminjaman) {
  switch (s) {
    case "Proses Pencarian":
      return "bg-warning/15 text-warning border border-warning/30";
    case "Siap Diserahkan":
      return "bg-info/15 text-info border border-info/30";
    case "Sedang Dipinjam":
      return "bg-primary/15 text-primary border border-primary/30";
    case "Proses Dikembalikan":
      return "bg-warning/15 text-warning border border-warning/30";
    case "Sudah Dikembalikan":
      return "bg-success/15 text-success border border-success/30";
    case "Pengembalian Diterima":
      return "bg-success/20 text-success border border-success/40";
    case "Diamankan":
      return "bg-primary/15 text-primary border border-primary/30";
    case "Dikembalikan":
      return "bg-success/15 text-success border border-success/30";
  }
}

export function nextStatusOf(s: StatusPeminjaman): StatusPeminjaman | null {
  const i = STATUS_LIST.indexOf(s);
  if (i < 0 || i === STATUS_LIST.length - 1) return null;
  return STATUS_LIST[i + 1];
}

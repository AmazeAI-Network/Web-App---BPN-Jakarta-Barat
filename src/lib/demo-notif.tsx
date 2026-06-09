import { toast } from "sonner";
import { Bell, X } from "lucide-react";
import logoBpn from "@/assets/logo-bpn.png";
import type { UserRole } from "@/lib/auth";

const NOTIF_SOUND_URL = "/notif-sound.mp3";

let cachedAudio: HTMLAudioElement | null = null;
function playNotifSound() {
  try {
    if (typeof window === "undefined") return;
    if (!cachedAudio) {
      cachedAudio = new Audio(NOTIF_SOUND_URL);
      cachedAudio.preload = "auto";
      cachedAudio.volume = 0.85;
    }
    cachedAudio.currentTime = 0;
    void cachedAudio.play().catch(() => {
      // autoplay block — abaikan
    });
  } catch {
    // ignore
  }
}

type DemoNotifContent = {
  title: string;
  body: string;
  primaryLabel: string;
};

const NOTIF_BY_ROLE: Record<UserRole, DemoNotifContent[]> = {
  admin: [
    {
      title: "Pengajuan Baru Masuk",
      body: "1 berkas peminjaman warkah baru menunggu pengamanan.",
      primaryLabel: "Tinjau",
    },
    {
      title: "Konfirmasi Akhir Diperlukan",
      body: "Verifikator telah meneruskan berkas untuk konfirmasi akhir.",
      primaryLabel: "Periksa",
    },
  ],
  petugas_loket: [
    {
      title: "Berkas Siap Diserahkan",
      body: "Warkah No. Reg 2026/REG/0124 sudah siap di loket.",
      primaryLabel: "OK",
    },
    {
      title: "Pengembalian Diterima",
      body: "Peminjam telah mengembalikan berkas warkah.",
      primaryLabel: "Catat",
    },
  ],
  verifikator: [
    {
      title: "Berkas Menunggu Verifikasi",
      body: "1 berkas baru perlu diverifikasi keabsahannya.",
      primaryLabel: "Verifikasi",
    },
    {
      title: "Pengingat Antrian",
      body: "Masih ada 3 berkas dalam antrian verifikasi Anda.",
      primaryLabel: "Lihat",
    },
  ],
};

let counter = 0;
function pickContent(role: UserRole): DemoNotifContent {
  const list = NOTIF_BY_ROLE[role];
  const item = list[counter % list.length];
  counter += 1;
  return item;
}

export function triggerDemoNotification(role: UserRole) {
  const content = pickContent(role);
  playNotifSound();

  toast.custom(
    (t) => (
      <div className="relative w-[320px] overflow-visible rounded-2xl border border-amber-200/70 bg-[#fdf6e3] shadow-[0_10px_30px_-8px_rgba(0,0,0,0.25)]">
        {/* Bell + badge */}
        <div className="absolute -left-3 -top-3 flex items-center justify-center">
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white p-1 shadow-md">
              <img src={logoBpn} alt="BPN" className="h-full w-full object-contain" />
            </div>
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white shadow">
              !
            </span>
          </div>
        </div>

        {/* Close */}
        <button
          onClick={() => toast.dismiss(t)}
          className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600"
          aria-label="Tutup"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Body */}
        <div className="px-5 pb-3 pt-4 pl-16">
          <p className="text-base font-bold text-stone-800">{content.title}</p>
          <p className="mt-0.5 text-xs text-stone-600">{content.body}</p>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 border-t border-amber-200/70">
          <button
            onClick={() => toast.dismiss(t)}
            className="py-2.5 text-sm font-semibold text-emerald-700 hover:bg-amber-100/60 rounded-bl-2xl"
          >
            {content.primaryLabel}
          </button>
          <button
            onClick={() => toast.dismiss(t)}
            className="border-l border-amber-200/70 py-2.5 text-sm font-semibold text-red-600 hover:bg-amber-100/60 rounded-br-2xl"
          >
            Tutup
          </button>
        </div>
      </div>
    ),
    { duration: 8000, position: "bottom-right" }
  );
}

export const DemoNotifIcon = Bell;

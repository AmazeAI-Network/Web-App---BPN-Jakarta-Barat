import type { StatusPeminjaman } from "./peminjaman-store";

const STATUS_LABEL: Record<StatusPeminjaman, string> = {
  "Proses Pencarian": "sedang dicari di arsip",
  "Siap Diserahkan": "telah diverifikasi & menunggu konfirmasi",
  "Sedang Dipinjam": "sudah diambil / sedang dipinjam",
  "Proses Dikembalikan": "sedang dalam proses pengembalian oleh petugas loket",
  "Sudah Dikembalikan": "sudah dikembalikan ke arsip",
  "Pengembalian Diterima": "pengembalian telah diterima & diarsip",
  "Diamankan": "diamankan oleh petugas",
  "Dikembalikan": "telah dikembalikan",
};

export type EmailPayload = {
  to: string;
  peminjam: string;
  noRegister: string;
  noHak?: string;
  jenisHak?: string;
  desa?: string;
  kecamatan?: string;
  status: StatusPeminjaman;
  catatan?: string;
};

function buildHtml(p: EmailPayload) {
  const labelStatus = STATUS_LABEL[p.status] ?? p.status;
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#ffffff;color:#0f172a;padding:24px;max-width:560px;margin:auto;">
    <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
      <div style="background:#0f3a8a;color:#fff;padding:16px 20px;">
        <h2 style="margin:0;font-size:16px;letter-spacing:.3px;">BPN Jakarta Barat — Peminjaman Buku Tanah, Surat Ukur &amp; Warkah</h2>
      </div>
      <div style="padding:20px;">
        <p style="margin:0 0 12px;font-size:14px;">Halo <strong>${escape(p.peminjam)}</strong>,</p>
        <p style="margin:0 0 16px;font-size:14px;line-height:1.55;">
          Status pengajuan peminjaman Anda telah diperbarui menjadi
          <strong style="color:#0f3a8a;">${escape(p.status)}</strong> — ${escape(labelStatus)}.
        </p>
        <p style="margin:0 0 16px;font-size:14px;line-height:1.55;">
          Mohon untuk diambil di Ruang Arsip Kantah Administrasi Jakarta Barat.
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:13px;margin:12px 0 4px">
          <tbody>
            <tr><td style="padding:6px 0;color:#64748b;width:38%;">No. Register</td><td style="padding:6px 0;font-family:monospace;font-weight:bold;">${escape(p.noRegister)}</td></tr>
            ${p.noHak ? `<tr><td style="padding:6px 0;color:#64748b;">No. Hak</td><td style="padding:6px 0;font-family:monospace;">${escape(p.noHak)} ${p.jenisHak ? `(${escape(p.jenisHak)})` : ""}</td></tr>` : ""}
            ${p.desa || p.kecamatan ? `<tr><td style="padding:6px 0;color:#64748b;">Lokasi</td><td style="padding:6px 0;">${escape([p.desa, p.kecamatan].filter(Boolean).join(", "))}</td></tr>` : ""}
            ${p.catatan ? `<tr><td style="padding:6px 0;color:#64748b;vertical-align:top">Catatan</td><td style="padding:6px 0;">${escape(p.catatan)}</td></tr>` : ""}
          </tbody>
        </table>
        <p style="margin:18px 0 0;font-size:12px;color:#64748b;">
          Email ini dikirim otomatis oleh sistem. Jangan membalas email ini.
        </p>
      </div>
    </div>
  </div>`;
}

function escape(s: string) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function sendStatusEmail(p: EmailPayload): Promise<boolean> {
  if (!p.to || !p.to.includes("@")) return false;
  try {
    const r = await fetch("/api/public/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: p.to,
        subject: `[BPN Jakbar] ${p.status} — ${p.noRegister}`,
        html: buildHtml(p),
      }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

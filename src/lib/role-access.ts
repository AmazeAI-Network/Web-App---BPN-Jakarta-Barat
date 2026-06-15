import type { UserRole } from "@/lib/auth";

/** Maps each route prefix to the roles allowed to view it. */
export const ROUTE_ACCESS: { prefix: string; roles: UserRole[] }[] = [
  // Pengamanan: hanya admin
  { prefix: "/peminjaman/pengamanan", roles: ["admin"] },
  { prefix: "/monitoring/pengamanan", roles: ["admin"] },

  // Register: admin + petugas loket
  { prefix: "/peminjaman/register", roles: ["admin", "petugas_loket"] },

  // Peminjaman Informasi (layar monitor): admin + verifikator
  { prefix: "/peminjaman/informasi", roles: ["admin", "verifikator"] },

  // Verifikasi: verifikator + verifikasi + admin
  { prefix: "/peminjaman/verifikasi", roles: ["admin", "verifikator", "verifikasi"] },

  // Konfirmasi & Pengembalian: hanya admin
  { prefix: "/peminjaman/konfirmasi", roles: ["admin"] },
  { prefix: "/pengembalian/pengamanan", roles: ["admin"] },
  { prefix: "/pengembalian/admin", roles: ["admin"] },
  { prefix: "/pengembalian", roles: ["admin", "petugas_loket"] },

  // Monitoring Peminjaman (tabel inti): admin + petugas loket
  { prefix: "/monitoring", roles: ["admin", "petugas_loket"] },

  { prefix: "/admin", roles: ["admin"] },
  { prefix: "/master", roles: ["admin"] },
];

export function isRouteAllowed(pathname: string, role: UserRole): boolean {
  // Cocokkan prefix terpanjang lebih dulu agar /monitoring/pengamanan tidak ke-match /monitoring
  const sorted = [...ROUTE_ACCESS].sort((a, b) => b.prefix.length - a.prefix.length);
  const match = sorted.find((r) => pathname.startsWith(r.prefix));
  if (!match) return true;
  return match.roles.includes(role);
}

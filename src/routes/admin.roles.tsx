import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { UserCog, ShieldCheck, ClipboardCheck, FileEdit, Save, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type RoleKey = "admin" | "verifikator" | "petugas_loket";

type Permission = {
  key: string;
  label: string;
  description: string;
  group: string;
};

const PERMISSIONS: Permission[] = [
  { key: "peminjaman.input", label: "Input Peminjaman", description: "Membuat pengajuan peminjaman warkah", group: "Peminjaman" },
  { key: "peminjaman.serah", label: "Menyerahkan Berkas", description: "Menyerahkan berkas ke peminjam dari loket", group: "Peminjaman" },
  { key: "peminjaman.verifikasi", label: "Verifikasi Pengajuan", description: "Menerima atau menolak pengajuan", group: "Peminjaman" },
  { key: "peminjaman.konfirmasi", label: "Konfirmasi Akhir", description: "Persetujuan akhir oleh atasan", group: "Peminjaman" },
  { key: "pengembalian.verif", label: "Verifikasi Pengembalian", description: "Memverifikasi warkah yang dikembalikan", group: "Pengembalian" },
  { key: "pengamanan.keputusan", label: "Keputusan Pengamanan", description: "Memutuskan pengajuan bermasalah", group: "Pengamanan" },
  { key: "monitoring.view", label: "Lihat Monitoring", description: "Akses dashboard monitoring", group: "Monitoring" },
  { key: "users.manage", label: "Kelola Users", description: "CRUD akun pengguna", group: "Administrasi" },
  { key: "roles.manage", label: "Kelola Roles", description: "Atur hak akses peran", group: "Administrasi" },
  { key: "master.manage", label: "Kelola Master Data", description: "Master kegiatan & peminjam", group: "Administrasi" },
];

const ROLE_INFO: Record<
  RoleKey,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string; tone: string; ring: string; desc: string }
> = {
  admin: {
    label: "Administrator",
    icon: ShieldCheck,
    color: "border-primary/40",
    tone: "text-primary",
    ring: "bg-primary/10",
    desc: "Akses penuh ke semua fitur sistem.",
  },
  verifikator: {
    label: "Verifikator",
    icon: ClipboardCheck,
    color: "border-info/40",
    tone: "text-info",
    ring: "bg-info/10",
    desc: "Hanya menerima atau menolak pengajuan peminjaman.",
  },
  petugas_loket: {
    label: "Petugas Loket",
    icon: FileEdit,
    color: "border-success/40",
    tone: "text-success",
    ring: "bg-success/10",
    desc: "Menginput pengajuan dan menyerahkan berkas ke peminjam.",
  },
};

const DEFAULT_MATRIX: Record<RoleKey, Record<string, boolean>> = {
  admin: Object.fromEntries(PERMISSIONS.map((p) => [p.key, true])),
  verifikator: {
    "peminjaman.input": false,
    "peminjaman.serah": false,
    "peminjaman.verifikasi": true,
    "peminjaman.konfirmasi": false,
    "pengembalian.verif": false,
    "pengamanan.keputusan": false,
    "monitoring.view": true,
    "users.manage": false,
    "roles.manage": false,
    "master.manage": false,
  },
  petugas_loket: {
    "peminjaman.input": true,
    "peminjaman.serah": true,
    "peminjaman.verifikasi": false,
    "peminjaman.konfirmasi": false,
    "pengembalian.verif": false,
    "pengamanan.keputusan": false,
    "monitoring.view": true,
    "users.manage": false,
    "roles.manage": false,
    "master.manage": false,
  },
};

export const Route = createFileRoute("/admin/roles")({
  head: () => ({ meta: [{ title: "User Roles — BPN Jakarta Barat" }] }),
  component: RolesPage,
});

function RolesPage() {
  const [matrix, setMatrix] = useState(DEFAULT_MATRIX);
  const [active, setActive] = useState<RoleKey>("admin");
  const [search, setSearch] = useState("");

  const toggle = (perm: string) => {
    setMatrix((m) => ({
      ...m,
      [active]: { ...m[active], [perm]: !m[active][perm] },
    }));
  };

  const save = () => toast.success("Hak akses disimpan", { description: `Role ${ROLE_INFO[active].label} diperbarui.` });
  const reset = () => {
    setMatrix(DEFAULT_MATRIX);
    toast("Hak akses direset ke default");
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return PERMISSIONS;
    return PERMISSIONS.filter(
      (p) =>
        p.label.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.group.toLowerCase().includes(q)
    );
  }, [search]);

  const groups = Array.from(new Set(filtered.map((p) => p.group)));

  return (
    <AppShell title="User Roles" subtitle="Kelola peran dan hak akses pengguna sistem">
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {(Object.keys(ROLE_INFO) as RoleKey[]).map((k) => {
            const info = ROLE_INFO[k];
            const Icon = info.icon;
            const enabled = Object.values(matrix[k]).filter(Boolean).length;
            const isActive = active === k;
            return (
              <button
                key={k}
                onClick={() => setActive(k)}
                className={`rounded-xl border-2 bg-card p-5 text-left shadow-card transition-all hover:shadow-elegant ${
                  isActive ? `${info.color} ring-2 ring-primary/20` : "border-border"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className={`rounded-lg p-2.5 ${info.ring} ${info.tone}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {enabled}/{PERMISSIONS.length} izin
                  </Badge>
                </div>
                <p className="mt-3 text-base font-bold text-foreground">{info.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{info.desc}</p>
              </button>
            );
          })}
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <UserCog className="h-5 w-5 text-primary" />
                Hak Akses — {ROLE_INFO[active].label}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={reset}>Reset</Button>
                <Button size="sm" className="gap-1.5" onClick={save}>
                  <Save className="h-4 w-4" /> Simpan
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari hak akses..."
                className="pl-9"
              />
            </div>
            {groups.map((g) => (
              <div key={g}>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {g}
                </p>
                <div className="divide-y rounded-lg border">
                  {filtered.filter((p) => p.group === g).map((p) => (
                    <div key={p.key} className="flex items-center justify-between gap-4 p-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{p.label}</p>
                        <p className="text-xs text-muted-foreground">{p.description}</p>
                      </div>
                      <Switch
                        checked={!!matrix[active][p.key]}
                        onCheckedChange={() => toggle(p.key)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

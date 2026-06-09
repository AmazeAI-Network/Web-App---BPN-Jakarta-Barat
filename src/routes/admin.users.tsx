import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  UserPlus,
  Search,
  Pencil,
  Trash2,
  ShieldCheck,
  KeyRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  listDemoAccounts,
  upsertDemoAccount,
  deleteDemoAccount,
  setDemoAccountActive,
  resetDemoAccountPassword,
  type DemoUserPublic,
} from "@/lib/demo-accounts.functions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type RoleKey = "admin" | "verifikator" | "petugas_loket";

type AppUser = DemoUserPublic;

const ROLE_LABEL: Record<RoleKey, string> = {
  admin: "Administrator",
  verifikator: "Verifikator",
  petugas_loket: "Petugas Loket",
};

type FormState = {
  username: string;
  name: string;
  nip: string;
  email: string;
  unitKerja: string;
  role: RoleKey;
  active: boolean;
  password: string;
};

const emptyForm: FormState = {
  username: "",
  name: "",
  nip: "",
  email: "",
  unitKerja: "",
  role: "petugas_loket",
  active: true,
  password: "",
};

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "Users — BPN Jakarta Barat" }] }),
  component: UsersPage,
});

function UsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | RoleKey>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const reload = async () => {
    setLoading(true);
    try {
      const data = await listDemoAccounts();
      setUsers(data);
    } catch (e) {
      toast.error("Gagal memuat user", { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const filtered = useMemo(
    () =>
      users.filter(
        (u) =>
          (filter === "all" || u.role === filter) &&
          (!q ||
            u.name.toLowerCase().includes(q.toLowerCase()) ||
            u.username.toLowerCase().includes(q.toLowerCase()) ||
            u.email.toLowerCase().includes(q.toLowerCase()) ||
            u.nip.includes(q)),
      ),
    [users, q, filter],
  );

  const openNew = (role: RoleKey = "petugas_loket") => {
    setEditing(null);
    setForm({ ...emptyForm, role });
    setOpen(true);
  };

  const openEdit = (u: AppUser) => {
    setEditing(u);
    setForm({
      username: u.username,
      name: u.name,
      nip: u.nip,
      email: u.email,
      unitKerja: u.unitKerja,
      role: u.role,
      active: u.active,
      password: "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.username || !form.name || !form.email) {
      toast.error("Lengkapi field wajib (Username, Nama, Email)");
      return;
    }
    if (!editing && !form.password) {
      toast.error("Password wajib diisi untuk user baru");
      return;
    }
    setSaving(true);
    try {
      await upsertDemoAccount({
        data: {
          id: editing?.id,
          username: form.username.trim().toLowerCase(),
          name: form.name,
          nip: form.nip,
          email: form.email,
          unitKerja: form.unitKerja,
          role: form.role,
          active: form.active,
          password: form.password || undefined,
        },
      });
      toast.success(editing ? "User diperbarui" : "User dibuat");
      setOpen(false);
      await reload();
    } catch (e) {
      toast.error(editing ? "Gagal menyimpan" : "Gagal membuat user", {
        description: (e as Error).message,
      });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (u: AppUser) => {
    try {
      await deleteDemoAccount({ data: { id: u.id } });
      toast(`User "${u.username}" dihapus`);
      await reload();
    } catch (e) {
      toast.error("Gagal menghapus", { description: (e as Error).message });
    }
  };

  const toggleActive = async (u: AppUser) => {
    try {
      await setDemoAccountActive({ data: { id: u.id, active: !u.active } });
      toast(`Akun ${u.active ? "dinonaktifkan" : "diaktifkan"}`);
      await reload();
    } catch (e) {
      toast.error("Gagal mengubah status", { description: (e as Error).message });
    }
  };

  const resetPwd = async (u: AppUser) => {
    try {
      const res = await resetDemoAccountPassword({ data: { id: u.id } });
      toast.success("Password direset", {
        description: `Password baru untuk ${u.username}: ${res.newPassword}`,
      });
    } catch (e) {
      toast.error("Gagal reset password", { description: (e as Error).message });
    }
  };

  const roleColor = (r: RoleKey) =>
    r === "admin"
      ? "bg-primary/10 text-primary border-primary/30"
      : r === "verifikator"
        ? "bg-info/10 text-info border-info/30"
        : "bg-success/10 text-success border-success/30";

  return (
    <AppShell title="Users" subtitle="Manajemen akun pengguna sistem peminjaman warkah">
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {(["all", "admin", "verifikator", "petugas_loket"] as const).map((k) => {
            const count = k === "all" ? users.length : users.filter((u) => u.role === k).length;
            const label = k === "all" ? "Total Pengguna" : ROLE_LABEL[k];
            return (
              <Card key={k} className="shadow-card">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {label}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{count}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center justify-between gap-3 text-base">
              <span className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" /> Daftar Pengguna
              </span>
              <div className="flex items-center gap-2">
                <div className="relative w-56">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Cari nama, NIP, email..."
                    className="h-9 pl-8 text-sm"
                  />
                </div>
                <Select value={filter} onValueChange={(v: "all" | RoleKey) => setFilter(v)}>
                  <SelectTrigger className="h-9 w-40 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua role</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="verifikator">Verifikator</SelectItem>
                    <SelectItem value="petugas_loket">Petugas Loket</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => openNew("admin")}
                >
                  <ShieldCheck className="h-4 w-4" /> Tambah Admin
                </Button>
                <Button size="sm" className="gap-1.5" onClick={() => openNew()}>
                  <UserPlus className="h-4 w-4" /> Tambah User
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-y bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold">Nama / Username</th>
                    <th className="px-5 py-3 text-left font-semibold">NIP</th>
                    <th className="px-5 py-3 text-left font-semibold">Unit Kerja</th>
                    <th className="px-5 py-3 text-left font-semibold">Role</th>
                    <th className="px-5 py-3 text-left font-semibold">Status</th>
                    <th className="px-5 py-3 text-left font-semibold">Login Terakhir</th>
                    <th className="px-5 py-3 text-right font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loading && (
                    <tr><td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">Memuat...</td></tr>
                  )}
                  {!loading && filtered.length === 0 && (
                    <tr><td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">Tidak ada user</td></tr>
                  )}
                  {filtered.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/30">
                      <td className="px-5 py-3">
                        <p className="font-semibold">{u.name}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">@{u.username} · {u.email}</p>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs">{u.nip}</td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">{u.unitKerja}</td>
                      <td className="px-5 py-3">
                        <Badge variant="outline" className={roleColor(u.role)}>
                          {ROLE_LABEL[u.role]}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => toggleActive(u)}
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            u.active
                              ? "bg-success/10 text-success border border-success/30"
                              : "bg-muted text-muted-foreground border border-border"
                          }`}
                        >
                          {u.active ? "Aktif" : "Nonaktif"}
                        </button>
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">
                        {u.lastLogin ? new Date(u.lastLogin).toLocaleString("id-ID") : "—"}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => resetPwd(u)} title="Reset password">
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(u)} title="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => remove(u)} title="Hapus">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              {editing ? "Edit User" : "Tambah User Baru"}
            </DialogTitle>
            <DialogDescription>
              {editing ? "Kosongkan password jika tidak ingin diubah." : "Isi semua field untuk membuat akun baru."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Field2 label="Username *">
              <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </Field2>
            <Field2 label="NIP">
              <Input value={form.nip} onChange={(e) => setForm({ ...form, nip: e.target.value })} />
            </Field2>
            <div className="col-span-2">
              <Field2 label="Nama Lengkap *">
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field2>
            </div>
            <div className="col-span-2">
              <Field2 label="Email *">
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </Field2>
            </div>
            <div className="col-span-2">
              <Field2 label="Unit Kerja">
                <Input value={form.unitKerja} onChange={(e) => setForm({ ...form, unitKerja: e.target.value })} />
              </Field2>
            </div>
            <div className="col-span-2">
              <Field2 label={editing ? "Password (opsional)" : "Password *"}>
                <Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editing ? "Kosongkan jika tidak diubah" : ""} />
              </Field2>
            </div>
            <Field2 label="Role">
              <Select value={form.role} onValueChange={(v: RoleKey) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="verifikator">Verifikator</SelectItem>
                  <SelectItem value="petugas_loket">Petugas Loket</SelectItem>
                </SelectContent>
              </Select>
            </Field2>
            <Field2 label="Status">
              <Select value={form.active ? "1" : "0"} onValueChange={(v) => setForm({ ...form, active: v === "1" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Aktif</SelectItem>
                  <SelectItem value="0">Nonaktif</SelectItem>
                </SelectContent>
              </Select>
            </Field2>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>Batal</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Menyimpan..." : editing ? "Simpan Perubahan" : "Tambah"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Field2({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

// Client-side wrappers that call the Laravel backend.
// Names and call-site signatures preserved for compatibility with existing
// callers that use either `fn()` or `fn({ data: ... })`.
import { api, setToken, unwrap } from "@/lib/api";

export type UserRole = "admin" | "petugas_loket" | "verifikator" | "verifikasi";

export type DemoUserPublic = {
  id: string;
  username: string;
  name: string;
  nip: string;
  email: string;
  unitKerja: string;
  role: UserRole;
  roleLabel: string;
  active: boolean;
  lastLogin: string | null;
};

type LoginInput = { username: string; password: string };

export async function verifyDemoLogin(
  input: { data: LoginInput } | LoginInput,
): Promise<DemoUserPublic> {
  const data = unwrap<LoginInput>(input)!;
  const res = await api.post<{ token: string; user: DemoUserPublic }>(
    "/auth/login",
    { username: data.username.trim().toLowerCase(), password: data.password },
  );
  setToken(res.token);
  return res.user;
}

export async function logoutDemoSession(): Promise<{ ok: true }> {
  try {
    await api.post("/auth/logout");
  } catch {
    // ignore
  }
  setToken(null);
  return { ok: true };
}

export async function getCurrentSession(): Promise<
  | { authenticated: false }
  | { authenticated: true; username: string; role: UserRole }
> {
  const res = await api
    .get<{
      authenticated: boolean;
      username?: string;
      role?: UserRole;
    }>("/auth/me")
    .catch(() => null);
  if (!res || !res.authenticated || !res.username || !res.role) {
    return { authenticated: false };
  }
  return { authenticated: true, username: res.username, role: res.role };
}

// ---------- Admin CRUD ----------

export async function listDemoAccounts(): Promise<DemoUserPublic[]> {
  return api.get<DemoUserPublic[]>("/users");
}

type WriteAccountInput = {
  id?: string;
  username: string;
  name: string;
  nip?: string;
  email: string;
  unitKerja?: string;
  role: UserRole;
  active?: boolean;
  password?: string;
};

export async function upsertDemoAccount(
  input: { data: WriteAccountInput } | WriteAccountInput,
): Promise<{ ok: true; id: string }> {
  const data = unwrap<WriteAccountInput>(input)!;
  if (data.id) {
    const r = await api.put<{ id: string }>(`/users/${data.id}`, data);
    return { ok: true, id: r.id };
  }
  const r = await api.post<{ id: string }>("/users", data);
  return { ok: true, id: r.id };
}

export async function deleteDemoAccount(
  input: { data: { id: string } } | { id: string },
): Promise<{ ok: true }> {
  const { id } = unwrap<{ id: string }>(input)!;
  await api.del(`/users/${id}`);
  return { ok: true };
}

export async function setDemoAccountActive(
  input: { data: { id: string; active: boolean } } | { id: string; active: boolean },
): Promise<{ ok: true }> {
  const { id, active } = unwrap<{ id: string; active: boolean }>(input)!;
  await api.patch(`/users/${id}/active`, { active });
  return { ok: true };
}

export async function resetDemoAccountPassword(
  input:
    | { data: { id: string; newPassword?: string } }
    | { id: string; newPassword?: string },
): Promise<{ ok: true; newPassword: string }> {
  const { id, newPassword } = unwrap<{ id: string; newPassword?: string }>(input)!;
  const r = await api.post<{ newPassword: string }>(
    `/users/${id}/reset-password`,
    { newPassword },
  );
  return { ok: true, newPassword: r.newPassword };
}

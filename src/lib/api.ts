// Thin fetch wrapper to talk to the Laravel backend.
// Auth token is stored in localStorage (Sanctum personal access token).

const TOKEN_KEY = "bpn_api_token_v1";

export const API_BASE: string =
  (import.meta as unknown as { env: Record<string, string | undefined> }).env
    ?.VITE_API_URL ?? "/api";

export function getToken(): string | null {
  try {
    return typeof window !== "undefined"
      ? window.localStorage.getItem(TOKEN_KEY)
      : null;
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

type ReqInit = Omit<RequestInit, "body"> & {
  json?: unknown;
  body?: BodyInit | null;
};

async function request<T>(path: string, init: ReqInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  headers.set("Accept", "application/json");
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let body: BodyInit | null | undefined = init.body;
  if (init.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.json);
  }

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers, body });

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && (data as { message?: string }).message) ||
      (data && typeof data === "object" && firstValidationError(data)) ||
      `HTTP ${res.status}`;
    throw new Error(String(msg));
  }
  return data as T;
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

function firstValidationError(d: unknown): string | null {
  const errs = (d as { errors?: Record<string, string[]> }).errors;
  if (!errs) return null;
  for (const k in errs) {
    const v = errs[k];
    if (Array.isArray(v) && v.length) return v[0];
  }
  return null;
}

export const api = {
  get: <T>(p: string) => request<T>(p, { method: "GET" }),
  post: <T>(p: string, json?: unknown) => request<T>(p, { method: "POST", json }),
  put: <T>(p: string, json?: unknown) => request<T>(p, { method: "PUT", json }),
  patch: <T>(p: string, json?: unknown) => request<T>(p, { method: "PATCH", json }),
  del: <T>(p: string) => request<T>(p, { method: "DELETE" }),
};

// Helper for createServerFn-style call sites: fn({ data: X }) or fn()
export function unwrap<T>(input?: { data?: T } | T): T | undefined {
  if (input && typeof input === "object" && "data" in (input as object)) {
    return (input as { data?: T }).data;
  }
  return input as T | undefined;
}

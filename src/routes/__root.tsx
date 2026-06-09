import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth";
import { PeminjamanProvider } from "@/lib/peminjaman-store";

import appCss from "../styles.css?url";

// Auto-recovery untuk stale chunk (build baru sementara user masih buka tab lama).
// Tanpa ini, user lihat layar putih / aksi gagal saat klik tombol/route.
function useChunkErrorRecovery() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const RELOAD_KEY = "__chunk_reload_at";
    const isChunkErr = (msg: unknown) =>
      typeof msg === "string" &&
      (msg.includes("Failed to fetch dynamically imported module") ||
        msg.includes("Importing a module script failed") ||
        msg.includes("Loading chunk") ||
        msg.includes("ChunkLoadError"));

    const tryReload = () => {
      try {
        const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? "0");
        if (Date.now() - last < 10_000) return; // hindari loop reload
        sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
        window.location.reload();
      } catch {
        window.location.reload();
      }
    };

    const onError = (e: ErrorEvent) => {
      if (isChunkErr(e.message) || isChunkErr((e.error as Error | undefined)?.message)) {
        tryReload();
      }
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const msg =
        typeof e.reason === "string"
          ? e.reason
          : (e.reason as Error | undefined)?.message;
      if (isChunkErr(msg)) tryReload();
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Kantor Pertanahan Kota Administrasi Jakarta Barat" },
      { name: "description", content: "Sistem Informasi Peminjaman Warkah - Kantor Pertanahan Kota Administrasi Jakarta Barat" },
      { name: "author", content: "BPN Jakarta Barat" },
      { property: "og:title", content: "Kantor Pertanahan Kota Administrasi Jakarta Barat" },
      { property: "og:description", content: "Sistem Informasi Peminjaman Warkah - Kantor Pertanahan Kota Administrasi Jakarta Barat" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Kantor Pertanahan Kota Administrasi Jakarta Barat" },
      { name: "twitter:description", content: "Sistem Informasi Peminjaman Warkah - Kantor Pertanahan Kota Administrasi Jakarta Barat" },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/1973ea27-1165-4cc6-adef-763140a0de31" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/1973ea27-1165-4cc6-adef-763140a0de31" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", sizes: "64x64", href: "/favicon.png" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/apple-touch-icon.png" },
      { rel: "apple-touch-icon", sizes: "192x192", href: "/apple-touch-icon.png" },
      { rel: "shortcut icon", type: "image/png", href: "/favicon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  useChunkErrorRecovery();
  return (
    <AuthProvider>
      <PeminjamanProvider>
        <Outlet />
        <Toaster richColors position="top-right" closeButton />
      </PeminjamanProvider>
    </AuthProvider>
  );
}

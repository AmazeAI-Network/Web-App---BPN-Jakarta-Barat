import { useLocation, useNavigate } from "@tanstack/react-router";
import { AppSidebar } from "./AppSidebar";
import { Bell, ShieldCheck, UserCircle2, LogOut, Check, Lock, Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useAuth, type DemoUser } from "@/lib/auth";
import { usePeminjaman } from "@/lib/peminjaman-store";
import { isRouteAllowed } from "@/lib/role-access";
import { useEffect, useRef, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Backwards-compat for files still importing CURRENT_USER (will be undefined when logged out)
export const CURRENT_USER: DemoUser = {
  username: "guest",
  name: "Pengguna",
  nip: "-",
  unitKerja: "-",
  role: "petugas_loket",
  roleLabel: "Tamu",
  email: "-",
};

export function AppShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  const { user, logout, isReady } = useAuth();
  const { notifs, unreadCount, markAllRead, requestNotificationPermission, notifPermission } =
    usePeminjaman();
  const navigate = useNavigate();
  const location = useLocation();
  const askedRef = useRef(false);
  const [openNotif, setOpenNotif] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("bpn_sidebar_collapsed") === "1";
  });
  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        window.localStorage.setItem("bpn_sidebar_collapsed", next ? "1" : "0");
      } catch { /* ignore */ }
      return next;
    });
  };

  // Route guard: must be logged in
  useEffect(() => {
    if (isReady && !user) {
      navigate({ to: "/login" });
    }
  }, [isReady, user, navigate]);

  // Role-based access guard for direct URL access
  const allowed = !user || isRouteAllowed(location.pathname, user.role);

  // Ask notification permission once after login
  useEffect(() => {
    if (!user || askedRef.current) return;
    if (notifPermission === "default") {
      askedRef.current = true;
      void requestNotificationPermission().then((res) => {
        if (res === "granted") {
          toast.success("Notifikasi browser diaktifkan", {
            description: "Anda akan menerima pop-up meski tab tidak aktif.",
          });
        }
      });
    }
  }, [user, notifPermission, requestNotificationPermission]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Memuat sesi...
      </div>
    );
  }

  const display = user;

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop sidebar — hidden on mobile/tablet */}
      <div className="sticky top-0 hidden h-screen lg:block">
        <AppSidebar collapsed={collapsed} />
      </div>

      {/* Mobile sidebar drawer */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent
          side="left"
          className="w-72 max-w-[85vw] border-0 bg-transparent p-0 [&>button]:text-white [&>button]:right-3 [&>button]:top-3"
        >
          <SheetTitle className="sr-only">Menu Navigasi</SheetTitle>
          <AppSidebar onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-2 border-b bg-card px-3 shadow-card sm:h-16 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileNavOpen(true)}
              className="-ml-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-foreground hover:bg-muted lg:hidden"
              aria-label="Buka menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            {/* Desktop collapse toggle */}
            <button
              onClick={toggleCollapsed}
              className="-ml-1 hidden h-9 w-9 shrink-0 items-center justify-center rounded-md text-foreground hover:bg-muted lg:inline-flex"
              aria-label={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
              title={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
            >
              {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold text-foreground sm:text-lg">{title}</h1>
              {subtitle && (
                <p className="hidden truncate text-xs text-muted-foreground sm:block">{subtitle}</p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <div className="hidden items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success xl:flex">
              <ShieldCheck className="h-3.5 w-3.5" />
              Sesi Aman
            </div>

            {/* Notifications */}
            <DropdownMenu open={openNotif} onOpenChange={setOpenNotif}>
              <DropdownMenuTrigger asChild>
                <button
                  className="relative rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Notifikasi"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="w-[calc(100vw-1.5rem)] max-w-sm sm:w-80"
              >
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>Notifikasi</span>
                  {notifs.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => markAllRead()}
                    >
                      <Check className="mr-1 h-3 w-3" /> Tandai dibaca
                    </Button>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifs.length === 0 ? (
                  <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                    Belum ada notifikasi
                  </div>
                ) : (
                  <div className="max-h-80 overflow-y-auto">
                    {notifs.slice(0, 12).map((n) => (
                      <div
                        key={n.id}
                        className={`border-b px-3 py-2.5 text-sm last:border-b-0 ${
                          !n.read ? "bg-info/5" : ""
                        }`}
                      >
                        <p className="font-semibold text-foreground">{n.title}</p>
                        <p className="text-xs text-muted-foreground">{n.body}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                          {new Date(n.ts).toLocaleString("id-ID")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-md outline-none sm:gap-3 sm:border-l sm:pl-4 sm:pr-1">
                  <div className="hidden text-right md:block">
                    <p className="text-sm font-semibold text-foreground">{display.name}</p>
                    <p className="text-[11px] text-muted-foreground">{display.roleLabel}</p>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <UserCircle2 className="h-6 w-6" />
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="w-56">
                <DropdownMenuLabel>
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold">{display.name}</p>
                    <p className="text-[11px] font-mono text-muted-foreground">{display.nip}</p>
                    <p className="text-[11px] text-muted-foreground">{display.unitKerja}</p>
                    <p className="text-[11px] text-muted-foreground md:hidden">
                      {display.roleLabel}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    logout();
                    toast("Sesi diakhiri");
                    navigate({ to: "/login" });
                  }}
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 p-3 sm:p-4 md:p-6">
          <div key={location.pathname} className="animate-page-zoom">
          {allowed ? (
            children
          ) : (
            <div className="mx-auto mt-10 max-w-md rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
              <Lock className="mx-auto mb-3 h-10 w-10 text-destructive" />
              <h2 className="text-lg font-bold text-foreground">Akses Ditolak</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Halaman ini bukan bagian dari tugas role <b>{display.roleLabel}</b>. Silakan
                kembali ke Dashboard.
              </p>
              <button
                onClick={() => navigate({ to: "/" })}
                className="mt-4 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Kembali ke Dashboard
              </button>
            </div>
          )}
          </div>
        </main>
      </div>
    </div>
  );
}

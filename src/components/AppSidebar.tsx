import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ShieldCheck,
  FileEdit,
  CheckCircle2,
  ClipboardCheck,
  Undo2,
  Activity,
  BookOpen,
  ChevronDown,
  Users,
  Database,
  UserCog,
  ShieldAlert,
  Briefcase,
  ClipboardList,
} from "lucide-react";
import { useState } from "react";
import logoBpn from "@/assets/logo-bpn.png";
import { cn } from "@/lib/utils";
import { useAuth, type UserRole } from "@/lib/auth";

type NavItem = {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
};
type NavGroup = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  items: NavItem[];
};

const ALL: UserRole[] = ["admin", "petugas_loket", "verifikator"];

const mainItems: NavItem[] = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard, roles: ALL },
  { label: "Peminjaman Register", to: "/peminjaman/register", icon: FileEdit, roles: ["admin", "petugas_loket"] },
  { label: "Peminjaman Verifikasi", to: "/peminjaman/verifikasi", icon: CheckCircle2, roles: ["admin", "verifikator"] },
  { label: "Peminjaman Konfirmasi", to: "/peminjaman/konfirmasi", icon: ClipboardCheck, roles: ["admin"] },
  { label: "Peminjaman Informasi", to: "/peminjaman/informasi", icon: BookOpen, roles: ["admin"] },
  { label: "Pengembalian", to: "/pengembalian", icon: Undo2, roles: ["admin", "petugas_loket"] },
  { label: "Monitoring Peminjaman", to: "/monitoring", icon: Activity, roles: ["admin", "petugas_loket"] },
];

const groups: NavGroup[] = [
  {
    label: "Pengamanan",
    icon: ShieldCheck,
    roles: ["admin"],
    items: [
      { label: "Peminjaman Pengamanan", to: "/peminjaman/pengamanan", icon: ShieldCheck, roles: ["admin"] },
      { label: "Pengembalian", to: "/pengembalian/pengamanan", icon: Undo2, roles: ["admin"] },
      { label: "Monitoring Pengamanan", to: "/monitoring/pengamanan", icon: Activity, roles: ["admin"] },
    ],
  },
  {
    label: "User",
    icon: Users,
    roles: ["admin"],
    items: [
      { label: "Pengguna", to: "/admin/users", icon: UserCog, roles: ["admin"] },
      { label: "Hak Akses", to: "/admin/roles", icon: ShieldAlert, roles: ["admin"] },
    ],
  },
  {
    label: "Master",
    icon: Database,
    roles: ["admin"],
    items: [
      { label: "Kegiatan", to: "/master/kegiatan", icon: ClipboardList, roles: ["admin"] },
      { label: "Peminjam", to: "/master/peminjam", icon: Briefcase, roles: ["admin"] },
    ],
  },
];

export function AppSidebar({
  onNavigate,
  collapsed = false,
}: { onNavigate?: () => void; collapsed?: boolean } = {}) {
  const location = useLocation();
  const { user } = useAuth();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Pengamanan: true,
    User: false,
    Master: false,
  });

  const role: UserRole = user?.role ?? "petugas_loket";
  const visibleMain = mainItems.filter((i) => i.roles.includes(role));
  const visibleGroups = groups
    .filter((g) => g.roles.includes(role))
    .map((g) => ({ ...g, items: g.items.filter((i) => i.roles.includes(role)) }))
    .filter((g) => g.items.length > 0);

  const isActive = (to: string) => {
    if (to === "/") return location.pathname === "/";
    if (to === "/monitoring") return location.pathname === "/monitoring";
    if (to === "/pengembalian") return location.pathname === "/pengembalian";
    return location.pathname.startsWith(to);
  };

  return (
    <aside
      className={cn(
        "flex h-full flex-col bg-gradient-sidebar text-[color:var(--sidebar-fg)] shadow-elegant transition-all duration-200",
        collapsed ? "w-16" : "w-72",
      )}
    >
      {/* Brand */}
      <div className={cn("flex items-center gap-3 border-b border-white/10 py-4", collapsed ? "justify-center px-2" : "px-5")}>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center">
          <img src={logoBpn} alt="Logo BPN" className="h-full w-full object-contain drop-shadow" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-300">Kantor Pertanahan</p>
            <p className="truncate text-sm font-bold leading-tight">Kota Adm. Jakarta Barat</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className={cn("scrollbar-thin flex-1 overflow-y-auto py-4 space-y-6", collapsed ? "px-2" : "px-3")}>
        <div>
          {!collapsed && (
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-white/50">
              Menu Utama
            </p>
          )}
          <ul className="space-y-1">
            {visibleMain.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.to);
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex items-center rounded-md text-sm font-medium transition-all",
                      collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2",
                      active
                        ? "bg-accent text-accent-foreground shadow"
                        : "text-white/80 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {visibleGroups.length > 0 && (
          <div className="space-y-4">
            {visibleGroups.map((group) => {
              const GIcon = group.icon;
              const open = openGroups[group.label];
              const groupActive = group.items.some((s) => isActive(s.to));
              return (
                <div key={group.label}>
                  {!collapsed && (
                    <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-white/50">
                      {group.label}
                    </p>
                  )}
                  <ul className="space-y-1">
                    {collapsed ? (
                      // Collapsed: tampilkan hanya item-icons langsung
                      group.items.map((sub) => {
                        const SIcon = sub.icon;
                        const active = isActive(sub.to);
                        return (
                          <li key={sub.to}>
                            <Link
                              to={sub.to}
                              onClick={onNavigate}
                              title={sub.label}
                              className={cn(
                                "flex items-center justify-center rounded-md p-2.5 text-sm transition-all",
                                active
                                  ? "bg-accent text-accent-foreground shadow"
                                  : "text-white/70 hover:bg-white/10 hover:text-white",
                              )}
                            >
                              <SIcon className="h-4 w-4 shrink-0" />
                            </Link>
                          </li>
                        );
                      })
                    ) : (
                      <li>
                        <button
                          type="button"
                          onClick={() =>
                            setOpenGroups((p) => ({ ...p, [group.label]: !p[group.label] }))
                          }
                          className={cn(
                            "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-semibold hover:bg-white/10",
                            groupActive ? "text-white" : "text-white/90",
                          )}
                        >
                          <span className="flex items-center gap-3">
                            <GIcon className="h-4 w-4" />
                            {group.label}
                          </span>
                          <ChevronDown
                            className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
                          />
                        </button>
                        {open && (
                          <ul className="mt-1 space-y-1 pl-4">
                            {group.items.map((sub) => {
                              const SIcon = sub.icon;
                              const active = isActive(sub.to);
                              return (
                                <li key={sub.to}>
                                  <Link
                                    to={sub.to}
                                    onClick={onNavigate}
                                    className={cn(
                                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all",
                                      active
                                        ? "bg-accent text-accent-foreground shadow"
                                        : "text-white/70 hover:bg-white/10 hover:text-white",
                                    )}
                                  >
                                    <SIcon className="h-4 w-4 shrink-0" />
                                    <span className="truncate">{sub.label}</span>
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </li>
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </nav>

      {/* (Demo notification button removed) */}
      {/* Footer */}
      {!collapsed && (
        <div className="border-t border-white/10 px-5 py-3">
          <p className="text-[10px] text-white/50">
            © {new Date().getFullYear()} BPN Jakarta Barat
          </p>
          <p className="text-[10px] text-white/40">Sistem Informasi Peminjaman Warkah v1.0</p>
        </div>
      )}
    </aside>
  );
}

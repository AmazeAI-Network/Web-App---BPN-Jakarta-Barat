import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff, LogIn, Loader2 } from "lucide-react";
import { toast } from "sonner";
import bgJakarta from "@/assets/login-bg-jakarta.jpg";
import logoBpn from "@/assets/logo-bpn.png";
import { useAuth } from "@/lib/auth";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login — Kantor Pertanahan Jakarta Barat" },
      { name: "description", content: "Masuk ke Sistem Informasi Peminjaman Warkah BPN Jakarta Barat" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { login, user, isReady } = useAuth();

  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isReady && user) {
      navigate({ to: "/" });
    }
  }, [isReady, user, navigate]);


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      toast.error("Lengkapi username dan password");
      return;
    }
    setLoading(true);
    try {
      const u = await login(username, password);
      toast.success(`Selamat datang, ${u.name.split(" ")[0]}`, {
        description: u.roleLabel,
      });
      navigate({ to: "/" });
    } catch (err) {
      toast.error("Login gagal", {
        description: err instanceof Error ? err.message : "Terjadi kesalahan",
      });
    } finally {
      setLoading(false);
    }
  };



  return (
    <div
      className="relative flex min-h-screen w-full items-center justify-center bg-cover bg-center px-4 py-10"
      style={{ backgroundImage: `url(${bgJakarta})` }}
    >
      {/* Dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-login" aria-hidden="true" />
      <div className="absolute inset-0 bg-black/35" aria-hidden="true" />

      {/* Glass card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="glass-panel shadow-glass overflow-hidden rounded-2xl">
          {/* Logo + title */}
          <div className="flex flex-col items-center px-8 pb-2 pt-10 text-center">
            <div className="mb-5 flex h-44 w-44 items-center justify-center sm:h-52 sm:w-52">
              <img
                src={logoBpn}
                alt="Logo BPN Republik Indonesia"
                className="h-full w-full object-contain drop-shadow-2xl"
              />
            </div>
            <h1 className="text-xl font-bold leading-tight text-white">
              Kantor Pertanahan
            </h1>
            <p className="text-sm font-medium text-white/85">
              Kota Administrasi Jakarta Barat
            </p>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-300/90">
              Sistem Peminjaman Kearsipan
            </p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-300/90">
              Buku Tanah, Surat Ukur Dan Warkah
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 px-8 pb-8 pt-6">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-white/90">
                Username
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder="Masukkan username"
                className="h-11 border-white/20 bg-white/10 text-white placeholder:text-white/50 focus-visible:border-amber-300 focus-visible:ring-amber-300/40"
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-white/90">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="h-11 border-white/20 bg-white/10 pr-10 text-white placeholder:text-white/50 focus-visible:border-amber-300 focus-visible:ring-amber-300/40"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                  aria-label={showPwd ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full gap-2 bg-amber-500 font-semibold text-slate-900 shadow-lg hover:bg-amber-400"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Memproses...
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" /> MASUK
                </>
              )}
            </Button>

          </form>

        </div>

        <p className="mt-4 text-center text-[11px] text-white/70 drop-shadow">
          © {new Date().getFullYear()} Badan Pertanahan Nasional · Kantor Pertanahan Kota Adm. Jakarta Barat
        </p>
      </div>
    </div>
  );
}

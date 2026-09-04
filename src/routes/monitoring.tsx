import { createFileRoute, redirect } from "@tanstack/react-router";

// Halaman Monitoring telah digabung ke /pengembalian (tab "Monitoring Peminjaman").
export const Route = createFileRoute("/monitoring")({
  beforeLoad: () => {
    throw redirect({ to: "/pengembalian", search: { tab: "monitoring" } });
  },
});

import { createFileRoute, redirect } from "@tanstack/react-router";

// Halaman Pengembalian Admin telah digabung ke /pengembalian (tab "Pengembalian Admin").
export const Route = createFileRoute("/pengembalian_/admin")({
  beforeLoad: () => {
    throw redirect({ to: "/pengembalian", search: { tab: "admin" } });
  },
});

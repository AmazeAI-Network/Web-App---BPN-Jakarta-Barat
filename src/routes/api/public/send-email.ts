import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getSession } from "@/lib/session.server";

const RESEND_URL = "https://api.resend.com/emails";

const Body = z.object({
  to: z.string().trim().email().max(255),
  subject: z.string().trim().min(1).max(200),
  html: z.string().min(1).max(50_000),
});

export const Route = createFileRoute("/api/public/send-email")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const headers = { "Content-Type": "application/json" } as const;

        // Require an authenticated session — endpoint is no longer an open relay.
        const session = getSession();
        if (!session) {
          return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
            status: 401,
            headers,
          });
        }

        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
          return new Response(
            JSON.stringify({ ok: false, error: "Email service belum dikonfigurasi" }),
            { status: 503, headers },
          );
        }

        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return new Response(JSON.stringify({ ok: false, error: "Invalid JSON" }), {
            status: 400,
            headers,
          });
        }

        const parsed = Body.safeParse(raw);
        if (!parsed.success) {
          return new Response(
            JSON.stringify({ ok: false, error: "Input tidak valid" }),
            { status: 400, headers },
          );
        }
        const { to, subject, html } = parsed.data;

        // `from` is fixed server-side; clients cannot impersonate senders.
        const from =
          process.env.EMAIL_FROM?.trim() ||
          "BPN Jakarta Barat <noreply@bpnjakbar.xyz>";

        const r = await fetch(RESEND_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({ from, to: [to], subject, html }),
        });

        if (!r.ok) {
          return new Response(
            JSON.stringify({ ok: false, error: "Gagal mengirim email" }),
            { status: 502, headers },
          );
        }
        const data = (await r.json().catch(() => ({}))) as { id?: string };
        return new Response(JSON.stringify({ ok: true, id: data?.id }), {
          status: 200,
          headers,
        });
      },
    },
  },
});

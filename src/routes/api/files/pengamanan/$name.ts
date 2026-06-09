// Public download endpoint for pengamanan PDFs. Requires a valid HMAC signature
// produced by getPengamananSignedUrl() and not yet expired.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/files/pengamanan/$name")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const url = new URL(request.url);
        const exp = Number(url.searchParams.get("exp"));
        const sig = url.searchParams.get("sig") ?? "";
        const name = params.name;
        const { verifySignedUrl, readFileBytes } = await import(
          "@/server/file-storage.server"
        );
        if (!verifySignedUrl(name, exp, sig)) {
          return new Response("Forbidden", { status: 403 });
        }
        try {
          const bytes = await readFileBytes(name);
          return new Response(bytes as BlobPart, {
            status: 200,
            headers: {
              "Content-Type": "application/pdf",
              "Cache-Control": "private, max-age=60",
            },
          });
        } catch {
          return new Response("Not found", { status: 404 });
        }
      },
    },
  },
});

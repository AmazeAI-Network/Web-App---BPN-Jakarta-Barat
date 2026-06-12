// Server-only file storage helpers for PDF files (formerly Supabase Storage).
// Reads/writes require an authenticated session; the service-role client is
// only used after the session has been validated.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSession } from "@/lib/session.server";

const PathSchema = z.object({
  path: z
    .string()
    .min(1)
    .max(512)
    .regex(/^[a-zA-Z0-9._-]+$/, "Nama file tidak valid"),
});

export const getPengamananSignedUrl = createServerFn({ method: "POST" })
  .inputValidator((input) => PathSchema.parse(input))
  .handler(async ({ data }) => {
    requireSession();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from("pengamanan-files")
      .createSignedUrl(data.path, 60 * 10);
    if (error || !signed?.signedUrl) throw new Error("File PDF belum dapat dibuka");
    return { signedUrl: signed.signedUrl };
  });

const UploadSchema = z.object({
  fileName: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-zA-Z0-9._-]+$/, "Nama file tidak valid"),
  contentBase64: z.string().min(1).max(20 * 1024 * 1024),
});

export const uploadPengamananFile = createServerFn({ method: "POST" })
  .inputValidator((input) => UploadSchema.parse(input))
  .handler(async ({ data }) => {
    requireSession();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const bytes = Uint8Array.from(atob(data.contentBase64), (c) => c.charCodeAt(0));
    if (bytes.length > 10 * 1024 * 1024) throw new Error("Ukuran file maksimal 10 MB");
    const safeName = `${Date.now()}-${data.fileName}`;
    const { error } = await supabaseAdmin.storage
      .from("pengamanan-files")
      .upload(safeName, bytes, { contentType: "application/pdf", upsert: true });
    if (error) throw new Error("PDF belum dapat diupload. Coba pilih ulang file.");
    return { path: safeName };
  });

// Authenticated upload + signed-URL issuance for pengamanan PDFs.
// Storage backend is local filesystem (see src/server/file-storage.server.ts);
// swap that module to S3/etc. without touching this file.
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
    const { buildSignedUrl } = await import("@/server/file-storage.server");
    return { signedUrl: buildSignedUrl(data.path, 60 * 10) };
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
    const { saveFile } = await import("@/server/file-storage.server");
    const bytes = Uint8Array.from(atob(data.contentBase64), (c) => c.charCodeAt(0));
    if (bytes.length > 10 * 1024 * 1024) throw new Error("Ukuran file maksimal 10 MB");
    const safeName = `${Date.now()}-${data.fileName}`;
    await saveFile(safeName, bytes);
    return { path: safeName };
  });

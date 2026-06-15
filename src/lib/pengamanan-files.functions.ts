// File storage helpers backed by Laravel.
import { api, unwrap } from "@/lib/api";

type SignedInput = { path: string };

export async function getPengamananSignedUrl(
  input: { data: SignedInput } | SignedInput,
): Promise<{ signedUrl: string }> {
  const data = unwrap<SignedInput>(input)!;
  return api.post<{ signedUrl: string }>("/files/pengamanan/signed-url", {
    path: data.path,
  });
}

type UploadInput = { fileName: string; contentBase64: string };

export async function uploadPengamananFile(
  input: { data: UploadInput } | UploadInput,
): Promise<{ path: string }> {
  const data = unwrap<UploadInput>(input)!;
  return api.post<{ path: string }>("/files/pengamanan/upload", {
    fileName: data.fileName,
    contentBase64: data.contentBase64,
  });
}

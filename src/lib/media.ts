import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, string>();
const ALLOWED_BUCKETS = new Set(["avatars", "covers", "screenshots", "software-files"]);

export type StorageObjectReference = {
  bucket: string;
  path: string;
};

export type ProgressCallback = (progress: number) => void;

export function normalizeStorageReference(reference: string | null | undefined): string | null {
  if (!reference) return null;
  if (reference.startsWith("http") || reference.startsWith("/")) return reference;

  const normalized = reference.replace(/\\/g, "/").trim();
  if (!normalized || normalized.includes("..") || normalized.startsWith("/") || normalized.includes("//")) {
    return null;
  }

  const [bucket, ...rest] = normalized.split("/");
  const path = rest.join("/");
  if (!bucket || !ALLOWED_BUCKETS.has(bucket) || !path || path.startsWith("/") || path.includes("..")) {
    return null;
  }

  return `${bucket}/${path}`;
}

export function parseStorageObjectReference(
  reference: string | null | undefined,
): StorageObjectReference | null {
  const normalized = normalizeStorageReference(reference);
  if (!normalized || normalized.startsWith("http") || normalized.startsWith("/")) return null;

  const [bucket, ...rest] = normalized.split("/");
  const path = rest.join("/");
  return bucket && path ? { bucket, path } : null;
}

/**
 * Image references are stored either as a plain URL (seed/CDN assets) or as a
 * `bucket/path` storage key for admin uploads. Storage buckets are private, so
 * uploads are resolved through a signed URL.
 */
export async function resolveImageUrl(reference: string | null | undefined): Promise<string | null> {
  const normalized = normalizeStorageReference(reference);
  if (!normalized) return reference && (reference.startsWith("http") || reference.startsWith("/")) ? reference : null;
  if (normalized.startsWith("http") || normalized.startsWith("/")) return normalized;
  if (cache.has(normalized)) return cache.get(normalized)!;

  const object = parseStorageObjectReference(normalized);
  if (!object) return null;

  const { data, error } = await supabase.storage
    .from(object.bucket)
    .createSignedUrl(object.path, 60 * 60);
  if (error || !data?.signedUrl) return null;
  cache.set(normalized, data.signedUrl);
  return data.signedUrl;
}

export async function uploadFile(bucket: string, path: string, file: File) {
  if (!ALLOWED_BUCKETS.has(bucket)) throw new Error("Invalid storage bucket");
  const normalizedPath = path.replace(/\\/g, "/").trim();
  if (
    !normalizedPath ||
    normalizedPath.includes("..") ||
    normalizedPath.startsWith("/") ||
    normalizedPath.includes("//")
  ) {
    throw new Error("Invalid storage path");
  }
  const { error } = await supabase.storage.from(bucket).upload(normalizedPath, file, { upsert: true });
  if (error) throw error;
  return `${bucket}/${normalizedPath}`;
}

export async function uploadFileWithProgress(
  bucket: string,
  path: string,
  file: File,
  onProgress: ProgressCallback,
) {
  if (!ALLOWED_BUCKETS.has(bucket)) throw new Error("Invalid storage bucket");
  const normalizedPath = path.replace(/\\/g, "/").trim();
  if (
    !normalizedPath ||
    normalizedPath.includes("..") ||
    normalizedPath.startsWith("/") ||
    normalizedPath.includes("//")
  ) {
    throw new Error("Invalid storage path");
  }

  const { data, error: sessionError } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (sessionError || !accessToken) throw sessionError ?? new Error("You must be signed in to upload files");

  const supabaseUrl = import.meta.env["VITE_SUPABASE_URL"] || process.env["SUPABASE_URL"];
  const publishableKey =
    import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] || process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!supabaseUrl || !publishableKey) throw new Error("Supabase storage is not configured");

  return new Promise<string>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", `${supabaseUrl}/storage/v1/object/${bucket}/${normalizedPath}`);
    request.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    request.setRequestHeader("apikey", publishableKey);
    request.setRequestHeader("x-upsert", "true");
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    };
    request.onerror = () => reject(new Error("The upload request failed"));
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress(100);
        resolve(`${bucket}/${normalizedPath}`);
        return;
      }
      try {
        const body = JSON.parse(request.responseText) as { message?: string; error?: string };
        reject(new Error(body.message ?? body.error ?? "The upload failed"));
      } catch {
        reject(new Error("The upload failed"));
      }
    };
    request.send(file);
  });
}

export async function downloadFileWithProgress(
  signedUrl: string,
  fileName: string,
  onProgress: ProgressCallback,
) {
  const response = await fetch(signedUrl);
  if (!response.ok || !response.body) throw new Error("The download failed");

  const total = Number(response.headers.get("content-length")) || 0;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      loaded += value.byteLength;
      if (total > 0) onProgress(Math.min(100, Math.round((loaded / total) * 100)));
    }
  }

  const blob = new Blob(chunks);
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(objectUrl);
  onProgress(100);
}

export function fileNameFrom(reference: string | null | undefined) {
  if (!reference) return "";
  return reference.split("/").pop() ?? "";
}

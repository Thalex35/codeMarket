import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, string>();
const ALLOWED_BUCKETS = new Set(["avatars", "covers", "screenshots", "software-files"]);

export type StorageObjectReference = {
  bucket: string;
  path: string;
};

export type ProgressCallback = (progress: number) => void;

type UploadAuth = Pick<typeof supabase.auth, "getSession" | "refreshSession">;

export async function getUploadAccessToken(auth: UploadAuth = supabase.auth) {
  const { data: sessionData, error: sessionError } = await auth.getSession();
  const existingToken = sessionData.session?.access_token;
  if (existingToken) return existingToken;

  const { data: refreshedData, error: refreshError } = await auth.refreshSession();
  const refreshedToken = refreshedData.session?.access_token;
  if (refreshedToken) return refreshedToken;
  throw refreshError ?? sessionError ?? new Error("You must be signed in to upload files");
}

export function normalizeStorageReference(reference: string | null | undefined): string | null {
  if (!reference) return null;
  const trimmed = reference.trim();
  if (trimmed.startsWith("blob:")) {
    try {
      return new URL(trimmed).protocol === "blob:" ? trimmed : null;
    } catch {
      return null;
    }
  }
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      return new URL(trimmed).protocol.toLowerCase() === "https:" ||
        new URL(trimmed).protocol.toLowerCase() === "http:"
        ? trimmed
        : null;
    } catch {
      return null;
    }
  }
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;

  const normalized = trimmed.replace(/\\/g, "/");
  if (
    !normalized ||
    normalized.includes("..") ||
    normalized.startsWith("/") ||
    normalized.includes("//")
  ) {
    return null;
  }

  const [bucket, ...rest] = normalized.split("/");
  const path = rest.join("/");
  if (
    !bucket ||
    !ALLOWED_BUCKETS.has(bucket) ||
    !path ||
    path.startsWith("/") ||
    path.includes("..")
  ) {
    return null;
  }

  return `${bucket}/${path}`;
}

export function parseStorageObjectReference(
  reference: string | null | undefined,
): StorageObjectReference | null {
  const normalized = normalizeStorageReference(reference);
  if (
    !normalized ||
    normalized.startsWith("blob:") ||
    /^https?:\/\//i.test(normalized) ||
    normalized.startsWith("/")
  )
    return null;

  const [bucket, ...rest] = normalized.split("/");
  const path = rest.join("/");
  return bucket && path ? { bucket, path } : null;
}

/**
 * Image references are stored either as a plain URL (seed/CDN assets) or as a
 * `bucket/path` storage key for admin uploads. Catalog media is public, so it
 * is resolved through a stable public URL.
 */
export async function resolveImageUrl(
  reference: string | null | undefined,
  preferSigned = false,
): Promise<string | null> {
  const normalized = normalizeStorageReference(reference);
  if (!normalized)
    return reference && (reference.startsWith("http") || reference.startsWith("/"))
      ? reference
      : null;
  if (
    normalized.startsWith("blob:") ||
    /^https?:\/\//i.test(normalized) ||
    normalized.startsWith("/")
  )
    return normalized;
  const cacheKey = preferSigned ? `${normalized}:signed` : normalized;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  const object = parseStorageObjectReference(normalized);
  if (!object) return null;

  if (!preferSigned && (object.bucket === "covers" || object.bucket === "screenshots")) {
    const { data } = supabase.storage.from(object.bucket).getPublicUrl(object.path);
    cache.set(cacheKey, data.publicUrl);
    return data.publicUrl;
  }

  const { data, error } = await supabase.storage
    .from(object.bucket)
    .createSignedUrl(object.path, 60 * 60);
  if (error || !data?.signedUrl) return null;
  cache.set(cacheKey, data.signedUrl);
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
  const { error } = await supabase.storage
    .from(bucket)
    .upload(normalizedPath, file, { upsert: true });
  if (error) throw error;
  return `${bucket}/${normalizedPath}`;
}

export async function uploadFileWithProgress(
  bucket: string,
  path: string,
  file: File,
  onProgress: ProgressCallback,
  signal?: AbortSignal,
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

  const accessToken = await getUploadAccessToken();

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
    if (file.type) request.setRequestHeader("Content-Type", file.type);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable)
        onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    };
    const abortUpload = () => request.abort();
    signal?.addEventListener("abort", abortUpload, { once: true });
    request.onerror = () => reject(new Error("The upload request failed"));
    request.onabort = () => reject(new DOMException("Upload cancelled", "AbortError"));
    request.onload = () => {
      signal?.removeEventListener("abort", abortUpload);
      if (request.status >= 200 && request.status < 300) {
        onProgress(100);
        resolve(`${bucket}/${normalizedPath}`);
        return;
      }
      try {
        const body = JSON.parse(request.responseText) as {
          message?: string;
          error?: string;
          statusCode?: string | number;
        };
        const detail = body.message ?? body.error;
        reject(
          new Error(
            detail
              ? `Upload failed (${request.status}): ${detail}`
              : `Upload failed with HTTP ${request.status}`,
          ),
        );
      } catch {
        reject(new Error(`Upload failed with HTTP ${request.status}`));
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
  return downloadResponseWithProgress(response, fileName, onProgress);
}

export async function downloadResponseWithProgress(
  response: Response,
  fileName: string,
  onProgress: ProgressCallback,
) {
  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || `Download failed with HTTP ${response.status}`);
  }

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

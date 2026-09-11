import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, string>();
const ALLOWED_BUCKETS = new Set(["avatars", "covers", "screenshots", "software-files"]);

export type StorageObjectReference = {
  bucket: string;
  path: string;
};

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
  if (!path || path.includes("..") || path.startsWith("/")) {
    throw new Error("Invalid storage path");
  }
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw error;
  return `${bucket}/${path}`;
}

export function fileNameFrom(reference: string | null | undefined) {
  if (!reference) return "";
  return reference.split("/").pop() ?? "";
}

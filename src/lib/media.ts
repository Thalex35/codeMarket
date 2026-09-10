import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, string>();

/**
 * Image references are stored either as a plain URL (seed/CDN assets) or as a
 * `bucket/path` storage key for admin uploads. Storage buckets are private, so
 * uploads are resolved through a signed URL.
 */
export async function resolveImageUrl(reference: string | null | undefined): Promise<string | null> {
  if (!reference) return null;
  if (reference.startsWith("http") || reference.startsWith("/")) return reference;
  if (cache.has(reference)) return cache.get(reference)!;

  const [bucket, ...rest] = reference.split("/");
  const path = rest.join("/");
  if (!bucket || !path) return null;

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) return null;
  cache.set(reference, data.signedUrl);
  return data.signedUrl;
}

export async function uploadFile(bucket: string, path: string, file: File) {
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw error;
  return `${bucket}/${path}`;
}

export function fileNameFrom(reference: string | null | undefined) {
  if (!reference) return "";
  return reference.split("/").pop() ?? "";
}

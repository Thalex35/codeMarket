export function normalizeSocialUrl(value: string | null | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

export function normalizeWhatsAppNumber(value: string | null | undefined): string {
  if (!value) return "";
  const digits = value.replace(/[^\d+]/g, "");
  if (!digits || digits.replace(/\+/g, "").length < 8) return "";
  return digits.startsWith("+") ? digits : `+${digits.replace(/^\+/, "")}`;
}

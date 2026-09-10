export const CATEGORIES = [
  "Education",
  "Business",
  "Productivity",
  "Healthcare",
  "Church",
  "Entertainment",
  "Other",
] as const;

export const PLATFORMS = ["Windows", "macOS", "Linux", "Cross-platform", "Web", "Android"] as const;

export type Category = (typeof CATEGORIES)[number];

export function formatPrice(amount: number, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatCount(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(value);
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function normalizeSlug(value: string | null | undefined): string {
  if (typeof value !== "string") return "";

  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return "";
  if (/\/|\\|:|%|\.\.|^\.+|\.+$/.test(trimmed)) return "";

  const slug = trimmed
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return "";
  return slug;
}

export function slugify(value: string) {
  return normalizeSlug(value);
}

export type Software = {
  id: string;
  owner_id: string | null;
  name: string;
  slug: string;
  short_description: string;
  description: string;
  category: string;
  platform: string;
  pricing_type: string;
  price: number;
  currency: string;
  cover_url: string | null;
  features: string[];
  requirements: Record<string, string> | null;
  featured: boolean;
  published: boolean;
  archived: boolean;
  download_count: number;
  like_count: number;
  created_at: string;
  updated_at: string;
};

export type SoftwareVersion = {
  id: string;
  software_id: string;
  version: string;
  file_path: string | null;
  file_size: string | null;
  release_notes: string | null;
  release_date: string;
  minimum_os: string | null;
  is_current: boolean;
  created_at: string;
};

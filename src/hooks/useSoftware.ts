import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Software, SoftwareVersion } from "@/lib/catalog";

const SOFTWARE_COLUMNS =
  "id, owner_id, name, slug, short_description, description, category, platform, pricing_type, price, currency, cover_url, features, requirements, featured, published, archived, download_count, like_count, created_at, updated_at";

export type SoftwareFilters = {
  search?: string;
  category?: string;
  platform?: string;
  pricing?: string;
  sort?: string;
};

export function usePublishedSoftware(filters: SoftwareFilters = {}) {
  return useQuery({
    queryKey: ["software", "published", filters],
    queryFn: async (): Promise<Software[]> => {
      let query = supabase
        .from("software")
        .select(SOFTWARE_COLUMNS)
        .eq("published", true)
        .eq("archived", false);

      if (filters.search) {
        const term = `%${filters.search.replace(/[%,]/g, "")}%`;
        query = query.or(
          `name.ilike.${term},short_description.ilike.${term},description.ilike.${term},category.ilike.${term}`,
        );
      }
      if (filters.category && filters.category !== "all") query = query.eq("category", filters.category);
      if (filters.platform && filters.platform !== "all") query = query.eq("platform", filters.platform);
      if (filters.pricing && filters.pricing !== "all") query = query.eq("pricing_type", filters.pricing);

      switch (filters.sort) {
        case "downloads":
          query = query.order("download_count", { ascending: false });
          break;
        case "likes":
          query = query.order("like_count", { ascending: false });
          break;
        case "az":
          query = query.order("name", { ascending: true });
          break;
        default:
          query = query.order("created_at", { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as Software[];
    },
  });
}

export function useSoftwareBySlug(slug: string) {
  return useQuery({
    queryKey: ["software", "slug", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("software")
        .select(SOFTWARE_COLUMNS)
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as Software) ?? null;
    },
  });
}

export function useSoftwareVersions(softwareId: string | undefined) {
  return useQuery({
    enabled: Boolean(softwareId),
    queryKey: ["software-versions", softwareId],
    queryFn: async (): Promise<SoftwareVersion[]> => {
      const { data, error } = await supabase
        .from("software_versions")
        .select("*")
        .eq("software_id", softwareId!)
        .order("release_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SoftwareVersion[];
    },
  });
}

export function useScreenshots(softwareId: string | undefined) {
  return useQuery({
    enabled: Boolean(softwareId),
    queryKey: ["software-screenshots", softwareId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("software_screenshots")
        .select("id, image_url, caption, sort_order")
        .eq("software_id", softwareId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

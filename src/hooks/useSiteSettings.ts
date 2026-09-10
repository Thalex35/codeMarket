import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type SiteSettings = Record<string, string>;

const DEFAULTS: SiteSettings = {
  site_name: "CodeMarket",
  site_description: "Discover. Download. Build.",
  contact_email: "hello@codemarket.app",
  whatsapp_number: "",
  currency: "USD",
  facebook_url: "",
  twitter_url: "",
  linkedin_url: "",
  github_url: "",
};

export function useSiteSettings() {
  const query = useQuery({
    queryKey: ["site-settings"],
    queryFn: async (): Promise<SiteSettings> => {
      const { data, error } = await supabase.from("site_settings").select("key, value");
      if (error) throw error;
      const map: SiteSettings = { ...DEFAULTS };
      for (const row of data ?? []) map[row.key] = row.value ?? "";
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });

  return { settings: query.data ?? DEFAULTS, isLoading: query.isLoading };
}

export function buildWhatsAppLink(number: string, message: string) {
  const digits = number.replace(/[^0-9]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { normalizeSlug } from "@/lib/catalog";

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const url = process.env["SUPABASE_URL"]!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

export const getSoftwareMeta = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => input)
  .handler(async ({ data }) => {
    const slug = normalizeSlug(data.slug);
    if (!slug) return null;

    const supabase = publicClient();
    const { data: row } = await supabase
      .from("software")
      .select("name, slug, short_description, category, platform, pricing_type, price, currency")
      .eq("slug", slug)
      .eq("published", true)
      .eq("archived", false)
      .maybeSingle();
    return row ?? null;
  });

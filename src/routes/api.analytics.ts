import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/integrations/supabase/types";
import { allowRequest, requestKey } from "@/lib/public-abuse";

const schema = z.object({
  eventType: z.enum([
    "page_view",
    "software_view",
    "download",
    "like",
    "unlike",
    "signup",
    "login",
    "purchase_request",
    "contact",
  ]),
  softwareId: z.string().uuid().nullable().optional(),
  metadata: z.record(z.unknown()).default({}),
});

export const Route = createFileRoute("/api/analytics")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!allowRequest(requestKey(request, "analytics"), 120, 60 * 1000)) {
          return Response.json({ error: "Analytics rate limit reached." }, { status: 429 });
        }
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid request." }, { status: 400 });
        }
        const parsed = schema.safeParse(body);
        if (!parsed.success || JSON.stringify(parsed.data.metadata).length > 8192) {
          return Response.json({ error: "Invalid analytics event." }, { status: 400 });
        }
        const url = process.env["SUPABASE_URL"];
        const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
        if (!url || !serviceKey)
          return Response.json({ error: "Service unavailable." }, { status: 503 });
        const supabase = createClient<Database>(url, serviceKey, {
          auth: { persistSession: false },
        });
        const { error } = await supabase.from("analytics_events").insert({
          event_type: parsed.data.eventType,
          software_id: parsed.data.softwareId ?? null,
          metadata: parsed.data.metadata as never,
        });
        if (error)
          return Response.json({ error: "Analytics event was not recorded." }, { status: 500 });
        return Response.json({ ok: true });
      },
    },
  },
});

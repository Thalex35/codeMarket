import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/integrations/supabase/types";
import { allowRequest, requestKey, verifyTurnstile } from "@/lib/public-abuse";

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  subject: z.string().trim().min(3).max(150),
  message: z.string().trim().min(10).max(2000),
  website: z.string().max(0).optional(),
  turnstileToken: z.string().optional(),
});

export const Route = createFileRoute("/api/contact")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!allowRequest(requestKey(request, "contact"), 5, 60 * 60 * 1000)) {
          return Response.json(
            { error: "Too many messages. Please try again later." },
            { status: 429 },
          );
        }
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid request." }, { status: 400 });
        }
        const parsed = schema.safeParse(body);
        if (!parsed.success || parsed.data.website) {
          return Response.json({ error: "Please check the form and try again." }, { status: 400 });
        }
        if (!(await verifyTurnstile(request, parsed.data.turnstileToken))) {
          return Response.json(
            { error: "Bot verification failed. Please try again." },
            { status: 403 },
          );
        }

        const url = process.env["SUPABASE_URL"];
        const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
        if (!url || !serviceKey)
          return Response.json({ error: "Service unavailable." }, { status: 503 });
        const supabase = createClient<Database>(url, serviceKey, {
          auth: { persistSession: false },
        });
        const { website: _website, turnstileToken: _token, ...message } = parsed.data;
        const { error } = await supabase.from("messages").insert(message);
        if (error)
          return Response.json({ error: "The message could not be sent." }, { status: 500 });
        return Response.json({ ok: true });
      },
    },
  },
});

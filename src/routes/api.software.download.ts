import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

function unauthorized() {
  return new Response("Unauthorized", { status: 401 });
}

export const Route = createFileRoute("/api/software/download")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authorization = request.headers.get("authorization");
        if (!authorization?.startsWith("Bearer ")) return unauthorized();

        const token = authorization.slice("Bearer ".length).trim();
        const url = new URL(request.url);
        const versionId = url.searchParams.get("versionId");
        if (!token || !versionId) return new Response("Missing download information", { status: 400 });

        const supabaseUrl = process.env["SUPABASE_URL"];
        const publishableKey = process.env["SUPABASE_PUBLISHABLE_KEY"];
        const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
        if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
          return new Response("Download service is not configured", { status: 500 });
        }

        const authClient = createClient<Database>(supabaseUrl, publishableKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: claims, error: claimsError } = await authClient.auth.getClaims(token);
        const userId = claims?.claims?.sub;
        if (claimsError || !userId) return unauthorized();

        const adminClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: version, error: versionError } = await adminClient
          .from("software_versions")
          .select("version, file_path, software_id")
          .eq("id", versionId)
          .maybeSingle();
        if (versionError || !version?.file_path?.startsWith("http")) {
          return new Response("Download not found", { status: 404 });
        }

        const { data: software, error: softwareError } = await adminClient
          .from("software")
          .select("pricing_type, published, archived")
          .eq("id", version.software_id)
          .maybeSingle();
        if (softwareError || !software?.published || software.archived) {
          return new Response("Download not found", { status: 404 });
        }
        if (software.pricing_type === "paid") {
          const { data: purchase } = await adminClient
            .from("purchases")
            .select("id")
            .eq("software_id", version.software_id)
            .eq("user_id", userId)
            .eq("status", "paid")
            .maybeSingle();
          if (!purchase) return new Response("Purchase required", { status: 403 });
        }

        const remoteUrl = new URL(version.file_path);
        if (remoteUrl.hostname !== "github.com") {
          return new Response("Unsupported download host", { status: 400 });
        }
        const upstream = await fetch(remoteUrl, { redirect: "follow" });
        if (!upstream.ok || !upstream.body) return new Response("Download unavailable", { status: 502 });

        const headers = new Headers();
        headers.set("Content-Type", upstream.headers.get("content-type") ?? "application/octet-stream");
        const contentLength = upstream.headers.get("content-length");
        if (contentLength) headers.set("Content-Length", contentLength);
        headers.set(
          "Content-Disposition",
          `attachment; filename="${decodeURIComponent(remoteUrl.pathname.split("/").pop() ?? `software-${version.version}`)}"`,
        );
        headers.set("Cache-Control", "private, no-store");
        return new Response(upstream.body, { headers });
      },
    },
  },
});

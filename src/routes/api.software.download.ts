import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

function unauthorized() {
  return new Response("Unauthorized", { status: 401 });
}

function mobileDevice(request: Request) {
  return /android|iphone|ipod|ipad|mobile|windows phone/i.test(
    request.headers.get("user-agent") ?? "",
  );
}

async function resolveGitHubAsset(url: URL) {
  if (url.pathname.includes("/releases/download/")) return url;
  const match = url.pathname.match(/^\/([^/]+)\/([^/]+)\/releases\/tag\/([^/]+)$/);
  if (!match) return null;

  const [, owner, repository, tag] = match;
  const releaseResponse = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/releases/tags/${encodeURIComponent(tag)}`,
    {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "CodeMarket-download-proxy" },
    },
  );
  if (!releaseResponse.ok) return null;
  const release = (await releaseResponse.json()) as {
    assets?: Array<{ name: string; browser_download_url: string }>;
  };
  const asset = release.assets?.find((item) => /\.(exe|msi|zip)$/i.test(item.name));
  return asset ? new URL(asset.browser_download_url) : null;
}

export const Route = createFileRoute("/api/software/download")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (mobileDevice(request)) {
          return new Response("Please open CodeMarket on a PC to download software.", {
            status: 403,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        }
        const authorization = request.headers.get("authorization");
        if (!authorization?.startsWith("Bearer ")) return unauthorized();

        const token = authorization.slice("Bearer ".length).trim();
        const url = new URL(request.url);
        const versionId = url.searchParams.get("versionId");
        if (!token || !versionId)
          return new Response("Missing download information", { status: 400 });

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
          .eq("is_current", true)
          .maybeSingle();
        if (versionError || !version?.file_path) {
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
        const { data: profile } = await adminClient
          .from("profiles")
          .select("status")
          .eq("id", userId)
          .maybeSingle();
        if (profile?.status !== "active") return new Response("Account disabled", { status: 403 });
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

        let remoteUrl: URL | null = null;
        if (version.file_path.startsWith("http")) {
          const savedUrl = new URL(version.file_path);
          if (savedUrl.hostname !== "github.com")
            return new Response("Invalid GitHub URL", { status: 400 });
          remoteUrl = await resolveGitHubAsset(savedUrl);
        } else {
          const [bucket, ...parts] = version.file_path.split("/");
          const storagePath = parts.join("/");
          if (bucket !== "software-files" || !storagePath || storagePath.includes("..")) {
            return new Response("Invalid storage reference", { status: 400 });
          }
          const { data: signed, error: signedError } = await adminClient.storage
            .from(bucket)
            .createSignedUrl(storagePath, 120);
          if (!signed?.signedUrl || signedError)
            return new Response("Download unavailable", { status: 404 });
          remoteUrl = new URL(signed.signedUrl);
        }
        if (!remoteUrl) {
          return new Response("No installer asset was found in this GitHub Release.", {
            status: 404,
          });
        }
        const upstream = await fetch(remoteUrl, { redirect: "follow" });
        if (!upstream.ok || !upstream.body)
          return new Response("Download unavailable", { status: 502 });
        if ((upstream.headers.get("content-type") ?? "").includes("text/html")) {
          return new Response("The GitHub URL points to a page, not an installer file.", {
            status: 502,
          });
        }

        const { error: downloadRecordError } = await adminClient.from("downloads").insert({
          software_id: version.software_id,
          user_id: userId,
          version_id: versionId,
        });
        if (downloadRecordError)
          return new Response("Download could not be recorded", { status: 500 });

        const headers = new Headers();
        headers.set(
          "Content-Type",
          upstream.headers.get("content-type") ?? "application/octet-stream",
        );
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

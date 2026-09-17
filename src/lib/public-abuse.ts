const windows = new Map<string, { startedAt: number; count: number }>();

export function requestKey(request: Request, scope: string) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return `${scope}:${forwarded || request.headers.get("x-real-ip") || "unknown"}`;
}

export function allowRequest(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = windows.get(key);
  if (!current || now - current.startedAt >= windowMs) {
    windows.set(key, { startedAt: now, count: 1 });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

export async function verifyTurnstile(request: Request, token: string | undefined) {
  const secret = process.env["TURNSTILE_SECRET_KEY"];
  if (!secret) return true;
  if (!token) return false;
  const body = new URLSearchParams({
    secret,
    response: token,
    remoteip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "",
  });
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
  });
  const result = (await response.json()) as { success?: boolean };
  return response.ok && result.success === true;
}

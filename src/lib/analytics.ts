export type AnalyticsEventType =
  | "page_view"
  | "software_view"
  | "download"
  | "like"
  | "unlike"
  | "signup"
  | "login"
  | "purchase_request"
  | "contact";

/** Fire-and-forget, privacy-conscious: no IPs, no fingerprints, no PII in stored events. */
export function trackEvent(
  eventType: AnalyticsEventType,
  options: { softwareId?: string | null; metadata?: Record<string, unknown> } = {},
) {
  void fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    body: JSON.stringify({
      eventType,
      softwareId: options.softwareId ?? null,
      metadata: options.metadata ?? {},
    }),
  }).catch(() => undefined);
}

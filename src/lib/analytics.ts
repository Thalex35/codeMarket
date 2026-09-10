import { supabase } from "@/integrations/supabase/client";

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

/** Fire-and-forget, privacy-conscious: no IPs, no fingerprints, no PII. */
export function trackEvent(
  eventType: AnalyticsEventType,
  options: { softwareId?: string | null; metadata?: Record<string, unknown> } = {},
) {
  void supabase
    .from("analytics_events")
    .insert({
      event_type: eventType,
      software_id: options.softwareId ?? null,
      metadata: (options.metadata ?? {}) as never,
    })
    .then(() => undefined);
}

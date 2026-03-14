/**
 * FunnelIQ Tracking Hub — Single source of truth for all events.
 * 
 * Flow: User Action → trackFunnelEvent() → DB insert → Pixel distribution (TikTok)
 * 
 * Deduplication via event_id. Funnel order validation.
 * UTMify and xTracky are DISABLED — they remain as detected scripts only.
 */

import { supabase } from "@/integrations/supabase/client";
import { trackTikTokEvent, identifyTikTokUser, setUserData } from "@/lib/tiktok-tracking";
import type { Json } from "@/integrations/supabase/types";

const DEBUG = "[TrackingHub]";

// ── Canonical funnel events (in order) ──────────────────────────────────
export const FUNNEL_EVENTS = [
  "page_view",
  "view_content",
  "click_buy",
  "add_to_cart",
  "checkout_start",
  "add_payment_info",
  "pix_generated",
  "purchase",
] as const;

export type FunnelEvent = typeof FUNNEL_EVENTS[number];

const FUNNEL_ORDER: Record<string, number> = {};
FUNNEL_EVENTS.forEach((e, i) => { FUNNEL_ORDER[e] = i; });

// Map funnel events to TikTok event names
const TIKTOK_EVENT_MAP: Record<string, string> = {
  view_content: "ViewContent",
  add_to_cart: "AddToCart",
  checkout_start: "InitiateCheckout",
  add_payment_info: "AddPaymentInfo",
  pix_generated: "AddPaymentInfo",
  purchase: "CompletePayment",
};

// Map to funnel_state enum
const FUNNEL_STAGE_MAP: Record<string, string> = {
  page_view: "visit",
  view_content: "view_content",
  click_buy: "add_to_cart",
  add_to_cart: "add_to_cart",
  checkout_start: "checkout",
  add_payment_info: "checkout",
  pix_generated: "pix_generated",
  purchase: "purchase",
};

const STAGE_PRIORITY: Record<string, number> = {
  visit: 1, view_content: 2, add_to_cart: 3, checkout: 4, pix_generated: 5, card_submitted: 5, purchase: 6,
};

// ── Deduplication ───────────────────────────────────────────────────────
const sentEventIds = new Set<string>();

function generateEventId(): string {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// ── Visitor / Session context (reuse from track-event) ──────────────────
function getVisitorId(): string {
  try { return localStorage.getItem("mesalar_visitor_id") || ""; } catch { return ""; }
}

function getSessionId(): string {
  try { return sessionStorage.getItem("mesalar_session_id") || ""; } catch { return ""; }
}

function getUtmSource(): string | null {
  try {
    const cached = sessionStorage.getItem("mesalar_utm");
    if (cached) {
      const parsed = JSON.parse(cached);
      return parsed.utm_source || null;
    }
  } catch {}
  return null;
}

function getUtmCampaign(): string | null {
  try {
    const cached = sessionStorage.getItem("mesalar_utm");
    if (cached) {
      const parsed = JSON.parse(cached);
      return parsed.utm_campaign || null;
    }
  } catch {}
  return null;
}

// ── Funnel order tracking (per session) ─────────────────────────────────
function getLastFunnelIndex(): number {
  try {
    const val = sessionStorage.getItem("funneliq_last_stage");
    return val ? parseInt(val, 10) : -1;
  } catch { return -1; }
}

function setLastFunnelIndex(idx: number) {
  try { sessionStorage.setItem("funneliq_last_stage", String(idx)); } catch {}
}

// ── Core: Track a funnel event ──────────────────────────────────────────

export interface TrackOptions {
  event: FunnelEvent;
  properties?: Record<string, any>;
  value?: number;
  userData?: {
    email?: string;
    phone?: string;
    externalId?: string;
  };
}

export async function trackFunnelEvent(options: TrackOptions) {
  const { event, properties = {}, value = 0, userData } = options;
  const eventId = generateEventId();

  // 1. Dedup check
  if (sentEventIds.has(eventId)) {
    console.warn(`${DEBUG} Duplicate event_id blocked: ${eventId}`);
    return;
  }
  sentEventIds.add(eventId);

  // 2. Funnel order validation
  const eventIndex = FUNNEL_ORDER[event] ?? -1;
  const lastIndex = getLastFunnelIndex();
  let isConsistent = true;

  if (eventIndex >= 0) {
    if (eventIndex < lastIndex) {
      isConsistent = false;
      console.warn(`${DEBUG} Out-of-order event: ${event} (idx ${eventIndex}) after stage ${lastIndex}`);
    }
    if (eventIndex > lastIndex) {
      setLastFunnelIndex(eventIndex);
    }
  }

  const visitorId = getVisitorId();
  const sessionId = getSessionId();
  const timestamp = new Date().toISOString();

  // 3. Register in DB (events table) — single source of truth
  const eventData: Record<string, any> = {
    ...properties,
    event_id: eventId,
    is_consistent: isConsistent,
    page_url: window.location.href,
  };

  const dbPayload = {
    visitor_id: visitorId,
    session_id: sessionId || null,
    event_name: event,
    value: typeof value === "number" ? value : 0,
    source: getUtmSource() || null,
    campaign: getUtmCampaign() || null,
    event_data: eventData as Json,
  };

  // Fire-and-forget DB insert
  (supabase as any).from("events").insert(dbPayload).then(() => {
    console.log(`${DEBUG} ✓ ${event} saved to DB (event_id: ${eventId})`);
  });

  // 4. Update funnel_state
  const stage = FUNNEL_STAGE_MAP[event];
  if (stage && visitorId) {
    const priority = STAGE_PRIORITY[stage] || 0;
    try {
      const { data } = await (supabase as any).from("funnel_state").select("stage").eq("visitor_id", visitorId).maybeSingle();
      const currentPriority = data ? (STAGE_PRIORITY[data.stage] || 0) : 0;
      if (priority > currentPriority) {
        await (supabase as any).from("funnel_state").upsert(
          { visitor_id: visitorId, stage, updated_at: timestamp },
          { onConflict: "visitor_id" }
        );
      }
    } catch {}
  }

  // 5. Distribute to TikTok (Browser + Server via existing module)
  const tiktokEvent = TIKTOK_EVENT_MAP[event];
  if (tiktokEvent) {
    // Set user data for better EMQ if available
    if (userData) {
      await setUserData(userData);
      await identifyTikTokUser(userData);
    }

    await trackTikTokEvent({
      event: tiktokEvent,
      properties: {
        ...properties,
        content_type: properties.content_type || "product",
        content_id: properties.content_id || "mesa-dobravel",
        content_name: properties.content_name || "Mesa Dobrável 180x60cm",
        value: value || properties.value || 0,
        currency: "BRL",
      },
      userData,
    });

    console.log(`${DEBUG} → TikTok ${tiktokEvent} dispatched (event_id shared: ${eventId})`);
  }

  // 6. Legacy dual-write to user_events (for backward compat)
  supabase.from("user_events").insert({
    event_type: event,
    event_data: eventData as Json,
  }).then(() => {});

  console.log(`${DEBUG} ✓ ${event} complete | consistent: ${isConsistent} | event_id: ${eventId}`);
}

// ── Convenience: identify user across pixels ────────────────────────────
export async function identifyUser(data: {
  email?: string;
  phone?: string;
  externalId?: string;
}) {
  await setUserData(data);
  await identifyTikTokUser(data);
}

/**
 * FunnelIQ Tracking Hub — Single source of truth for all events.
 * 
 * Flow: User Action → trackFunnelEvent() → Retry Queue → DB insert → Pixel distribution (TikTok)
 * 
 * Features:
 * - Event retry queue with localStorage persistence
 * - Auto-attribution on purchase (last_click model)
 * - Deduplication via event_id
 * - Funnel order validation
 */

import { supabase } from "@/integrations/supabase/client";
import { trackTikTokEvent, identifyTikTokUser, setUserData } from "@/lib/tiktok-tracking";
import { createMultiModelAttribution } from "@/lib/attribution-engine";
import type { Json } from "@/integrations/supabase/types";

const DEBUG = "[TrackingHub]";
const db = supabase as any;

// ── Canonical funnel events (in strict order) ──────────────────────────
// Maps to real page flow: / → /checkout → /pix → /obrigado
export const FUNNEL_EVENTS = [
  "page_view",       // All pages
  "view_content",    // / (Index)
  "click_buy",       // / (Index) — user clicks buy button
  "add_to_cart",     // / (Index) — user selects color/size
  "checkout_start",  // /checkout — checkout page loaded
  "add_payment_info",// /checkout — card info submitted OR pix selected
  "pix_generated",   // /checkout — PIX QR code generated
  "purchase",        // /pix — payment confirmed
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

// Critical events that must be retried
const CRITICAL_EVENTS = new Set(["checkout_start", "pix_generated", "purchase"]);

// ── Deduplication ───────────────────────────────────────────────────────
const sentEventIds = new Set<string>();

function generateEventId(): string {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// ── Visitor / Session context ───────────────────────────────────────────
function getVisitorId(): string {
  try { return localStorage.getItem("mesalar_visitor_id") || ""; } catch { return ""; }
}

function getSessionId(): string {
  try { return sessionStorage.getItem("mesalar_session_id") || ""; } catch { return ""; }
}

function getUtmSource(): string | null {
  try {
    const cached = sessionStorage.getItem("mesalar_utm");
    if (cached) return JSON.parse(cached).utm_source || null;
  } catch {}
  return null;
}

function getUtmCampaign(): string | null {
  try {
    const cached = sessionStorage.getItem("mesalar_utm");
    if (cached) return JSON.parse(cached).utm_campaign || null;
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

// ── Event Retry Queue ───────────────────────────────────────────────────
const RETRY_KEY = "funneliq_retry_queue";
const MAX_RETRIES = 5;
const RETRY_INTERVAL_MS = 5000;

interface QueuedEvent {
  dbPayload: Record<string, any>;
  retries: number;
  critical: boolean;
  eventId: string;
}

function loadRetryQueue(): QueuedEvent[] {
  try {
    const raw = localStorage.getItem(RETRY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveRetryQueue(queue: QueuedEvent[]) {
  try { localStorage.setItem(RETRY_KEY, JSON.stringify(queue)); } catch {}
}

async function processRetryQueue() {
  const queue = loadRetryQueue();
  if (queue.length === 0) return;

  const remaining: QueuedEvent[] = [];
  for (const item of queue) {
    const { error } = await db.from("events").insert(item.dbPayload);
    if (error) {
      item.retries++;
      if (item.retries < MAX_RETRIES || item.critical) {
        remaining.push(item);
      } else {
        console.warn(`${DEBUG} Dropping event after ${MAX_RETRIES} retries: ${item.eventId}`);
      }
    } else {
      console.log(`${DEBUG} ✓ Retry succeeded for ${item.eventId}`);
    }
  }
  saveRetryQueue(remaining);
}

// Start retry loop
if (typeof window !== "undefined") {
  setInterval(processRetryQueue, RETRY_INTERVAL_MS);
  // Also process on page load
  setTimeout(processRetryQueue, 2000);
}

// ── Attribution Engine ──────────────────────────────────────────────────
async function createAttribution(eventId: string, visitorId: string, sessionId: string, value: number) {
  try {
    // Look up session to find campaign_id and creative_id
    const { data: session } = await db.from("sessions")
      .select("campaign_id, creative_id")
      .eq("session_id", sessionId)
      .maybeSingle();

    const campaignId = session?.campaign_id || null;
    const creativeId = session?.creative_id || null;

    // Also try to match campaign by utm_campaign name
    let resolvedCampaignId = campaignId;
    if (!resolvedCampaignId) {
      const { data: sess } = await db.from("sessions")
        .select("utm_campaign")
        .eq("session_id", sessionId)
        .maybeSingle();
      if (sess?.utm_campaign) {
        const { data: camp } = await db.from("campaigns")
          .select("id")
          .eq("campaign_name", sess.utm_campaign)
          .maybeSingle();
        if (camp) resolvedCampaignId = camp.id;
      }
    }

    await db.from("attributions").insert({
      event_id: eventId,
      session_id: sessionId,
      campaign_id: resolvedCampaignId,
      creative_id: creativeId,
      revenue: value,
      currency: "BRL",
      attribution_model: "last_click",
    });

    console.log(`${DEBUG} ✓ Attribution created for event ${eventId} → campaign ${resolvedCampaignId || "unknown"}`);
  } catch (e) {
    console.warn(`${DEBUG} Attribution error:`, e);
  }
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

  // 3. Build DB payload
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

  // 4. Try DB insert with retry queue fallback (localStorage + server-side event_queue)
  const { error } = await db.from("events").insert(dbPayload);
  if (error) {
    console.warn(`${DEBUG} DB insert failed, queuing for retry: ${eventId}`);
    const queue = loadRetryQueue();
    queue.push({ dbPayload, retries: 0, critical: CRITICAL_EVENTS.has(event), eventId });
    saveRetryQueue(queue);
    // Also push to server-side event_queue as backup
    db.from("event_queue").insert({
      event_name: event,
      payload: dbPayload as Json,
      status: "pending",
    }).then(() => {});
  } else {
    console.log(`${DEBUG} ✓ ${event} saved to DB (event_id: ${eventId})`);
  }

  // 5. Update funnel_state
  const stage = FUNNEL_STAGE_MAP[event];
  if (stage && visitorId) {
    const priority = STAGE_PRIORITY[stage] || 0;
    try {
      const { data } = await db.from("funnel_state").select("stage").eq("visitor_id", visitorId).maybeSingle();
      const currentPriority = data ? (STAGE_PRIORITY[data.stage] || 0) : 0;
      if (priority > currentPriority) {
        await db.from("funnel_state").upsert(
          { visitor_id: visitorId, stage, updated_at: timestamp },
          { onConflict: "visitor_id" }
        );
      }
    } catch {}
  }

  // 6. Attribution on purchase (multi-model)
  if (event === "purchase" && visitorId) {
    createMultiModelAttribution({
      eventId,
      eventType: event,
      visitorId,
      sessionId,
      revenue: value,
      model: "last_click",
    });
  }

  // 7. Distribute to TikTok (Browser + Server)
  const tiktokEvent = TIKTOK_EVENT_MAP[event];
  if (tiktokEvent) {
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

    console.log(`${DEBUG} → TikTok ${tiktokEvent} dispatched (event_id: ${eventId})`);
  }

  // 8. Legacy dual-write to user_events
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

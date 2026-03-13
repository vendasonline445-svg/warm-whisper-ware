import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

// ── Bot Detection ──
const BOT_UA = /bot|crawler|spider|headless|phantom|selenium|puppeteer|scrapy|slurp|wget|curl|scraper/i;
function isBotUA(): boolean {
  return BOT_UA.test(navigator.userAgent || "");
}

// ── Visitor ID — persistent via localStorage, format: v_xxxxx_timestamp ──
function getOrCreateVisitorId(): string {
  const KEY = "mesalar_visitor_id";
  let id = localStorage.getItem(KEY);

  // Accept visitor_id from URL (cross-domain handoff)
  if (!id) {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("visitor_id");
    if (fromUrl) id = fromUrl;
  }

  if (!id) {
    const rand = Math.random().toString(36).slice(2, 7);
    id = `v_${rand}_${Date.now()}`;
  }
  localStorage.setItem(KEY, id);
  return id;
}

// ── Click ID — generated when visitor comes from an ad (has UTM or ad click params) ──
function getOrCreateClickId(): string {
  const KEY = "mesalar_click_id";
  // Persist per session — one click_id per ad click
  let id = sessionStorage.getItem(KEY);
  if (id) return id;

  const params = new URLSearchParams(window.location.search);

  // Accept click_id from URL (cross-domain handoff)
  const fromUrl = params.get("click_id");
  if (fromUrl) {
    sessionStorage.setItem(KEY, fromUrl);
    return fromUrl;
  }

  const hasAdParams = params.get("utm_source") || params.get("fbclid") || params.get("gclid") || params.get("ttclid") || params.get("xcod");

  if (hasAdParams) {
    const rand = Math.random().toString(36).slice(2, 7);
    id = `c_${rand}_${Date.now()}`;
  } else {
    id = "organic";
  }
  sessionStorage.setItem(KEY, id);
  return id;
}

// ── Session ID — expires after 30 min of inactivity ──
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

function getOrCreateSessionId(): string {
  const KEY = "mesalar_session_id";
  const TS_KEY = "mesalar_session_ts";
  const now = Date.now();

  const existing = sessionStorage.getItem(KEY);
  const lastActivity = Number(sessionStorage.getItem(TS_KEY) || "0");

  if (existing && (now - lastActivity) < SESSION_TIMEOUT_MS) {
    sessionStorage.setItem(TS_KEY, String(now));
    return existing;
  }

  const rand = Math.random().toString(36).slice(2, 7);
  const id = `s_${rand}_${now}`;
  sessionStorage.setItem(KEY, id);
  sessionStorage.setItem(TS_KEY, String(now));

  // Clear dedup flags for new session
  const keysToRemove: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const k = sessionStorage.key(i);
    if (k && (k.startsWith("mesalar_pv_") || k === "crm_visit_sent" || k === "mesalar_click_id")) {
      keysToRemove.push(k);
    }
  }
  keysToRemove.forEach(k => sessionStorage.removeItem(k));
  registeredPageViews.clear();

  return id;
}

// Keep session alive on user interaction
if (typeof window !== "undefined") {
  const touchSession = () => sessionStorage.setItem("mesalar_session_ts", String(Date.now()));
  window.addEventListener("click", touchSession, { passive: true });
  window.addEventListener("scroll", touchSession, { passive: true });
  window.addEventListener("keydown", touchSession, { passive: true });
}

function getUtmParams(): Record<string, string> {
  const KEY = "mesalar_utm";
  const cached = sessionStorage.getItem(KEY);
  if (cached) {
    try { return JSON.parse(cached); } catch {}
  }

  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_adset", "utm_content", "utm_term"];
  utmKeys.forEach(k => {
    const v = params.get(k);
    if (v) utm[k] = v;
  });

  // Click IDs are NOT UTM params — store them separately for click_id tracking only
  // Do NOT include ttclid, fbclid, gclid, xcod in UTM params

  if (!utm.utm_source && document.referrer) {
    try {
      const host = new URL(document.referrer).hostname.toLowerCase();
      const ignoredDomains = ["lovable.dev", "healthkart.com", "kango-roo.com"];
      if (ignoredDomains.some(d => host.includes(d))) {
        // Skip — don't set utm_source for ignored domains
      } else if (host.includes("tiktok")) utm.utm_source = "tiktok";
      else if (host.includes("facebook") || host.includes("instagram")) utm.utm_source = "facebook";
      else if (host.includes("google")) utm.utm_source = "google";
      else utm.utm_source = host;
    } catch {}
  }

  if (Object.keys(utm).length > 0) {
    sessionStorage.setItem(KEY, JSON.stringify(utm));
  }

  return utm;
}

function getDeviceType(): string {
  if (typeof navigator === "undefined") return "unknown";
  return /mobile|android|iphone|ipad/i.test(navigator.userAgent) ? "Mobile" : "Desktop";
}

function getReferrer(): string {
  if (!document.referrer) return "direct";
  try {
    return new URL(document.referrer).hostname;
  } catch {
    return document.referrer;
  }
}

// Build context once per session
let _context: Record<string, string> | null = null;
let _contextSessionId: string | null = null;

function getVisitorContext(): Record<string, string> {
  const currentSession = getOrCreateSessionId();
  if (_context && _contextSessionId === currentSession) return _context;

  const utm = getUtmParams();
  _context = {
    visitor_id: getOrCreateVisitorId(),
    session_id: currentSession,
    click_id: getOrCreateClickId(),
    device: getDeviceType(),
    referrer: getReferrer(),
    user_agent: navigator.userAgent?.slice(0, 200) || "",
    ...utm,
  };
  _contextSessionId = currentSession;
  return _context;
}

// ── Export context for other modules ──
export function getTrackingContext(): Record<string, string> {
  return { ...getVisitorContext() };
}

// ── Ensure visitor & session exist in new tables ──
let _visitorEnsured = false;
let _sessionEnsured = false;

// Helper for new tables not yet in generated types
const db = supabase as any;

async function ensureVisitor() {
  if (_visitorEnsured) return;
  _visitorEnsured = true;
  const vid = getOrCreateVisitorId();
  try {
    await db.from("visitors").upsert(
  try {
    await supabase.from("visitors").upsert(
      { visitor_id: vid, device: getDeviceType(), first_seen: new Date().toISOString() },
      { onConflict: "visitor_id", ignoreDuplicates: true }
    );
  } catch {}
}

async function ensureSession() {
  if (_sessionEnsured) return;
  _sessionEnsured = true;
  await ensureVisitor();
  const sid = getOrCreateSessionId();
  const vid = getOrCreateVisitorId();
  const utm = getUtmParams();
  const params = new URLSearchParams(window.location.search);
  try {
    await supabase.from("sessions").upsert(
      {
        session_id: sid,
        visitor_id: vid,
        device: getDeviceType(),
        utm_source: utm.utm_source || null,
        utm_campaign: utm.utm_campaign || null,
        utm_medium: utm.utm_medium || null,
        utm_content: utm.utm_content || null,
        utm_term: utm.utm_term || null,
        ttclid: params.get("ttclid") || null,
        referrer: getReferrer(),
      },
      { onConflict: "session_id", ignoreDuplicates: true }
    );
  } catch {}
}

// ── Update funnel state ──
const FUNNEL_PRIORITY: Record<string, number> = {
  visit: 1, view_content: 2, add_to_cart: 3, checkout: 4, pix_generated: 5, card_submitted: 5, purchase: 6,
};

const EVENT_TO_STAGE: Record<string, string> = {
  page_view: "visit",
  visitor_session: "visit",
  view_content: "view_content",
  scroll_depth: "view_content",
  click_product_image: "view_content",
  click_buy_button: "add_to_cart",
  checkout_initiated: "checkout",
  pix_generated: "pix_generated",
  card_submitted: "card_submitted",
  payment_confirmed: "purchase",
  pix_paid: "purchase",
  payment_started: "checkout",
};

async function updateFunnelState(eventName: string) {
  const stage = EVENT_TO_STAGE[eventName];
  if (!stage) return;
  const vid = getOrCreateVisitorId();
  const priority = FUNNEL_PRIORITY[stage] || 0;

  try {
    // Get current stage
    const { data } = await supabase.from("funnel_state").select("stage").eq("visitor_id", vid).maybeSingle();
    const currentPriority = data ? (FUNNEL_PRIORITY[data.stage] || 0) : 0;

    if (priority > currentPriority) {
      await supabase.from("funnel_state").upsert(
        { visitor_id: vid, stage, updated_at: new Date().toISOString() },
        { onConflict: "visitor_id" }
      );
    }
  } catch {}
}

// ── Deduplicated Page View Registration ──
const registeredPageViews = new Set<string>();

export function trackPageViewOnce(page: string): void {
  if (isBotUA()) return;

  const sessionId = getOrCreateSessionId();
  const key = `${sessionId}::${page}`;

  if (registeredPageViews.has(key)) return;

  const storageKey = `mesalar_pv_${page}`;
  if (sessionStorage.getItem(storageKey)) return;

  registeredPageViews.add(key);
  sessionStorage.setItem(storageKey, "1");

  supabase.from("page_views").insert({ page }).then(() => {});
  ensureSession();

  // Send visitor_session event only once per session (first page)
  if (!sessionStorage.getItem("crm_visit_sent")) {
    sessionStorage.setItem("crm_visit_sent", "1");
    const ctx = getVisitorContext();
    trackEvent("visitor_session", {
      page_url: window.location.href,
      screen_width: window.screen?.width || 0,
      screen_height: window.screen?.height || 0,
      ...ctx,
    });
  }

  trackEvent("page_view", { page, metric_type: "session" });
}

// ── Event Queue ──
let eventQueue: { event_type: string; event_data?: Json }[] = [];
let newEventsQueue: { visitor_id: string; session_id: string | null; event_name: string; value: number; source: string | null; campaign: string | null; event_data: Json }[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  // Flush old table (dual-write)
  if (eventQueue.length > 0) {
    const batch = [...eventQueue];
    eventQueue = [];
    supabase.from("user_events").insert(batch).then(() => {});
  }
  // Flush new events table
  if (newEventsQueue.length > 0) {
    const batch = [...newEventsQueue];
    newEventsQueue = [];
    supabase.from("events").insert(batch).then(() => {});
  }
}

export function trackEvent(event_type: string, event_data?: Record<string, string | number | boolean>) {
  if (event_type !== "js_error" && event_type !== "autocorrection" && isBotUA()) return;

  const context = getVisitorContext();
  const merged = { ...context, ...(event_data || {}) };

  // Old table (dual-write for compatibility)
  eventQueue.push({ event_type, event_data: merged as Json });

  // New events table
  const utm = getUtmParams();
  newEventsQueue.push({
    visitor_id: context.visitor_id,
    session_id: context.session_id || null,
    event_name: event_type,
    value: typeof event_data?.value === "number" ? event_data.value : 0,
    source: utm.utm_source || null,
    campaign: utm.utm_campaign || null,
    event_data: merged as Json,
  });

  // Update funnel state asynchronously
  updateFunnelState(event_type);

  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(flush, 2000);
}

// Flush on page unload
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", flush);
}

/**
 * Unified Tracking Module — Single entry point for all event tracking.
 * 
 * This file is a THIN WRAPPER that delegates to tracking-hub.ts.
 * It preserves backward-compatible exports (trackEvent, trackPageViewOnce, getTrackingContext)
 * while ensuring all events flow through the unified tracking-hub pipeline.
 * 
 * DO NOT add new tracking logic here. Use tracking-hub.ts directly.
 */
import { supabase } from "@/integrations/supabase/client";
import { trackFunnelEvent, type FunnelEvent } from "@/lib/tracking-hub";
import type { Json } from "@/integrations/supabase/types";

const db = supabase as any;

// ── Bot Detection ──
const BOT_UA = /bot|crawler|spider|headless|phantom|selenium|puppeteer|scrapy|slurp|wget|curl|scraper/i;
function isBotUA(): boolean {
  return BOT_UA.test(navigator.userAgent || "");
}

// ── Visitor ID — persistent via localStorage ──
function getOrCreateVisitorId(): string {
  const KEY = "mesalar_visitor_id";
  let id = localStorage.getItem(KEY);
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

// ── Click ID ──
function getOrCreateClickId(): string {
  const KEY = "mesalar_click_id";
  let id = sessionStorage.getItem(KEY);
  if (id) return id;
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get("click_id");
  if (fromUrl) { sessionStorage.setItem(KEY, fromUrl); return fromUrl; }
  const hasAdParams = params.get("utm_source") || params.get("fbclid") || params.get("gclid") || params.get("ttclid") || params.get("xcod");
  if (hasAdParams) {
    id = `c_${Math.random().toString(36).slice(2, 7)}_${Date.now()}`;
  } else {
    id = "organic";
  }
  sessionStorage.setItem(KEY, id);
  return id;
}

// ── Session ID with 30-min timeout ──
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const registeredPageViews = new Set<string>();

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

  const id = `s_${Math.random().toString(36).slice(2, 7)}_${now}`;
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

// Keep session alive
if (typeof window !== "undefined") {
  const touchSession = () => sessionStorage.setItem("mesalar_session_ts", String(Date.now()));
  window.addEventListener("click", touchSession, { passive: true });
  window.addEventListener("scroll", touchSession, { passive: true });
  window.addEventListener("keydown", touchSession, { passive: true });
}

// ── UTM Params ──
function getUtmParams(): Record<string, string> {
  const KEY = "mesalar_utm";
  const cached = sessionStorage.getItem(KEY);
  if (cached) { try { return JSON.parse(cached); } catch {} }

  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  ["utm_source", "utm_medium", "utm_campaign", "utm_adset", "utm_content", "utm_term"].forEach(k => {
    const v = params.get(k);
    if (v) utm[k] = v;
  });

  if (!utm.utm_source && document.referrer) {
    try {
      const host = new URL(document.referrer).hostname.toLowerCase();
      const ignored = ["lovable.dev", "healthkart.com", "kango-roo.com"];
      if (!ignored.some(d => host.includes(d))) {
        if (host.includes("tiktok")) utm.utm_source = "tiktok";
        else if (host.includes("facebook") || host.includes("instagram")) utm.utm_source = "facebook";
        else if (host.includes("google")) utm.utm_source = "google";
        else utm.utm_source = host;
      }
    } catch {}
  }

  if (Object.keys(utm).length > 0) sessionStorage.setItem(KEY, JSON.stringify(utm));
  return utm;
}

function getDeviceType(): string {
  return /mobile|android|iphone|ipad/i.test(navigator.userAgent) ? "Mobile" : "Desktop";
}

function getReferrer(): string {
  if (!document.referrer) return "direct";
  try { return new URL(document.referrer).hostname; } catch { return document.referrer; }
}

// ── Context ──
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

export function getTrackingContext(): Record<string, string> {
  return { ...getVisitorContext() };
}

// ── Ensure visitor & session in DB (called once) ──
let _visitorEnsured = false;
let _sessionEnsured = false;

async function ensureVisitor() {
  if (_visitorEnsured) return;
  _visitorEnsured = true;
  const vid = getOrCreateVisitorId();
  try {
    await db.from("visitors").upsert(
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
    await db.from("sessions").upsert({
      session_id: sid, visitor_id: vid, device: getDeviceType(),
      utm_source: utm.utm_source || null, utm_campaign: utm.utm_campaign || null,
      utm_medium: utm.utm_medium || null, utm_content: utm.utm_content || null,
      utm_term: utm.utm_term || null, ttclid: params.get("ttclid") || null,
      referrer: getReferrer(),
    }, { onConflict: "session_id", ignoreDuplicates: true });
  } catch {}
}

// ── Map old event names to funnel events ──
const LEGACY_TO_FUNNEL: Record<string, FunnelEvent> = {
  page_view: "page_view",
  view_content: "view_content",
  scroll_depth: "view_content",
  click_product_image: "view_content",
  click_buy_button: "click_buy",
  checkout_initiated: "checkout_start",
  payment_started: "checkout_start",
  pix_generated: "pix_generated",
  card_submitted: "add_payment_info",
  payment_confirmed: "purchase",
  pix_paid: "purchase",
};

// ── Page View (deduped, with session init) ──
export function trackPageViewOnce(page: string): void {
  if (isBotUA()) return;
  const sessionId = getOrCreateSessionId();
  const key = `${sessionId}::${page}`;
  if (registeredPageViews.has(key)) return;
  const storageKey = `mesalar_pv_${page}`;
  if (sessionStorage.getItem(storageKey)) return;

  registeredPageViews.add(key);
  sessionStorage.setItem(storageKey, "1");

  // Ensure visitor/session exist
  ensureSession();

  // Delegate to unified tracking hub
  trackFunnelEvent({ event: "page_view", properties: { page } });

  // Send visitor_session once per session
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
}

// ── Generic Event (backward-compatible) — delegates to tracking-hub when possible ──
export function trackEvent(event_type: string, event_data?: Record<string, string | number | boolean>) {
  if (event_type !== "js_error" && event_type !== "autocorrection" && isBotUA()) return;

  const context = getVisitorContext();
  const merged = { ...context, ...(event_data || {}) };

  // If this maps to a funnel event, delegate to tracking-hub (single pipeline)
  const funnelEvent = LEGACY_TO_FUNNEL[event_type];
  if (funnelEvent) {
    trackFunnelEvent({
      event: funnelEvent,
      properties: merged,
      value: typeof event_data?.value === "number" ? event_data.value : 0,
    });
    return;
  }

  // Non-funnel events: write directly to user_events only (no duplication)
  supabase.from("user_events").insert({
    event_type,
    event_data: merged as Json,
  }).then(() => {});
}

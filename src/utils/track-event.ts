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
  if (!id) {
    const rand = Math.random().toString(36).slice(2, 7);
    id = `v_${rand}_${Date.now()}`;
    localStorage.setItem(KEY, id);
  }
  return id;
}

// ── Click ID — generated when visitor comes from an ad (has UTM or ad click params) ──
function getOrCreateClickId(): string {
  const KEY = "mesalar_click_id";
  // Persist per session — one click_id per ad click
  let id = sessionStorage.getItem(KEY);
  if (id) return id;

  const params = new URLSearchParams(window.location.search);
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
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  if (eventQueue.length === 0) return;
  const batch = [...eventQueue];
  eventQueue = [];
  supabase.from("user_events").insert(batch).then(() => {});
}

export function trackEvent(event_type: string, event_data?: Record<string, string | number | boolean>) {
  if (event_type !== "js_error" && event_type !== "autocorrection" && isBotUA()) return;

  const context = getVisitorContext();
  const merged = { ...context, ...(event_data || {}) };
  eventQueue.push({ event_type, event_data: merged as Json });
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(flush, 2000);
}

// Flush on page unload
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", flush);
}

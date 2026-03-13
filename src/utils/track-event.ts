import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

// ── Visitor Context (persisted per session) ──
function getOrCreateVisitorId(): string {
  const KEY = "mesalar_visitor_id";
  let id = sessionStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(KEY, id);
  }
  return id;
}

function getUtmParams(): Record<string, string> {
  const KEY = "mesalar_utm";
  // Check if already captured this session
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

  // Also capture common ad platform params
  const extra = ["fbclid", "gclid", "ttclid", "xcod"];
  extra.forEach(k => {
    const v = params.get(k);
    if (v) utm[k] = v;
  });

  // Fallback: derive source from referrer
  if (!utm.utm_source && document.referrer) {
    try {
      const host = new URL(document.referrer).hostname.toLowerCase();
      if (host.includes("tiktok")) utm.utm_source = "tiktok";
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
function getVisitorContext(): Record<string, string> {
  if (_context) return _context;
  const utm = getUtmParams();
  _context = {
    visitor_id: getOrCreateVisitorId(),
    device: getDeviceType(),
    referrer: getReferrer(),
    user_agent: navigator.userAgent?.slice(0, 200) || "",
    ...utm,
  };
  return _context;
}

// ── Export context for other modules (e.g. Checkout metadata) ──
export function getTrackingContext(): Record<string, string> {
  return { ...getVisitorContext() };
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

/**
 * TikTok Tracking Module
 * Handles Pixel + Events API with deduplication, SHA256 hashing, UTM capture
 */

const PIXEL_ID = "D6JQATBC77UBUNE442EG";
const DEBUG_PREFIX = "[TikTok]";

// ── UTM / ttclid capture ──────────────────────────────────────────────

const TRACKED_PARAMS = [
  "ttclid",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
];

export function captureTrackingParams() {
  try {
    const params = new URLSearchParams(window.location.search);
    TRACKED_PARAMS.forEach((key) => {
      const value = params.get(key);
      if (value) {
        localStorage.setItem(`tt_${key}`, value);
        console.log(`${DEBUG_PREFIX} Captured ${key}:`, value);
      }
    });
  } catch (e) {
    console.warn(`${DEBUG_PREFIX} Error capturing params:`, e);
  }
}

export function getStoredParam(key: string): string | null {
  try {
    return localStorage.getItem(`tt_${key}`);
  } catch {
    return null;
  }
}

export function getAllTrackingParams(): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  TRACKED_PARAMS.forEach((key) => {
    result[key] = getStoredParam(key);
  });
  return result;
}

// ── SHA256 hashing ────────────────────────────────────────────────────

export async function sha256(value: string): Promise<string> {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "";
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ── Event ID generation ───────────────────────────────────────────────

export function generateEventId(): string {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// ── Identify user ─────────────────────────────────────────────────────

export async function identifyTikTokUser(data: {
  email?: string;
  phone?: string;
  externalId?: string;
}) {
  const ttq = (window as any).ttq;
  if (!ttq) {
    console.warn(`${DEBUG_PREFIX} ttq not loaded`);
    return;
  }

  const identifyData: Record<string, string> = {};

  if (data.email) {
    identifyData.email = await sha256(data.email);
  }
  if (data.phone) {
    // Normalize: remove non-digits, add +55 if needed
    let phone = data.phone.replace(/\D/g, "");
    if (!phone.startsWith("55")) phone = "55" + phone;
    identifyData.phone_number = await sha256(phone);
  }
  if (data.externalId) {
    identifyData.external_id = await sha256(data.externalId);
  }

  console.log(`${DEBUG_PREFIX} identify()`, identifyData);
  ttq.identify(identifyData);
}

// ── Store user data for server-side events ────────────────────────────

let _userData: {
  email_hash?: string;
  phone_hash?: string;
  external_id_hash?: string;
} = {};

export async function setUserData(data: {
  email?: string;
  phone?: string;
  externalId?: string;
}) {
  if (data.email) _userData.email_hash = await sha256(data.email);
  if (data.phone) {
    let phone = data.phone.replace(/\D/g, "");
    if (!phone.startsWith("55")) phone = "55" + phone;
    _userData.phone_hash = await sha256(phone);
  }
  if (data.externalId) _userData.external_id_hash = await sha256(data.externalId);
}

export function getUserData() {
  return _userData;
}

// ── Track event (Pixel + Events API) ──────────────────────────────────

interface TrackEventOptions {
  event: string;
  properties?: Record<string, any>;
  userData?: {
    email?: string;
    phone?: string;
    externalId?: string;
  };
}

export async function trackTikTokEvent(options: TrackEventOptions) {
  const { event, properties = {}, userData } = options;
  const eventId = generateEventId();
  const timestamp = new Date().toISOString();
  const ttclid = getStoredParam("ttclid");

  // If user data passed, hash and store it
  if (userData) {
    await setUserData(userData);
    await identifyTikTokUser(userData);
  }

  // 1. Browser-side Pixel event
  const ttq = (window as any).ttq;
  if (ttq) {
    try {
      ttq.track(event, properties, { event_id: eventId });
      console.log(`${DEBUG_PREFIX} ${event} fired`, { eventId, properties });
    } catch (e) {
      console.warn(`${DEBUG_PREFIX} Pixel error:`, e);
    }
  } else {
    console.warn(`${DEBUG_PREFIX} ttq not available for "${event}"`);
  }

  // 2. Server-side Events API
  const storedUser = getUserData();
  const serverPayload = {
    event,
    event_id: eventId,
    timestamp,
    pixel_code: PIXEL_ID,
    user: {
      email: storedUser.email_hash || "",
      phone_number: storedUser.phone_hash || "",
      external_id: storedUser.external_id_hash || "",
      ttclid: ttclid || "",
      user_agent: navigator.userAgent,
    },
    properties,
  };

  console.log(`${DEBUG_PREFIX} Server event payload:`, serverPayload);

  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    fetch(`${supabaseUrl}/functions/v1/tiktok-events-api`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseKey}`,
        apikey: supabaseKey,
      },
      body: JSON.stringify(serverPayload),
    })
      .then((res) => res.json())
      .then((data) => console.log(`${DEBUG_PREFIX} Server response:`, data))
      .catch((err) => console.warn(`${DEBUG_PREFIX} Server error:`, err));
  } catch (e) {
    console.warn(`${DEBUG_PREFIX} Server send error:`, e);
  }
}

// ── Page view for SPA ─────────────────────────────────────────────────

export function trackPageView() {
  const ttq = (window as any).ttq;
  if (ttq) {
    ttq.page();
    console.log(`${DEBUG_PREFIX} page() fired`);
  }
}

// ── Init (call on app mount) ──────────────────────────────────────────

export function initTikTokTracking() {
  captureTrackingParams();
  console.log(`${DEBUG_PREFIX} Tracking initialized. Params:`, getAllTrackingParams());
}

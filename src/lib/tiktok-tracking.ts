/**
 * TikTok Tracking Module
 * Handles Pixel + Events API with deduplication, SHA256 hashing, UTM capture
 */

const PIXEL_ID = "D6GM4RBC77UAAN00B800";
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

/**
 * Normalize phone to E.164 format for Brazil: +55XXXXXXXXXXX
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55")) return "+" + digits;
  return "+55" + digits;
}

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

  // ttq.identify() expects RAW (unhashed) values — the Pixel SDK hashes internally
  const identifyData: Record<string, string> = {};

  if (data.email) {
    identifyData.email = data.email.trim().toLowerCase();
  }
  if (data.phone) {
    identifyData.phone_number = normalizePhone(data.phone);
  }
  if (data.externalId) {
    identifyData.external_id = data.externalId.replace(/\D/g, "");
  }

  console.log(`${DEBUG_PREFIX} identify() RAW (Pixel hashes internally)`, identifyData);
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
    // Hash normalized E.164 digits (without +) for server-side
    const normalized = normalizePhone(data.phone).replace("+", "");
    _userData.phone_hash = await sha256(normalized);
  }
  if (data.externalId) _userData.external_id_hash = await sha256(data.externalId.replace(/\D/g, ""));
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
      page_url: window.location.href,
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

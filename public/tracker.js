/**
 * FunnelIQ Tracker v2.0
 * Drop-in tracking script for any funnel page.
 * Reuses existing mesalar_* IDs if present (backward compatible).
 *
 * Usage:
 *   <script src="/tracker.js" data-site-id="YOUR_SITE_ID" data-endpoint="https://YOUR_SUPABASE.supabase.co"></script>
 *
 * Manual events:
 *   window.FunnelIQ.track("click_buy", { product: "mesa" });
 *   window.FunnelIQ.identify({ email: "user@example.com", phone: "11999999999" });
 *
 * Auto-captured: page_view, view_content (after 1s)
 * Bot/Health-check detection via user-agent.
 */
(function () {
  "use strict";

  if (typeof window === "undefined") return;

  // ── Prevent double-init ──
  if (window.__fiq_loaded) return;
  window.__fiq_loaded = true;

  // ── Bot detection ──
  var ua = navigator.userAgent || "";
  var BOT = /bot|crawler|spider|headless|phantom|selenium|puppeteer|scrapy|slurp|wget|curl|scraper/i;
  var isBot = BOT.test(ua);
  var isHealthCheck = /FunnelIQ Health Check/i.test(ua);
  if (isBot && !isHealthCheck) return;

  // ── Config from script tag ──
  var scriptTag = document.currentScript || document.querySelector("script[data-site-id]");
  var siteId = scriptTag ? scriptTag.getAttribute("data-site-id") : null;
  var ENDPOINT = scriptTag ? scriptTag.getAttribute("data-endpoint") : null;

  if (!ENDPOINT) {
    try {
      var src = scriptTag ? scriptTag.src : "";
      if (src) ENDPOINT = new URL(src).origin;
    } catch (e) {}
  }

  if (!ENDPOINT) {
    console.warn("[FunnelIQ] No endpoint. Events will not be sent.");
    return;
  }

  var INGEST_URL = ENDPOINT + "/functions/v1/tracker-ingest";

  // ── Reuse existing IDs (backward compatible with mesalar_*) ──
  function getVisitorId() {
    try {
      var id = localStorage.getItem("mesalar_visitor_id") || localStorage.getItem("fiq_visitor_id");
      if (!id) {
        var params = new URLSearchParams(window.location.search);
        id = params.get("visitor_id");
      }
      if (!id) {
        id = "v_" + Math.random().toString(36).slice(2, 7) + "_" + Date.now();
      }
      localStorage.setItem("mesalar_visitor_id", id);
      localStorage.setItem("fiq_visitor_id", id);
      return id;
    } catch (e) { return "v_fallback_" + Date.now(); }
  }

  function getSessionId() {
    try {
      var KEY = "mesalar_session_id";
      var TS_KEY = "mesalar_session_ts";
      var TIMEOUT = 30 * 60 * 1000;
      var now = Date.now();
      var existing = sessionStorage.getItem(KEY);
      var lastActivity = Number(sessionStorage.getItem(TS_KEY) || "0");

      if (existing && (now - lastActivity) < TIMEOUT) {
        sessionStorage.setItem(TS_KEY, String(now));
        return existing;
      }

      var id = "s_" + Math.random().toString(36).slice(2, 7) + "_" + now;
      sessionStorage.setItem(KEY, id);
      sessionStorage.setItem(TS_KEY, String(now));
      return id;
    } catch (e) { return "s_fallback_" + Date.now(); }
  }

  function getClickId() {
    try {
      var KEY = "mesalar_click_id";
      var id = sessionStorage.getItem(KEY);
      if (id) return id;
      var params = new URLSearchParams(window.location.search);
      var fromUrl = params.get("click_id");
      if (fromUrl) { sessionStorage.setItem(KEY, fromUrl); return fromUrl; }
      var hasAd = params.get("utm_source") || params.get("fbclid") || params.get("gclid") || params.get("ttclid");
      id = hasAd ? ("c_" + Math.random().toString(36).slice(2, 7) + "_" + Date.now()) : "organic";
      sessionStorage.setItem(KEY, id);
      return id;
    } catch (e) { return "organic"; }
  }

  var visitorId = getVisitorId();
  var sessionId = getSessionId();
  var clickId = getClickId();

  // ── UTM ──
  function getUtm() {
    try {
      var cached = sessionStorage.getItem("mesalar_utm");
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    var params = new URLSearchParams(window.location.search);
    var utm = {};
    ["utm_source", "utm_medium", "utm_campaign", "utm_adset", "utm_content", "utm_term"].forEach(function (k) {
      var v = params.get(k);
      if (v) utm[k] = v;
    });
    if (!utm.utm_source && document.referrer) {
      try {
        var host = new URL(document.referrer).hostname.toLowerCase();
        if (host.indexOf("tiktok") !== -1) utm.utm_source = "tiktok";
        else if (host.indexOf("facebook") !== -1 || host.indexOf("instagram") !== -1) utm.utm_source = "facebook";
        else if (host.indexOf("google") !== -1) utm.utm_source = "google";
      } catch (e) {}
    }
    if (Object.keys(utm).length > 0) {
      try { sessionStorage.setItem("mesalar_utm", JSON.stringify(utm)); } catch (e) {}
    }
    return utm;
  }

  var device = /mobile|android|iphone|ipad/i.test(ua) ? "Mobile" : "Desktop";
  var utmData = getUtm();

  // ── Dedup (per session) ──
  var sentEvents = {};

  function dedupKey(eventName, extra) {
    return sessionId + "::" + eventName + (extra || "");
  }

  // ── Send ──
  function sendEvent(eventName, properties) {
    var key = dedupKey(eventName, properties && properties.page);
    
    // Allow duplicate for some events
    var dedupEvents = { page_view: true, view_content: true, checkout_start: true };
    if (dedupEvents[eventName] && sentEvents[key]) return;
    sentEvents[key] = true;

    var payload = {
      site_id: siteId,
      event_name: eventName,
      visitor_id: visitorId,
      session_id: sessionId,
      click_id: clickId,
      page_url: window.location.href,
      referrer: document.referrer || "direct",
      device: device,
      user_agent: ua.slice(0, 200),
      timestamp: new Date().toISOString(),
      properties: Object.assign({}, utmData, properties || {}),
      is_health_check: isHealthCheck,
    };

    var body = JSON.stringify(payload);

    if (navigator.sendBeacon) {
      try {
        var blob = new Blob([body], { type: "application/json" });
        var sent = navigator.sendBeacon(INGEST_URL, blob);
        if (sent) return;
      } catch (e) {}
    }

    // Fallback to fetch
    try {
      fetch(INGEST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body,
        keepalive: true,
      }).catch(function () {});
    } catch (e) {}
  }

  // ── Auto-track page_view ──
  function autoTrackPageView() {
    sendEvent("page_view", { page: window.location.pathname });
  }

  // ── Auto-track view_content ──
  function autoTrackViewContent() {
    var path = window.location.pathname;
    if (path === "/" || path === "/index" || path === "/produto" || path === "/oferta") {
      sendEvent("view_content", { page: path });
    }
  }

  // ── User data for server-side matching ──
  var userData = {};

  // ── Public API ──
  window.FunnelIQ = {
    track: function (eventName, properties) {
      sendEvent(eventName, properties || {});
    },
    identify: function (data) {
      userData = Object.assign(userData, data || {});
      // Store for cross-page persistence
      try { sessionStorage.setItem("fiq_user", JSON.stringify(userData)); } catch (e) {}
    },
    getVisitorId: function () { return visitorId; },
    getSessionId: function () { return sessionId; },
    getClickId: function () { return clickId; },
  };

  // ── Init ──
  autoTrackPageView();
  setTimeout(autoTrackViewContent, 1000);

  // Keep session alive
  var touchSession = function () {
    try { sessionStorage.setItem("mesalar_session_ts", String(Date.now())); } catch (e) {}
  };
  window.addEventListener("click", touchSession, { passive: true });
  window.addEventListener("scroll", touchSession, { passive: true });

  // SPA route change detection
  var lastPath = window.location.pathname;
  var observer = new MutationObserver(function () {
    if (window.location.pathname !== lastPath) {
      lastPath = window.location.pathname;
      autoTrackPageView();
      setTimeout(autoTrackViewContent, 500);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  console.log("[FunnelIQ] Tracker v2.0 loaded | site=" + siteId + " | visitor=" + visitorId);
})();

/**
 * FunnelIQ Tracker v1.0
 * Drop this script on any page to send funnel events to FunnelIQ.
 *
 * Usage:
 *   <script src="https://YOUR_DOMAIN/tracker.js" data-site-id="YOUR_SITE_ID"></script>
 *
 * The script automatically captures page_view and view_content.
 * Call window.FunnelIQ.track(eventName, properties) for manual events.
 */
(function () {
  "use strict";

  // ── Bot guard ──
  var BOT = /bot|crawler|spider|headless|phantom|selenium|puppeteer|FunnelIQ Health Check/i;
  var isBot = BOT.test(navigator.userAgent || "");
  var isHealthCheck = /FunnelIQ Health Check/i.test(navigator.userAgent || "");

  // ── Config ──
  var scriptTag = document.currentScript || document.querySelector('script[data-site-id]');
  var siteId = scriptTag ? scriptTag.getAttribute("data-site-id") : null;
  var ENDPOINT = scriptTag ? scriptTag.getAttribute("data-endpoint") : null;

  if (!ENDPOINT) {
    // Derive from script src
    try {
      var src = scriptTag ? scriptTag.src : "";
      if (src) {
        var url = new URL(src);
        ENDPOINT = url.origin;
      }
    } catch (e) {}
  }

  // Fallback: use Supabase edge function
  if (!ENDPOINT) {
    console.warn("[FunnelIQ] No endpoint configured. Events will not be sent.");
    return;
  }

  // ── Visitor / Session ──
  function getId(storage, key, prefix) {
    try {
      var id = storage.getItem(key);
      if (!id) {
        id = prefix + "_" + Math.random().toString(36).slice(2, 7) + "_" + Date.now();
        storage.setItem(key, id);
      }
      return id;
    } catch (e) {
      return prefix + "_fallback_" + Date.now();
    }
  }

  var visitorId = getId(localStorage, "fiq_visitor_id", "v");
  var sessionId = getId(sessionStorage, "fiq_session_id", "s");

  // ── UTM ──
  function getUtm() {
    var params = new URLSearchParams(window.location.search);
    var utm = {};
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach(function (k) {
      var v = params.get(k);
      if (v) utm[k] = v;
    });
    return utm;
  }

  // ── Send event ──
  function sendEvent(eventName, properties) {
    if (isBot && !isHealthCheck) return;

    var payload = {
      site_id: siteId,
      event_name: eventName,
      visitor_id: visitorId,
      session_id: sessionId,
      page_url: window.location.href,
      referrer: document.referrer || "direct",
      device: /mobile|android|iphone|ipad/i.test(navigator.userAgent) ? "Mobile" : "Desktop",
      user_agent: (navigator.userAgent || "").slice(0, 200),
      timestamp: new Date().toISOString(),
      properties: Object.assign({}, getUtm(), properties || {}),
      is_health_check: isHealthCheck,
    };

    // Use sendBeacon for reliability, fallback to fetch
    var url = ENDPOINT + "/functions/v1/tracker-ingest";
    var body = JSON.stringify(payload);

    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, body);
    } else {
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body,
        keepalive: true,
      }).catch(function () {});
    }
  }

  // ── Auto-track page_view ──
  var tracked = {};
  function trackPageView() {
    var page = window.location.pathname;
    if (tracked["pv_" + page]) return;
    tracked["pv_" + page] = true;
    sendEvent("page_view", { page: page });
  }

  // ── Auto-track view_content on landing page ──
  function trackViewContent() {
    if (tracked["vc"]) return;
    tracked["vc"] = true;
    sendEvent("view_content", { page: window.location.pathname });
  }

  // ── Public API ──
  window.FunnelIQ = {
    track: sendEvent,
    getVisitorId: function () { return visitorId; },
    getSessionId: function () { return sessionId; },
  };

  // ── Init ──
  trackPageView();
  setTimeout(trackViewContent, 1000);

  // SPA support
  var lastPath = window.location.pathname;
  setInterval(function () {
    if (window.location.pathname !== lastPath) {
      lastPath = window.location.pathname;
      trackPageView();
    }
  }, 500);
})();

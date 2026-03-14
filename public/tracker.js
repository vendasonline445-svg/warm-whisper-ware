/**
 * FunnelIQ Tracker v4.0 — Configurable Precision Tracking
 * Loads selectors & URLs from remote config (site_tracking_config table).
 * Falls back to heuristic detection if no config is found.
 *
 * Usage:
 *   <script src="https://YOUR-DOMAIN/tracker.js" data-site-id="YOUR_SITE_ID" data-endpoint="https://YOUR.supabase.co" data-anon-key="YOUR_ANON_KEY" async></script>
 *
 * Auto-detected events:
 *   page_view      — on page load + SPA navigation
 *   view_content   — on landing/product pages after 1s
 *   click_buy      — click on buy/add-to-cart buttons (config or heuristic)
 *   checkout_start — navigation to checkout URLs (config or heuristic)
 *   add_payment_info — interaction with payment forms (config or heuristic)
 *   pix_generated  — PIX QR code detected (config or heuristic)
 *
 * Purchase is NOT fired from frontend — it comes exclusively from server-side webhooks.
 *
 * Manual override:
 *   window.FunnelIQ.track("event_name", { key: "value" });
 *   window.FunnelIQ.identify({ email: "x@y.com", phone: "119..." });
 */
(function () {
  "use strict";
  if (typeof window === "undefined") return;
  if (window.__fiq_loaded) return;
  window.__fiq_loaded = true;

  // ── Bot guard ──
  var ua = navigator.userAgent || "";
  var BOT = /bot|crawler|spider|headless|phantom|selenium|puppeteer|scrapy|slurp|wget|curl|scraper/i;
  var isBot = BOT.test(ua);
  var isHealthCheck = /FunnelIQ Health Check/i.test(ua);
  if (isBot && !isHealthCheck) return;

  // ── Script config ──
  var scriptTag = document.currentScript || document.querySelector("script[data-site-id]");
  var SITE_ID = scriptTag ? scriptTag.getAttribute("data-site-id") : null;
  var ENDPOINT = scriptTag ? scriptTag.getAttribute("data-endpoint") : null;
  var ANON_KEY = scriptTag ? scriptTag.getAttribute("data-anon-key") : null;
  if (!ENDPOINT) {
    try { if (scriptTag && scriptTag.src) ENDPOINT = new URL(scriptTag.src).origin; } catch (e) {}
  }
  if (!ENDPOINT) { console.warn("[FunnelIQ] No endpoint configured."); return; }
  var INGEST_URL = ENDPOINT + "/functions/v1/tracker-ingest";

  // ── Remote config (loaded async) ──
  var config = null;

  // ── Storage helpers (fiq_* primary, mesalar_* fallback read) ──
  var PREFIX = 'fiq_';
  var LEGACY = 'mesalar_';

  function storeGet(s, k) {
    try { return s.getItem(PREFIX + k) || s.getItem(LEGACY + k) || null; } catch (e) { return null; }
  }
  function storeSet(s, k, v) {
    try { s.setItem(PREFIX + k, v); } catch (e) {}
  }

  function getVisitorId() {
    var id = storeGet(localStorage, "visitor_id");
    if (!id) { try { id = new URLSearchParams(window.location.search).get("visitor_id"); } catch (e) {} }
    if (!id) id = "v_" + Math.random().toString(36).slice(2, 7) + "_" + Date.now();
    storeSet(localStorage, "visitor_id", id);
    return id;
  }

  function getSessionId() {
    var TIMEOUT = 1800000;
    var now = Date.now(), existing = storeGet(sessionStorage, "session_id");
    var last = Number(storeGet(sessionStorage, "session_ts") || "0");
    if (existing && (now - last) < TIMEOUT) { storeSet(sessionStorage, "session_ts", String(now)); return existing; }
    var id = "s_" + Math.random().toString(36).slice(2, 7) + "_" + now;
    storeSet(sessionStorage, "session_id", id);
    storeSet(sessionStorage, "session_ts", String(now));
    return id;
  }

  function getClickId() {
    var id = storeGet(sessionStorage, "click_id");
    if (id) return id;
    try { var p = new URLSearchParams(window.location.search);
      var fromUrl = p.get("click_id"); if (fromUrl) { storeSet(sessionStorage, "click_id", fromUrl); return fromUrl; }
      var hasAd = p.get("utm_source") || p.get("fbclid") || p.get("gclid") || p.get("ttclid");
      id = hasAd ? ("c_" + Math.random().toString(36).slice(2, 7) + "_" + Date.now()) : "organic";
    } catch (e) { id = "organic"; }
    storeSet(sessionStorage, "click_id", id);
    return id;
  }

  var visitorId = getVisitorId(), sessionId = getSessionId(), clickId = getClickId();
  var device = /mobile|android|iphone|ipad/i.test(ua) ? "Mobile" : "Desktop";

  // ── UTM ──
  function getUtm() {
    try { var c = storeGet(sessionStorage, "utm"); if (c) return JSON.parse(c); } catch (e) {}
    var u = {}; try {
      var p = new URLSearchParams(window.location.search);
      ["utm_source","utm_medium","utm_campaign","utm_adset","utm_content","utm_term"].forEach(function(k) {
        var v = p.get(k); if (v) u[k] = v;
      });
    } catch (e) {}
    if (!u.utm_source && document.referrer) {
      try { var h = new URL(document.referrer).hostname.toLowerCase();
        if (h.indexOf("tiktok") !== -1) u.utm_source = "tiktok";
        else if (h.indexOf("facebook") !== -1 || h.indexOf("instagram") !== -1) u.utm_source = "facebook";
        else if (h.indexOf("google") !== -1) u.utm_source = "google";
      } catch (e) {}
    }
    if (Object.keys(u).length) storeSet(sessionStorage, "utm", JSON.stringify(u));
    return u;
  }
  var utmData = getUtm();

  // ── Dedup ──
  var sent = {};
  function dedupOk(name, extra) {
    var k = sessionId + "::" + name + (extra || "");
    if (sent[k]) return false;
    sent[k] = true;
    return true;
  }

  // ── Send ──
  function getCachedIdentity() {
    try {
      var raw = localStorage.getItem('fiq_user_identity');
      if (!raw) return {};
      var parsed = JSON.parse(raw);
      if (Date.now() - parsed.cached_at > 30 * 24 * 60 * 60 * 1000) {
        localStorage.removeItem('fiq_user_identity');
        return {};
      }
      var result = {};
      if (parsed.email_hash) result.email = parsed.email_hash;
      if (parsed.phone_hash) result.phone_number = parsed.phone_hash;
      if (parsed.external_id) result.external_id = parsed.external_id;
      return result;
    } catch (e) { return {}; }
  }

  function sendEvent(name, props) {
    var identity = getCachedIdentity();
    var payload = JSON.stringify({
      site_id: SITE_ID, event_name: name, visitor_id: visitorId,
      session_id: sessionId, click_id: clickId,
      page_url: window.location.href, referrer: document.referrer || "direct",
      device: device, user_agent: ua.slice(0, 200),
      timestamp: new Date().toISOString(),
      properties: Object.assign({}, utmData, props || {}, identity, { currency: "BRL" }),
      is_health_check: isHealthCheck,
    });
    try {
      var blob = new Blob([payload], { type: "application/json" });
      if (navigator.sendBeacon && navigator.sendBeacon(INGEST_URL, blob)) return;
    } catch (e) {}
    try { fetch(INGEST_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true }).catch(function(){}); } catch (e) {}
  }

  // ── Keep session alive ──
  function touch() { storeSet(sessionStorage, "session_ts", String(Date.now())); }
  window.addEventListener("click", touch, { passive: true });
  window.addEventListener("scroll", touch, { passive: true });

  // ══════════════════════════════════════════════════════════════
  // REMOTE CONFIG LOADER
  // ══════════════════════════════════════════════════════════════

  async function loadConfig() {
    if (!SITE_ID || !ANON_KEY) return null;
    try {
      var res = await fetch(
        ENDPOINT + "/rest/v1/site_tracking_config?site_id=eq." + SITE_ID + "&select=*",
        {
          headers: {
            "apikey": ANON_KEY,
            "Content-Type": "application/json",
          }
        }
      );
      var data = await res.json();
      config = data && data[0] ? data[0] : null;
    } catch (e) {
      config = null;
    }
    return config;
  }

  // ══════════════════════════════════════════════════════════════
  // AUTO-DETECTION ENGINE (config-aware)
  // ══════════════════════════════════════════════════════════════

  var path = window.location.pathname.toLowerCase();

  // ── 1. PAGE VIEW (always) ──
  function firePageView() {
    var p = window.location.pathname.toLowerCase();
    if (dedupOk("page_view", p)) sendEvent("page_view", { page: p });
  }

  // ── 2. VIEW CONTENT (product/landing pages) ──
  var LANDING_PATTERNS = /^\/$|\/index|\/produto|\/oferta|\/product|\/landing|\/lp|\/vsl/;
  function fireViewContent() {
    var p = window.location.pathname.toLowerCase();
    if (LANDING_PATTERNS.test(p) && dedupOk("view_content")) {
      sendEvent("view_content", { page: p });
    }
  }

  // ── 3. CLICK BUY — uses config.selector_buy_button with heuristic fallback ──
  var BUY_WORDS = /comprar|buy|adicionar|add.to.cart|compre|quero|pedir|garantir|aproveitar|eu quero|finalizar|order/i;
  var BUY_CLASSES = /btn.buy|btn.comprar|buy.button|add.to.cart|cta.button|comprar|checkout/i;

  function setupClickBuyListener() {
    document.addEventListener("click", function (e) {
      var el = e.target;

      // If config has specific selectors, try them first
      if (config && config.selector_buy_button) {
        var selectors = config.selector_buy_button.split(",").map(function(s) { return s.trim(); });
        for (var s = 0; s < selectors.length; s++) {
          try {
            if (el.matches(selectors[s]) || el.closest(selectors[s])) {
              if (dedupOk("click_buy")) {
                var val = extractValue();
                sendEvent("click_buy", { button_text: (el.textContent || "").trim().slice(0, 50), page: window.location.pathname, value: val });
              }
              return;
            }
          } catch (ex) {}
        }
      }

      // Heuristic fallback
      for (var i = 0; i < 4 && el && el !== document.body; i++) {
        var tag = (el.tagName || "").toLowerCase();
        if (tag === "button" || tag === "a" || (tag === "input" && el.type === "submit")) {
          var text = (el.textContent || el.value || "").trim();
          var cls = el.className || "";
          var id = el.id || "";
          var dataFiq = el.getAttribute("data-fiq") || "";

          if (dataFiq === "click_buy" || BUY_WORDS.test(text) || BUY_CLASSES.test(cls) || BUY_CLASSES.test(id)) {
            if (dedupOk("click_buy")) {
              var val = extractValue();
              sendEvent("click_buy", { button_text: text.slice(0, 50), page: window.location.pathname, value: val });
            }
            return;
          }
        }
        el = el.parentElement;
      }
    }, true);
  }

  // ── Value extraction — uses config.value_static / config.selector_price ──
  function extractValue() {
    if (config && config.value_static) return config.value_static;
    if (config && config.selector_price) {
      var selectors = config.selector_price.split(",").map(function(s) { return s.trim(); });
      for (var i = 0; i < selectors.length; i++) {
        try {
          var el = document.querySelector(selectors[i]);
          if (el) {
            var attr = config.value_attribute || "data-price";
            var attrVal = el.getAttribute(attr);
            if (attrVal) return parseFloat(attrVal.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
            var text = (el.textContent || "").replace(/[^\d.,]/g, "").replace(",", ".");
            if (text) return parseFloat(text) || 0;
          }
        } catch (ex) {}
      }
    }
    return 0;
  }

  // ── 4. CHECKOUT START — uses config.url_checkout with heuristic fallback ──
  var CHECKOUT_PATTERNS = /\/checkout|\/carrinho|\/cart|\/pagamento|\/payment|\/pedido|\/order|\/finalizar/;

  function fireCheckoutStart() {
    var p = window.location.pathname.toLowerCase();
    var matched = false;

    if (config && config.url_checkout) {
      var urls = config.url_checkout.split(",").map(function(s) { return s.trim().toLowerCase(); });
      for (var i = 0; i < urls.length; i++) {
        if (p.indexOf(urls[i]) !== -1) { matched = true; break; }
      }
    }

    if (!matched) matched = CHECKOUT_PATTERNS.test(p);

    if (matched && dedupOk("checkout_start")) {
      sendEvent("checkout_start", { page: p });
    }
  }

  // ── 5. ADD PAYMENT INFO — uses config.selector_checkout_form with heuristic fallback ──
  var PAYMENT_SELECTORS_FALLBACK = [
    'input[name*="card"]', 'input[name*="cartao"]', 'input[name*="cc_"]',
    'input[placeholder*="cartão"]', 'input[placeholder*="card"]',
    'input[name*="cpf"]', 'input[name*="cvv"]',
    'input[autocomplete="cc-number"]', 'input[autocomplete="cc-exp"]',
    '[data-fiq="payment"]',
  ];
  var paymentDetected = false;

  function firePaymentInfo() {
    if (paymentDetected) return;

    var selectors = [];

    // Config selectors first
    if (config && config.selector_checkout_form) {
      selectors = config.selector_checkout_form.split(",").map(function(s) { return s.trim(); });
    }

    // If no config selectors or they found nothing, add fallback
    if (selectors.length === 0) {
      selectors = PAYMENT_SELECTORS_FALLBACK;
    }

    // Try to find and listen on form elements
    for (var i = 0; i < selectors.length; i++) {
      try {
        var els = document.querySelectorAll(selectors[i]);
        for (var j = 0; j < els.length; j++) {
          els[j].addEventListener("input", function onInput() {
            if (!paymentDetected && dedupOk("add_payment_info")) {
              paymentDetected = true;
              sendEvent("add_payment_info", { page: window.location.pathname });
            }
          }, { once: true });
        }
      } catch (ex) {}
    }

    // PIX button detection (heuristic, always active)
    var pixBtns = document.querySelectorAll('[data-fiq="pix"], button, label, div');
    for (var k = 0; k < pixBtns.length; k++) {
      var txt = (pixBtns[k].textContent || "").toLowerCase();
      if (/pix|qr.code/i.test(txt) && /selec|escolh|pagar|pagamento/i.test(txt)) {
        pixBtns[k].addEventListener("click", function () {
          if (!paymentDetected && dedupOk("add_payment_info")) {
            paymentDetected = true;
            sendEvent("add_payment_info", { method: "pix", page: window.location.pathname });
          }
        }, { once: true });
      }
    }
  }

  // ── 6. PIX GENERATED — uses config.selector_pix_qrcode with heuristic fallback ──
  var PIX_URL_PATTERNS = /\/pix|\/qrcode|\/qr-code/;
  var PIX_CONTENT = /copia.e.cola|copiar.código|código.pix|qr.code.pix|pague.com.pix|escaneie/i;

  function firePixGenerated() {
    var p = window.location.pathname.toLowerCase();

    // Config-based detection
    if (config && config.selector_pix_qrcode) {
      var selectors = config.selector_pix_qrcode.split(",").map(function(s) { return s.trim(); });
      for (var i = 0; i < selectors.length; i++) {
        try {
          if (document.querySelector(selectors[i])) {
            if (dedupOk("pix_generated")) {
              sendEvent("pix_generated", { page: p, detection: "config" });
            }
            return;
          }
        } catch (ex) {}
      }
    }

    // Heuristic fallback: URL pattern
    if (PIX_URL_PATTERNS.test(p) && dedupOk("pix_generated")) {
      sendEvent("pix_generated", { page: p, detection: "url" });
      return;
    }

    // Heuristic fallback: page content
    var body = document.body ? (document.body.innerText || "") : "";
    if (PIX_CONTENT.test(body)) {
      var hasQR = document.querySelector('canvas, img[src*="qr"], img[alt*="qr"], img[alt*="pix"], [data-fiq="pix"]');
      if (hasQR && dedupOk("pix_generated")) {
        sendEvent("pix_generated", { page: p, detection: "content" });
      }
    }
  }

  // ── 7. PURCHASE FALLBACK — only fires on config.url_thankyou match ──
  // Purchase should come from server-side webhook. This is a last-resort fallback only.
  function firePurchaseFallback() {
    var p = window.location.pathname.toLowerCase();
    if (!config || !config.url_thankyou) return; // No config = no fallback

    var urls = config.url_thankyou.split(",").map(function(s) { return s.trim().toLowerCase(); });
    for (var i = 0; i < urls.length; i++) {
      if (urls[i] && p.indexOf(urls[i]) !== -1) {
        if (dedupOk("purchase")) {
          sendEvent("purchase", { page: p, detection: "url_fallback" });
        }
        return;
      }
    }
  }

  // ══════════════════════════════════════════════════════════════
  // SPA NAVIGATION OBSERVER
  // ══════════════════════════════════════════════════════════════

  var lastPath = window.location.pathname;

  function onRouteChange() {
    var newPath = window.location.pathname;
    if (newPath === lastPath) return;
    lastPath = newPath;

    firePageView();
    setTimeout(fireViewContent, 500);
    fireCheckoutStart();
    setTimeout(firePaymentInfo, 1500);
    setTimeout(firePixGenerated, 2000);
    setTimeout(firePurchaseFallback, 2000);
  }

  try {
    new MutationObserver(onRouteChange).observe(document.body, { childList: true, subtree: true });
  } catch (e) {}

  try {
    var origPush = history.pushState;
    var origReplace = history.replaceState;
    history.pushState = function () { origPush.apply(this, arguments); setTimeout(onRouteChange, 100); };
    history.replaceState = function () { origReplace.apply(this, arguments); setTimeout(onRouteChange, 100); };
    window.addEventListener("popstate", function () { setTimeout(onRouteChange, 100); });
  } catch (e) {}

  // ══════════════════════════════════════════════════════════════
  // INIT — load config then setup detectors
  // ══════════════════════════════════════════════════════════════

  async function init() {
    // Load remote config
    await loadConfig();

    // Fire immediate events
    firePageView();
    setTimeout(fireViewContent, 1000);
    fireCheckoutStart();

    // Setup listeners
    setupClickBuyListener();
    setTimeout(firePaymentInfo, 2000);
    setTimeout(firePixGenerated, 3000);
    setTimeout(firePurchaseFallback, 2500);
  }

  init();

  // ══════════════════════════════════════════════════════════════
  // PUBLIC API
  // ══════════════════════════════════════════════════════════════

  window.FunnelIQ = {
    track: function (name, props) { if (dedupOk(name, JSON.stringify(props))) sendEvent(name, props || {}); },
    identify: function (data) { storeSet(sessionStorage, "user", JSON.stringify(data || {})); },
    getVisitorId: function () { return visitorId; },
    getSessionId: function () { return sessionId; },
    getClickId: function () { return clickId; },
  };

  console.log("[FunnelIQ] Tracker v4.0 loaded | site=" + SITE_ID + " | visitor=" + visitorId + " | config-driven");
})();

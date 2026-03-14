/**
 * FunnelIQ Tracker v3.0 — Universal Auto-Detection
 * Drop-in tracking for ANY funnel. Auto-detects all 7 funnel events.
 *
 * Usage:
 *   <script src="/tracker.js" data-site-id="YOUR_SITE_ID" data-endpoint="https://YOUR.supabase.co"></script>
 *
 * Auto-detected events:
 *   page_view      — on page load + SPA navigation
 *   view_content   — on landing/product pages after 1s
 *   click_buy      — click on buy/add-to-cart buttons (detected by text/class)
 *   checkout_start — navigation to checkout-like URLs
 *   add_payment_info — interaction with payment forms (card/pix)
 *   pix_generated  — PIX QR code or copy-paste code detected on page
 *   purchase       — thank-you/success page detected
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

  // ── Config ──
  var scriptTag = document.currentScript || document.querySelector("script[data-site-id]");
  var siteId = scriptTag ? scriptTag.getAttribute("data-site-id") : null;
  var ENDPOINT = scriptTag ? scriptTag.getAttribute("data-endpoint") : null;
  if (!ENDPOINT) {
    try { if (scriptTag && scriptTag.src) ENDPOINT = new URL(scriptTag.src).origin; } catch (e) {}
  }
  if (!ENDPOINT) { console.warn("[FunnelIQ] No endpoint configured."); return; }
  var INGEST_URL = ENDPOINT + "/functions/v1/tracker-ingest";

  // ── IDs (backward compat with mesalar_*) ──
  function storeGet(s, k) { try { return s.getItem(k); } catch (e) { return null; } }
  function storeSet(s, k, v) { try { s.setItem(k, v); } catch (e) {} }

  function getVisitorId() {
    var id = storeGet(localStorage, "mesalar_visitor_id") || storeGet(localStorage, "fiq_visitor_id");
    if (!id) { try { id = new URLSearchParams(window.location.search).get("visitor_id"); } catch (e) {} }
    if (!id) id = "v_" + Math.random().toString(36).slice(2, 7) + "_" + Date.now();
    storeSet(localStorage, "mesalar_visitor_id", id);
    storeSet(localStorage, "fiq_visitor_id", id);
    return id;
  }

  function getSessionId() {
    var KEY = "mesalar_session_id", TS = "mesalar_session_ts", TIMEOUT = 1800000;
    var now = Date.now(), existing = storeGet(sessionStorage, KEY);
    var last = Number(storeGet(sessionStorage, TS) || "0");
    if (existing && (now - last) < TIMEOUT) { storeSet(sessionStorage, TS, String(now)); return existing; }
    var id = "s_" + Math.random().toString(36).slice(2, 7) + "_" + now;
    storeSet(sessionStorage, KEY, id);
    storeSet(sessionStorage, TS, String(now));
    return id;
  }

  function getClickId() {
    var KEY = "mesalar_click_id", id = storeGet(sessionStorage, KEY);
    if (id) return id;
    try { var p = new URLSearchParams(window.location.search);
      var fromUrl = p.get("click_id"); if (fromUrl) { storeSet(sessionStorage, KEY, fromUrl); return fromUrl; }
      var hasAd = p.get("utm_source") || p.get("fbclid") || p.get("gclid") || p.get("ttclid");
      id = hasAd ? ("c_" + Math.random().toString(36).slice(2, 7) + "_" + Date.now()) : "organic";
    } catch (e) { id = "organic"; }
    storeSet(sessionStorage, KEY, id);
    return id;
  }

  var visitorId = getVisitorId(), sessionId = getSessionId(), clickId = getClickId();
  var device = /mobile|android|iphone|ipad/i.test(ua) ? "Mobile" : "Desktop";

  // ── UTM ──
  function getUtm() {
    try { var c = storeGet(sessionStorage, "mesalar_utm"); if (c) return JSON.parse(c); } catch (e) {}
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
    if (Object.keys(u).length) storeSet(sessionStorage, "mesalar_utm", JSON.stringify(u));
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
  function sendEvent(name, props) {
    var payload = JSON.stringify({
      site_id: siteId, event_name: name, visitor_id: visitorId,
      session_id: sessionId, click_id: clickId,
      page_url: window.location.href, referrer: document.referrer || "direct",
      device: device, user_agent: ua.slice(0, 200),
      timestamp: new Date().toISOString(),
      properties: Object.assign({}, utmData, props || {}),
      is_health_check: isHealthCheck,
    });
    try {
      var blob = new Blob([payload], { type: "application/json" });
      if (navigator.sendBeacon && navigator.sendBeacon(INGEST_URL, blob)) return;
    } catch (e) {}
    try { fetch(INGEST_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true }).catch(function(){}); } catch (e) {}
  }

  // ── Keep session alive ──
  function touch() { storeSet(sessionStorage, "mesalar_session_ts", String(Date.now())); }
  window.addEventListener("click", touch, { passive: true });
  window.addEventListener("scroll", touch, { passive: true });

  // ══════════════════════════════════════════════════════════════
  // AUTO-DETECTION ENGINE
  // ══════════════════════════════════════════════════════════════

  var path = window.location.pathname.toLowerCase();
  var href = window.location.href.toLowerCase();

  // ── 1. PAGE VIEW (always) ──
  if (dedupOk("page_view", path)) sendEvent("page_view", { page: path });

  // ── 2. VIEW CONTENT (product/landing pages) ──
  var LANDING_PATTERNS = /^\/$|\/index|\/produto|\/oferta|\/product|\/landing|\/lp|\/vsl/;
  setTimeout(function () {
    if (LANDING_PATTERNS.test(path) && dedupOk("view_content")) {
      sendEvent("view_content", { page: path });
    }
  }, 1000);

  // ── 3. CLICK BUY (detect buy buttons) ──
  var BUY_WORDS = /comprar|buy|adicionar|add.to.cart|compre|quero|pedir|garantir|aproveitar|eu quero|finalizar|order/i;
  var BUY_CLASSES = /btn.buy|btn.comprar|buy.button|add.to.cart|cta.button|comprar|checkout/i;

  document.addEventListener("click", function (e) {
    var el = e.target;
    // Walk up 3 levels to find a button/anchor
    for (var i = 0; i < 4 && el && el !== document.body; i++) {
      var tag = (el.tagName || "").toLowerCase();
      if (tag === "button" || tag === "a" || (tag === "input" && el.type === "submit")) {
        var text = (el.textContent || el.value || "").trim();
        var cls = el.className || "";
        var id = el.id || "";
        var role = el.getAttribute("role") || "";
        var dataFiq = el.getAttribute("data-fiq") || "";

        if (dataFiq === "click_buy" || BUY_WORDS.test(text) || BUY_CLASSES.test(cls) || BUY_CLASSES.test(id)) {
          if (dedupOk("click_buy")) {
            sendEvent("click_buy", { button_text: text.slice(0, 50), page: path });
          }
          return;
        }
      }
      el = el.parentElement;
    }
  }, true);

  // ── 4. CHECKOUT START (checkout URL patterns) ──
  var CHECKOUT_PATTERNS = /\/checkout|\/carrinho|\/cart|\/pagamento|\/payment|\/pedido|\/order|\/finalizar/;

  function checkCheckout() {
    var p = window.location.pathname.toLowerCase();
    if (CHECKOUT_PATTERNS.test(p) && dedupOk("checkout_start")) {
      sendEvent("checkout_start", { page: p });
    }
  }
  checkCheckout();

  // ── 5. ADD PAYMENT INFO (payment form interaction) ──
  var PAYMENT_SELECTORS = [
    'input[name*="card"]', 'input[name*="cartao"]', 'input[name*="cc_"]',
    'input[placeholder*="cartão"]', 'input[placeholder*="card"]',
    'input[name*="cpf"]', 'input[name*="cvv"]',
    'input[autocomplete="cc-number"]', 'input[autocomplete="cc-exp"]',
    '[data-fiq="payment"]',
  ];
  var paymentDetected = false;

  function checkPaymentForms() {
    if (paymentDetected) return;
    for (var i = 0; i < PAYMENT_SELECTORS.length; i++) {
      var el = document.querySelector(PAYMENT_SELECTORS[i]);
      if (el) {
        el.addEventListener("input", function onInput() {
          if (!paymentDetected && dedupOk("add_payment_info")) {
            paymentDetected = true;
            sendEvent("add_payment_info", { page: window.location.pathname });
          }
        }, { once: true });
      }
    }
    // Also detect PIX selection buttons
    var pixBtns = document.querySelectorAll('[data-fiq="pix"], button, label, div');
    for (var j = 0; j < pixBtns.length; j++) {
      var txt = (pixBtns[j].textContent || "").toLowerCase();
      if (/pix|qr.code/i.test(txt) && /selec|escolh|pagar|pagamento/i.test(txt)) {
        pixBtns[j].addEventListener("click", function () {
          if (!paymentDetected && dedupOk("add_payment_info")) {
            paymentDetected = true;
            sendEvent("add_payment_info", { method: "pix", page: window.location.pathname });
          }
        }, { once: true });
      }
    }
  }
  setTimeout(checkPaymentForms, 2000);

  // ── 6. PIX GENERATED (detect QR code or PIX copy-paste on page) ──
  var PIX_PATTERNS = /\/pix|\/qrcode|\/qr-code/;
  var PIX_CONTENT = /copia.e.cola|copiar.código|código.pix|qr.code.pix|pague.com.pix|escaneie/i;

  function checkPixGenerated() {
    var p = window.location.pathname.toLowerCase();
    if (PIX_PATTERNS.test(p) && dedupOk("pix_generated")) {
      sendEvent("pix_generated", { page: p });
      return;
    }
    // Check page content for PIX elements
    var body = document.body ? (document.body.innerText || "") : "";
    if (PIX_CONTENT.test(body)) {
      // Confirm with canvas/img (QR codes are usually in canvas or img)
      var hasQR = document.querySelector('canvas, img[src*="qr"], img[alt*="qr"], img[alt*="pix"], [data-fiq="pix"]');
      if (hasQR && dedupOk("pix_generated")) {
        sendEvent("pix_generated", { page: p });
      }
    }
  }
  setTimeout(checkPixGenerated, 3000);

  // ── 7. PURCHASE (thank you / success page) ──
  var THANK_PATTERNS = /\/obrigado|\/thank|\/sucesso|\/success|\/confirmado|\/confirmed|\/pedido-confirmado|\/order-confirmed/;
  var THANK_CONTENT = /pedido.confirmado|compra.realizada|pagamento.aprovado|obrigado.pela.compra|payment.confirmed|order.confirmed|parabéns/i;

  function checkPurchase() {
    var p = window.location.pathname.toLowerCase();
    if (THANK_PATTERNS.test(p) && dedupOk("purchase")) {
      sendEvent("purchase", { page: p });
      return;
    }
    var body = document.body ? (document.body.innerText || "").slice(0, 2000) : "";
    if (THANK_CONTENT.test(body) && dedupOk("purchase")) {
      sendEvent("purchase", { page: p });
    }
  }
  setTimeout(checkPurchase, 2000);

  // ══════════════════════════════════════════════════════════════
  // SPA NAVIGATION OBSERVER
  // ══════════════════════════════════════════════════════════════

  var lastPath = window.location.pathname;

  function onRouteChange() {
    var newPath = window.location.pathname;
    if (newPath === lastPath) return;
    lastPath = newPath;
    path = newPath.toLowerCase();

    // Re-run detections for new page
    if (dedupOk("page_view", path)) sendEvent("page_view", { page: path });
    setTimeout(function () {
      if (LANDING_PATTERNS.test(path) && dedupOk("view_content")) sendEvent("view_content", { page: path });
    }, 500);
    checkCheckout();
    setTimeout(checkPaymentForms, 1500);
    setTimeout(checkPixGenerated, 2000);
    setTimeout(checkPurchase, 1500);
  }

  // Observe DOM mutations (works for React/Vue/Angular SPAs)
  try {
    new MutationObserver(onRouteChange).observe(document.body, { childList: true, subtree: true });
  } catch (e) {}

  // Also intercept pushState/replaceState
  try {
    var origPush = history.pushState;
    var origReplace = history.replaceState;
    history.pushState = function () { origPush.apply(this, arguments); setTimeout(onRouteChange, 100); };
    history.replaceState = function () { origReplace.apply(this, arguments); setTimeout(onRouteChange, 100); };
    window.addEventListener("popstate", function () { setTimeout(onRouteChange, 100); });
  } catch (e) {}

  // ══════════════════════════════════════════════════════════════
  // PUBLIC API
  // ══════════════════════════════════════════════════════════════

  window.FunnelIQ = {
    track: function (name, props) { if (dedupOk(name, JSON.stringify(props))) sendEvent(name, props || {}); },
    identify: function (data) { storeSet(sessionStorage, "fiq_user", JSON.stringify(data || {})); },
    getVisitorId: function () { return visitorId; },
    getSessionId: function () { return sessionId; },
    getClickId: function () { return clickId; },
  };

  console.log("[FunnelIQ] Tracker v3.0 loaded | site=" + siteId + " | visitor=" + visitorId + " | auto-detection ON");
})();

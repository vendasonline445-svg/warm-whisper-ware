import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { trackEvent } from "./utils/track-event";

// ── Global error handler — captura erros de scripts externos e internos ──
window.onerror = function (message, source, lineno, colno, error) {
  console.warn("[GlobalError]", { message, source, lineno, colno, error: error?.message });
  trackEvent("js_error", { message: String(message), source: String(source || ""), line: lineno || 0 });
  // Não propagar — evita que erros de terceiros quebrem a UI
  return true;
};

window.addEventListener("error", (event) => {
  // Erros de carregamento de scripts externos (tracking, etc.)
  if (event.target && (event.target as HTMLElement).tagName === "SCRIPT") {
    const src = (event.target as HTMLScriptElement).src;
    console.warn("[ScriptLoadError] Falha ao carregar script:", src);
    trackEvent("js_error", { message: "Script load failed", source: src });
    event.preventDefault();
  }
}, true); // capture phase para pegar erros de load

window.addEventListener("unhandledrejection", (event) => {
  console.warn("[UnhandledPromise]", event.reason);
  trackEvent("js_error", { message: String(event.reason) });
  event.preventDefault();
});

createRoot(document.getElementById("root")!).render(<App />);

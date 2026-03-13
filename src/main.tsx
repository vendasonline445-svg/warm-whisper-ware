import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// ── Global error handler — captura erros de scripts externos e internos ──
window.onerror = function (message, source, lineno, colno, error) {
  console.warn("[GlobalError]", { message, source, lineno, colno, error: error?.message });
  // Não propagar — evita que erros de terceiros quebrem a UI
  return true;
};

window.addEventListener("error", (event) => {
  // Erros de carregamento de scripts externos (tracking, etc.)
  if (event.target && (event.target as HTMLElement).tagName === "SCRIPT") {
    console.warn("[ScriptLoadError] Falha ao carregar script:", (event.target as HTMLScriptElement).src);
    event.preventDefault();
  }
}, true); // capture phase para pegar erros de load

window.addEventListener("unhandledrejection", (event) => {
  console.warn("[UnhandledPromise]", event.reason);
  event.preventDefault();
});

createRoot(document.getElementById("root")!).render(<App />);

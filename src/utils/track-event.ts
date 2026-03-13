import { supabase } from "@/integrations/supabase/client";

let eventQueue: { event_type: string; event_data?: Record<string, unknown> }[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  if (eventQueue.length === 0) return;
  const batch = [...eventQueue];
  eventQueue = [];
  supabase.from("user_events").insert(batch).then(() => {});
}

export function trackEvent(event_type: string, event_data?: Record<string, unknown>) {
  eventQueue.push({ event_type, event_data: event_data || {} });
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(flush, 2000);
}

// Flush on page unload
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", flush);
}

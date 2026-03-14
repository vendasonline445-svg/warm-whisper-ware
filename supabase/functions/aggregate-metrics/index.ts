import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(supabaseUrl, supabaseKey);

    const results = { creative_metrics: 0, funnel_diagnostics: 0, event_queue: 0 };

    // ── 1. Aggregate Creative Metrics ──
    const { data: creatives } = await db.from("creatives").select("id, campaign_id");
    if (creatives?.length) {
      for (const c of creatives) {
        const { data: attrs } = await db.from("attributions")
          .select("revenue").eq("creative_id", c.id);
        const { data: costs } = await db.from("campaign_costs")
          .select("spend, clicks").eq("campaign_id", c.campaign_id);

        const revenue = attrs?.reduce((s, a) => s + (a.revenue || 0), 0) || 0;
        const conversions = attrs?.length || 0;
        const spend = costs?.reduce((s, r) => s + (r.spend || 0), 0) || 0;
        const clicks = costs?.reduce((s, r) => s + (r.clicks || 0), 0) || 0;
        const roas = spend > 0 ? revenue / spend : 0;
        const cpa = conversions > 0 ? spend / conversions : 0;

        await db.from("creative_metrics").upsert({
          creative_id: c.id,
          campaign_id: c.campaign_id,
          spend, clicks, conversions, revenue, roas, cpa,
          updated_at: new Date().toISOString(),
        }, { onConflict: "creative_id" });
        results.creative_metrics++;
      }
    }

    // ── 2. Aggregate Funnel Diagnostics per Client ──
    const { data: clients } = await db.from("clients").select("id");
    if (clients?.length) {
      for (const client of clients) {
        const { count: visitors } = await db.from("visitors").select("*", { count: "exact", head: true });
        const { count: clickCount } = await db.from("clicks").select("*", { count: "exact", head: true });
        const { count: checkouts } = await db.from("events").select("*", { count: "exact", head: true }).eq("event_name", "checkout_start");
        const { count: payments } = await db.from("events").select("*", { count: "exact", head: true }).eq("event_name", "pix_generated");
        const { count: purchases } = await db.from("events").select("*", { count: "exact", head: true }).eq("event_name", "purchase");

        const v = visitors || 1;
        const vtc = (clickCount || 0) / v;
        const ctch = clickCount ? (checkouts || 0) / clickCount : 0;
        const chtp = checkouts ? (payments || 0) / checkouts : 0;
        const ptp = payments ? (purchases || 0) / payments : 0;

        let status = "healthy";
        if (vtc < 0.01 || ctch < 0.05 || ptp < 0.1) status = "critical";
        else if (vtc < 0.03 || ctch < 0.1 || ptp < 0.3) status = "warning";

        await db.from("funnel_diagnostics").upsert({
          client_id: client.id,
          visitor_to_click_rate: Math.round(vtc * 10000) / 100,
          click_to_checkout_rate: Math.round(ctch * 10000) / 100,
          checkout_to_payment_rate: Math.round(chtp * 10000) / 100,
          payment_to_purchase_rate: Math.round(ptp * 10000) / 100,
          status,
          updated_at: new Date().toISOString(),
        }, { onConflict: "client_id" });
        results.funnel_diagnostics++;
      }
    }

    // ── 3. Process Event Queue (retry failed events) ──
    const { data: pendingEvents } = await db.from("event_queue")
      .select("*")
      .in("status", ["pending", "failed"])
      .lte("next_retry_at", new Date().toISOString())
      .lt("retry_count", 5)
      .limit(50);

    if (pendingEvents?.length) {
      for (const evt of pendingEvents) {
        try {
          const { error } = await db.from("events").insert(evt.payload);
          if (error) throw error;
          await db.from("event_queue").update({ status: "sent" }).eq("id", evt.id);
        } catch {
          const nextRetry = new Date(Date.now() + (evt.retry_count + 1) * 10000).toISOString();
          await db.from("event_queue").update({
            status: "failed",
            retry_count: evt.retry_count + 1,
            next_retry_at: nextRetry,
          }).eq("id", evt.id);
        }
        results.event_queue++;
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Aggregation error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TIKTOK_API = "https://business-api.tiktok.com/open_api/v1.3";
const PUSHCUT_URL = "https://api.pushcut.io/SpzDS98J4ESuSNvFb2HbR/notifications/Tik%20tok%20ads%20Status";

const safeJson = async (resp: Response) => {
  const text = await resp.text();
  try { return JSON.parse(text); } catch { return { code: -1, message: text.slice(0, 200), data: null }; }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get all active BCs
    const { data: bcs, error: bcErr } = await supabase
      .from("business_centers")
      .select("id, bc_name, advertiser_id, access_token, bc_external_id")
      .eq("status", "active");

    if (bcErr || !bcs?.length) {
      return new Response(JSON.stringify({ ok: true, message: "No active BCs" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allAlerts: Array<{ bc_name: string; advertiser_id: string; name: string; issue: string; detail: string }> = [];

    for (const bc of bcs) {
      if (!bc.access_token) continue;

      const headers = { "Content-Type": "application/json", "Access-Token": bc.access_token };
      const advIds = (bc.advertiser_id || "").split(",").map((id: string) => id.trim()).filter(Boolean);
      if (!advIds.length) continue;

      // Check advertiser info (status + balance)
      for (let i = 0; i < advIds.length; i += 100) {
        const batch = advIds.slice(i, i + 100);
        try {
          const infoResp = await fetch(
            `${TIKTOK_API}/advertiser/info/?advertiser_ids=${JSON.stringify(batch)}&fields=${JSON.stringify(["advertiser_id", "name", "status", "balance"])}`,
            { headers }
          );
          const infoData = await safeJson(infoResp);

          if (infoData.code === 0 && infoData.data?.list) {
            for (const info of infoData.data.list) {
              const id = String(info.advertiser_id);
              const name = info.name || id;

              const badStatuses = ["STATUS_DISABLE", "STATUS_LIMIT", "STATUS_PENDING_CONFIRM", "STATUS_CONFIRM_FAIL", "STATUS_CONFIRM_FAIL_END", "STATUS_LIMIT_PART"];
              if (badStatuses.includes(info.status)) {
                allAlerts.push({ bc_name: bc.bc_name, advertiser_id: id, name, issue: "status", detail: info.status });
              }

              const balance = Number(info.balance || 0);
              if (balance <= 0) {
                allAlerts.push({ bc_name: bc.bc_name, advertiser_id: id, name, issue: "balance", detail: `Saldo: ${balance.toFixed(2)}` });
              } else if (balance < 50) {
                allAlerts.push({ bc_name: bc.bc_name, advertiser_id: id, name, issue: "low_balance", detail: `Saldo baixo: ${balance.toFixed(2)}` });
              }
            }
          }
        } catch (e) {
          console.error(`Error checking batch for BC ${bc.bc_name}:`, e);
        }
      }

      // Also check via BC balance endpoint for more precise data
      if (bc.bc_external_id) {
        try {
          const balResp = await fetch(
            `${TIKTOK_API}/advertiser/balance/get/?bc_id=${bc.bc_external_id}&page=1&page_size=100`,
            { headers }
          );
          const balData = await safeJson(balResp);
          if (balData.code === 0 && balData.data?.list) {
            for (const b of balData.data.list) {
              const id = String(b.advertiser_id);
              const totalBalance = Number(b.balance || 0);
              const alreadyFlagged = allAlerts.some(a => a.advertiser_id === id && (a.issue === "balance" || a.issue === "low_balance"));
              if (!alreadyFlagged && totalBalance <= 0) {
                allAlerts.push({ bc_name: bc.bc_name, advertiser_id: id, name: id, issue: "balance", detail: `Saldo: ${totalBalance.toFixed(2)}` });
              }
            }
          }
        } catch (e) {
          console.error(`Error fetching BC balance for ${bc.bc_name}:`, e);
        }
      }
    }

    // Send Pushcut if alerts found
    let pushcutSent = false;
    if (allAlerts.length > 0) {
      const statusAlerts = allAlerts.filter(a => a.issue === "status");
      const balanceAlerts = allAlerts.filter(a => a.issue === "balance" || a.issue === "low_balance");

      let text = `⚠️ ${allAlerts.length} alerta(s) detectado(s)\n`;

      if (statusAlerts.length > 0) {
        text += `\n🔴 ${statusAlerts.length} conta(s) com problema:\n`;
        statusAlerts.slice(0, 8).forEach(a => { text += `• ${a.name} (${a.bc_name}) — ${a.detail}\n`; });
      }
      if (balanceAlerts.length > 0) {
        text += `\n💰 ${balanceAlerts.length} conta(s) sem saldo:\n`;
        balanceAlerts.slice(0, 8).forEach(a => { text += `• ${a.name} (${a.bc_name}) — ${a.detail}\n`; });
      }

      try {
        const pushResp = await fetch(PUSHCUT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: `⚠️ TikTok Ads — ${allAlerts.length} alerta(s)`,
            text,
          }),
        });
        pushcutSent = pushResp.ok;
        await pushResp.text(); // consume body
      } catch (e) {
        console.error("Pushcut error:", e);
      }
    }

    console.log(`Health check: ${allAlerts.length} alerts, pushcut sent: ${pushcutSent}`);

    return new Response(JSON.stringify({
      ok: true,
      alerts_count: allAlerts.length,
      pushcut_sent: pushcutSent,
      alerts: allAlerts,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Health check error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

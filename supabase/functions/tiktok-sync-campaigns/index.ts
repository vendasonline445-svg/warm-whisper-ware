import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TIKTOK_API = "https://business-api.tiktok.com/open_api/v1.3";

const safeJson = async (resp: Response) => {
  const text = await resp.text();
  try {
    return JSON.parse(text);
  } catch {
    console.error("Non-JSON response:", text.slice(0, 300));
    return { code: -1, message: `TikTok returned non-JSON (HTTP ${resp.status})`, data: null };
  }
};

type CampaignApiMode = "standard" | "smart_plus";

const API_BY_MODE = {
  standard: {
    campaignGet: "campaign/get",
    campaignCreate: "campaign/create",
    adgroupGet: "adgroup/get",
    adgroupCreate: "adgroup/create",
    adGet: "ad/get",
    adCreate: "ad/create",
  },
  smart_plus: {
    campaignGet: "smart_plus/campaign/get",
    campaignCreate: "smart_plus/campaign/create",
    adgroupGet: "smart_plus/adgroup/get",
    adgroupCreate: "smart_plus/adgroup/create",
    adGet: "smart_plus/ad/get",
    adCreate: "smart_plus/ad/create",
  },
} as const;

const generateRequestId = (): string => {
  const timestamp = Date.now().toString();
  const suffix = Math.floor(Math.random() * 900000 + 100000).toString();
  return `${timestamp}${suffix}`;
};

function stripUnsetValues(payload: Record<string, any>): Record<string, any> {
  for (const [key, value] of Object.entries(payload)) {
    if (value === "UNSET" || value === "") {
      delete payload[key];
    }
  }
  return payload;
}

const createCampaignWithFallback = async (
  headers: Record<string, string>,
  payload: Record<string, any>,
  mode: CampaignApiMode,
) => {
  const attempts: Array<{ mode: string; payload: Record<string, any> }> = [
    { mode: String(payload.budget_mode || "ORIGINAL"), payload: { ...payload } },
  ];

  if (mode === "standard") {
    const baseMode = String(payload.budget_mode || "").toUpperCase();
    if (baseMode.includes("DYNAMIC")) {
      attempts.push({ mode: "BUDGET_MODE_DAY", payload: { ...payload, budget_mode: "BUDGET_MODE_DAY" } });
      attempts.push({ mode: "BUDGET_MODE_TOTAL", payload: { ...payload, budget_mode: "BUDGET_MODE_TOTAL" } });
    }
  }

  let lastData: any = null;

  for (const attempt of attempts) {
    const requestPayload = { ...attempt.payload };

    if (mode === "smart_plus") {
      requestPayload.request_id = generateRequestId();
      stripUnsetValues(requestPayload);
    }

    const createResp = await fetch(`${TIKTOK_API}/${API_BY_MODE[mode].campaignCreate}/`, {
      method: "POST",
      headers,
      body: JSON.stringify(requestPayload),
    });
    const createData = await safeJson(createResp);

    if (createData.code === 0) {
      return { success: true as const, data: createData, mode, payload: requestPayload };
    }

    lastData = createData;
    const msg = String(createData?.message || "").toLowerCase();
    const retryable = msg.includes("dynamic daily budget is not supported") || msg.includes("budget mode");
    if (!retryable) break;
  }

  return { success: false as const, data: lastData, mode };
};

// ── Helpers to duplicate ad groups + ads ──

const CAMPAIGN_READONLY_FIELDS = new Set([
  "campaign_id", "advertiser_id", "create_time", "modify_time", "operation_status", "secondary_status",
  "primary_status", "campaign_primary_status", "statistic_type", "campaign_status", "split_test_variable",
  "split_test_enabled", "is_new_structure", "campaign_product_source",
]);

const ADGROUP_READONLY_FIELDS = new Set([
  "adgroup_id", "campaign_id", "campaign_name", "advertiser_id",
  "create_time", "modify_time", "status", "operation_status",
  "secondary_status", "is_comment_disable", "stitch_status",
  "duet_status", "opt_status", "aoi_selection_type",
  "statistic_type", "is_hfss", "feed_type",
  "rf_campaign_type", "data_driven_ga_enabled",
]);

const AD_READONLY_FIELDS = new Set([
  "ad_id", "adgroup_id", "campaign_id", "advertiser_id",
  "create_time", "modify_time", "status", "operation_status",
  "secondary_status", "opt_status", "is_aco", "is_creative_authorized",
  "creative_authorized_bc_id", "ad_diagnostics",
  "catalogs", "item_duet_status", "item_stitch_status",
]);

function isMethodNotAllowedError(data: any): boolean {
  const msg = String(data?.message || "").toLowerCase();
  return msg.includes("method not allowed") || msg.includes("http 405");
}

async function requestTikTokListPage(
  headers: Record<string, string>,
  endpoint: string,
  advertiserId: string,
  page: number,
  filtering: Record<string, any>,
  pageSize = 100,
) {
  const postResp = await fetch(`${TIKTOK_API}/${endpoint}/`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      advertiser_id: advertiserId,
      page,
      page_size: pageSize,
      filtering,
    }),
  });
  const postData = await safeJson(postResp);

  if (postData.code === 0 || !isMethodNotAllowedError(postData)) {
    return postData;
  }

  const query = new URLSearchParams({
    advertiser_id: advertiserId,
    page: String(page),
    page_size: String(pageSize),
    filtering: JSON.stringify(filtering),
  });
  const getResp = await fetch(`${TIKTOK_API}/${endpoint}/?${query.toString()}`, { headers });
  return safeJson(getResp);
}

async function getCampaignByMode(
  headers: Record<string, string>,
  advertiserId: string,
  campaignId: string,
  mode: CampaignApiMode,
) {
  const data = await requestTikTokListPage(
    headers,
    API_BY_MODE[mode].campaignGet,
    advertiserId,
    1,
    { campaign_ids: [String(campaignId)] },
    1,
  );

  if (data.code !== 0) return null;
  return data.data?.list?.[0] || null;
}

async function getSourceCampaign(
  headers: Record<string, string>,
  advertiserId: string,
  campaignId: string,
): Promise<{ mode: CampaignApiMode; campaign: any } | null> {
  const [smartCampaign, standardCampaign] = await Promise.all([
    getCampaignByMode(headers, advertiserId, campaignId, "smart_plus"),
    getCampaignByMode(headers, advertiserId, campaignId, "standard"),
  ]);

  if (smartCampaign) return { mode: "smart_plus", campaign: smartCampaign };
  if (standardCampaign) return { mode: "standard", campaign: standardCampaign };
  return null;
}

async function getAdGroupsForMode(
  headers: Record<string, string>,
  advertiserId: string,
  campaignId: string,
  mode: CampaignApiMode,
) {
  const allAdGroups: any[] = [];
  let page = 1;
  const pageSize = 100;

  while (true) {
    const data = await requestTikTokListPage(
      headers,
      API_BY_MODE[mode].adgroupGet,
      advertiserId,
      page,
      { campaign_ids: [String(campaignId)] },
      pageSize,
    );

    if (data.code !== 0) {
      console.error(`Failed to get ad groups (${mode}):`, data.message);
      break;
    }

    const list = data.data?.list || [];
    allAdGroups.push(...list);

    if (list.length < pageSize) break;
    page++;
  }

  return allAdGroups;
}

async function getAdsForMode(
  headers: Record<string, string>,
  advertiserId: string,
  adgroupIds: string[],
  mode: CampaignApiMode,
) {
  if (!adgroupIds.length) return [];

  const allAds: any[] = [];
  const pageSize = 100;

  // Batch adgroup IDs in groups of 100
  for (let i = 0; i < adgroupIds.length; i += 100) {
    const batch = adgroupIds.slice(i, i + 100);
    let page = 1;

    while (true) {
      const data = await requestTikTokListPage(
        headers,
        API_BY_MODE[mode].adGet,
        advertiserId,
        page,
        { adgroup_ids: batch },
        pageSize,
      );

      if (data.code !== 0) {
        console.error(`Failed to get ads (${mode}):`, data.message);
        break;
      }

      const list = data.data?.list || [];
      allAds.push(...list);

      if (list.length < pageSize) break;
      page++;
    }
  }

  return allAds;
}

function cleanPayload(obj: Record<string, any>, readonlyFields: Set<string>): Record<string, any> {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (readonlyFields.has(key)) continue;
    if (value === null || value === undefined) continue;
    if (value === "UNSET" || value === "") continue;
    // Skip empty arrays/objects that might cause API errors
    if (Array.isArray(value) && value.length === 0) continue;
    if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) continue;
    cleaned[key] = value;
  }
  return cleaned;
}

function buildCampaignCreatePayload(
  sourceCampaign: Record<string, any>,
  targetAdvertiserId: string,
  customName?: string,
  customBudget?: number,
) {
  const payload = cleanPayload(sourceCampaign, CAMPAIGN_READONLY_FIELDS);

  payload.advertiser_id = targetAdvertiserId;
  payload.campaign_name = customName || `Copy of ${sourceCampaign.campaign_name || "Campaign"}`;
  payload.objective_type = payload.objective_type || "WEB_CONVERSIONS";

  if (customBudget !== undefined && Number.isFinite(customBudget)) {
    payload.budget = customBudget;
  }

  return stripUnsetValues(payload);
}

async function duplicateAdGroupsAndAds(
  headers: Record<string, string>,
  sourceAdvertiserId: string,
  targetAdvertiserId: string,
  sourceCampaignId: string,
  newCampaignId: string,
  sourceMode: CampaignApiMode,
  targetMode: CampaignApiMode,
) {
  const logs: string[] = [];
  let adGroupsCreated = 0;
  let adsCreated = 0;
  let adGroupsFailed = 0;
  let adsFailed = 0;

  let readMode: CampaignApiMode = sourceMode;
  let adGroups = await getAdGroupsForMode(headers, sourceAdvertiserId, sourceCampaignId, readMode);

  if (adGroups.length === 0) {
    const fallbackMode: CampaignApiMode = readMode === "standard" ? "smart_plus" : "standard";
    const fallbackAdGroups = await getAdGroupsForMode(headers, sourceAdvertiserId, sourceCampaignId, fallbackMode);
    if (fallbackAdGroups.length > 0) {
      readMode = fallbackMode;
      adGroups = fallbackAdGroups;
      logs.push(`Ad groups encontrados com fallback de modo (${fallbackMode})`);
    }
  }

  logs.push(`Found ${adGroups.length} ad groups in source campaign (mode: ${readMode})`);

  if (adGroups.length === 0) return { adGroupsCreated, adsCreated, adGroupsFailed, adsFailed, logs };

  const adGroupIds = adGroups.map((ag: any) => String(ag.adgroup_id));
  let allAds = await getAdsForMode(headers, sourceAdvertiserId, adGroupIds, readMode);

  if (allAds.length === 0) {
    const fallbackMode: CampaignApiMode = readMode === "standard" ? "smart_plus" : "standard";
    const fallbackAds = await getAdsForMode(headers, sourceAdvertiserId, adGroupIds, fallbackMode);
    if (fallbackAds.length > 0) {
      allAds = fallbackAds;
      logs.push(`Ads encontrados com fallback de modo (${fallbackMode})`);
    }
  }

  logs.push(`Found ${allAds.length} ads across all ad groups`);

  const adsByAdGroup: Record<string, any[]> = {};
  for (const ad of allAds) {
    const agId = String(ad.adgroup_id);
    if (!adsByAdGroup[agId]) adsByAdGroup[agId] = [];
    adsByAdGroup[agId].push(ad);
  }

  for (const ag of adGroups) {
    const sourceAgId = String(ag.adgroup_id);
    const agPayload = cleanPayload(ag, ADGROUP_READONLY_FIELDS);
    agPayload.advertiser_id = targetAdvertiserId;
    agPayload.campaign_id = newCampaignId;

    if (agPayload.schedule_start_time) {
      const startTime = new Date(agPayload.schedule_start_time);
      if (startTime < new Date()) {
        const future = new Date(Date.now() + 5 * 60 * 1000);
        agPayload.schedule_start_time = future.toISOString().replace("T", " ").split(".")[0];
      }
    }

    const adgroupModes: CampaignApiMode[] = [targetMode, targetMode === "standard" ? "smart_plus" : "standard"];
    let agData: any = null;
    let agErrorMessage = "";

    for (const mode of adgroupModes) {
      const adgroupPayload = stripUnsetValues({ ...agPayload });
      if (mode === "smart_plus") {
        adgroupPayload.request_id = generateRequestId();
      }

      const agResp = await fetch(`${TIKTOK_API}/${API_BY_MODE[mode].adgroupCreate}/`, {
        method: "POST",
        headers,
        body: JSON.stringify(adgroupPayload),
      });
      const responseData = await safeJson(agResp);
      if (responseData.code === 0) {
        agData = responseData;
        if (mode !== targetMode) {
          logs.push(`ℹ️ Ad group create fallback endpoint usado (${mode})`);
        }
        break;
      }
      agErrorMessage = responseData?.message || "Falha ao criar ad group";
    }

    if (!agData) {
      logs.push(`❌ Ad group "${ag.adgroup_name}": ${agErrorMessage}`);
      adGroupsFailed++;
      continue;
    }

    const newAgId = String(agData.data?.adgroup_id);
    adGroupsCreated++;
    logs.push(`✅ Ad group "${ag.adgroup_name}" → ${newAgId}`);

    const adsForGroup = adsByAdGroup[sourceAgId] || [];
    for (const ad of adsForGroup) {
      const adPayload = cleanPayload(ad, AD_READONLY_FIELDS);
      adPayload.advertiser_id = targetAdvertiserId;
      adPayload.adgroup_id = newAgId;

      const adModes: CampaignApiMode[] = [targetMode, targetMode === "standard" ? "smart_plus" : "standard"];
      let adCreated = false;
      let adErrorMessage = "";

      for (const mode of adModes) {
        const adRequestPayload = stripUnsetValues({ ...adPayload });
        if (mode === "smart_plus" && !adRequestPayload.request_id) {
          adRequestPayload.request_id = generateRequestId();
        }

        const adResp = await fetch(`${TIKTOK_API}/${API_BY_MODE[mode].adCreate}/`, {
          method: "POST",
          headers,
          body: JSON.stringify(adRequestPayload),
        });
        const adData = await safeJson(adResp);

        if (adData.code === 0) {
          adsCreated++;
          adCreated = true;
          logs.push(`  ✅ Ad "${ad.ad_name}" → ${adData.data?.ad_id}`);
          if (mode !== targetMode) {
            logs.push(`  ℹ️ Ad create fallback endpoint usado (${mode})`);
          }
          break;
        }

        adErrorMessage = adData?.message || "Falha ao criar anúncio";
      }

      if (!adCreated) {
        logs.push(`  ❌ Ad "${ad.ad_name}": ${adErrorMessage}`);
        adsFailed++;
      }
    }
  }

  return { adGroupsCreated, adsCreated, adGroupsFailed, adsFailed, logs };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const { bc_id, action } = body;

    if (!bc_id) {
      return new Response(JSON.stringify({ error: "bc_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: bc, error: bcErr } = await supabase
      .from("business_centers")
      .select("*")
      .eq("id", bc_id)
      .single();

    if (bcErr || !bc?.access_token) {
      return new Response(JSON.stringify({ error: "BC not found or no token" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const headers = {
      "Content-Type": "application/json",
      "Access-Token": bc.access_token,
    };

    // ── Action: get advertiser accounts (with status) ──
    if (action === "get_advertisers") {
      const resp = await fetch(
        `${TIKTOK_API}/oauth2/advertiser/get/?app_id=${Deno.env.get("TIKTOK_APP_ID")}&secret=${Deno.env.get("TIKTOK_APP_SECRET")}&access_token=${bc.access_token}`,
        { headers }
      );
      const data = await safeJson(resp);

      const advList = data?.data?.list || [];
      const advIds = advList.map((a: any) => String(a.advertiser_id));

      const statusMap: Record<string, { status: string; name: string }> = {};
      for (let i = 0; i < advIds.length; i += 100) {
        const batch = advIds.slice(i, i + 100);
        try {
          const infoResp = await fetch(
            `${TIKTOK_API}/advertiser/info/?advertiser_ids=${JSON.stringify(batch)}&fields=["advertiser_id","name","status","description"]`,
            { headers }
          );
          const infoData = await safeJson(infoResp);
          if (infoData.code === 0 && infoData.data?.list) {
            for (const info of infoData.data.list) {
              statusMap[String(info.advertiser_id)] = {
                status: info.status || "STATUS_UNKNOWN",
                name: info.name || String(info.advertiser_id),
              };
            }
          }
        } catch (e) {
          console.error("Error fetching advertiser info batch:", e);
        }
      }

      const advertisers = advList.map((adv: any) => {
        const id = String(adv.advertiser_id);
        const info = statusMap[id];
        return {
          advertiser_id: id,
          advertiser_name: info?.name || adv.advertiser_name || id,
          status: info?.status || "STATUS_UNKNOWN",
        };
      });

      return new Response(JSON.stringify({ code: 0, data: { list: advertisers } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Action: sync campaigns ──
    if (action === "sync_campaigns") {
      const { advertiser_id } = body;
      if (!advertiser_id) {
        return new Response(JSON.stringify({ error: "advertiser_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const campResp = await fetch(
        `${TIKTOK_API}/campaign/get/?advertiser_id=${advertiser_id}&page_size=200`,
        { headers }
      );
      const campData = await safeJson(campResp);

      if (campData.code !== 0) {
        return new Response(JSON.stringify({ error: campData.message, code: campData.code }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const campaigns = campData.data?.list || [];
      let synced = 0;
      const errors: string[] = [];

      for (const camp of campaigns) {
        const extId = String(camp.campaign_id);
        const { data: existing } = await supabase
          .from("campaigns")
          .select("id")
          .eq("campaign_external_id", extId)
          .maybeSingle();

        let upsertErr;
        if (existing) {
          const { error: err } = await supabase
            .from("campaigns")
            .update({ campaign_name: camp.campaign_name })
            .eq("id", existing.id);
          upsertErr = err;
        } else {
          const { error: err } = await supabase
            .from("campaigns")
            .insert({
              campaign_external_id: extId,
              campaign_name: camp.campaign_name,
              platform: "tiktok",
              client_id: bc.client_id,
            });
          upsertErr = err;
        }

        if (upsertErr) {
          errors.push(`${extId}: ${upsertErr.message}`);
        } else {
          synced++;
        }
      }

      return new Response(
        JSON.stringify({ success: true, total: campaigns.length, synced, errors }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Action: sync costs (reporting) ──
    if (action === "sync_costs") {
      const { advertiser_id, date_from, date_to } = body;
      if (!advertiser_id) {
        return new Response(JSON.stringify({ error: "advertiser_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const today = new Date().toISOString().split("T")[0];
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

      const reportResp = await fetch(`${TIKTOK_API}/report/integrated/get/`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          advertiser_id,
          report_type: "BASIC",
          data_level: "AUCTION_CAMPAIGN",
          dimensions: ["campaign_id", "stat_time_day"],
          metrics: ["spend", "impressions", "clicks", "cpc", "cpm", "ctr", "conversion", "cost_per_conversion"],
          start_date: date_from || weekAgo,
          end_date: date_to || today,
          page_size: 200,
        }),
      });
      const reportData = await safeJson(reportResp);

      if (reportData.code !== 0) {
        return new Response(JSON.stringify({ error: reportData.message, code: reportData.code }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const rows = reportData.data?.list || [];
      let inserted = 0;

      for (const row of rows) {
        const dims = row.dimensions || {};
        const metrics = row.metrics || {};
        const campExtId = String(dims.campaign_id);
        const date = dims.stat_time_day?.split(" ")[0];

        const { data: intCamp } = await supabase
          .from("campaigns")
          .select("id")
          .eq("campaign_external_id", campExtId)
          .maybeSingle();

        const spendCents = Math.round(parseFloat(metrics.spend || "0") * 100);

        await supabase.from("campaign_costs").upsert(
          {
            campaign_id: intCamp?.id || null,
            client_id: bc.client_id,
            date,
            spend: spendCents,
            impressions: parseInt(metrics.impressions || "0"),
            clicks: parseInt(metrics.clicks || "0"),
            cpc: parseFloat(metrics.cpc || "0"),
            cpm: parseFloat(metrics.cpm || "0"),
            ctr: parseFloat(metrics.ctr || "0"),
          },
          { onConflict: "campaign_id,date", ignoreDuplicates: false }
        );
        inserted++;
      }

      return new Response(
        JSON.stringify({ success: true, rows: rows.length, inserted }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Action: update campaign status (enable/disable) ──
    if (action === "update_status") {
      const { advertiser_id, campaign_ids, operation_status } = body;
      if (!advertiser_id || !campaign_ids || !operation_status) {
        return new Response(JSON.stringify({ error: "advertiser_id, campaign_ids, operation_status required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const resp = await fetch(`${TIKTOK_API}/campaign/status/update/`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          advertiser_id,
          campaign_ids: campaign_ids.map(String),
          operation_status,
        }),
      });
      const data = await safeJson(resp);

      if (data.code !== 0) {
        return new Response(JSON.stringify({ error: data.message, code: data.code }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, data: data.data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Action: update campaign budget ──
    if (action === "update_budget") {
      const { advertiser_id, campaign_id, budget } = body;
      if (!advertiser_id || !campaign_id || budget === undefined) {
        return new Response(JSON.stringify({ error: "advertiser_id, campaign_id, budget required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const budgetPayload = {
        advertiser_id,
        campaign_id: String(campaign_id),
        budget: Number(budget),
      };

      const resp = await fetch(`${TIKTOK_API}/campaign/update/`, {
        method: "POST",
        headers,
        body: JSON.stringify(budgetPayload),
      });
      const data = await safeJson(resp);

      if (data.code !== 0) {
        const isSmartLike = String(data?.message || "").toLowerCase().includes("smart");

        if (isSmartLike) {
          const fallbackEndpoints = [
            `${TIKTOK_API}/smart_plus/campaign/update/`,
            `${TIKTOK_API}/campaign/gmv_max/update/`,
          ];

          const fallbackErrors: Array<{ endpoint: string; code?: number; message?: string }> = [];

          for (const endpoint of fallbackEndpoints) {
            const fallbackResp = await fetch(endpoint, {
              method: "POST",
              headers,
              body: JSON.stringify(budgetPayload),
            });
            const fallbackData = await safeJson(fallbackResp);

            if (fallbackData.code === 0) {
              return new Response(JSON.stringify({ success: true, mode: endpoint }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }

            fallbackErrors.push({ endpoint, code: fallbackData.code, message: fallbackData.message });
          }

          return new Response(JSON.stringify({
            error: "Não foi possível atualizar orçamento para campanha Smart/GMV Max.",
            code: data.code,
            details: fallbackErrors,
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ error: data.message, code: data.code }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Action: get campaign details (single or multi advertiser) ──
    if (action === "get_campaign_details") {
      const { advertiser_id, advertiser_ids } = body;
      const ids: string[] = advertiser_ids
        ? advertiser_ids
        : advertiser_id
          ? [advertiser_id]
          : [];

      if (!ids.length) {
        return new Response(JSON.stringify({ error: "advertiser_id or advertiser_ids required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const allCampaigns: any[] = [];
      let errors = 0;

      const batchSize = 10;
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        const results = await Promise.allSettled(
          batch.map(async (advId: string) => {
            const resp = await fetch(
              `${TIKTOK_API}/campaign/get/?advertiser_id=${advId}&page_size=200&fields=["campaign_id","campaign_name","operation_status","budget","budget_mode","objective_type","secondary_status","create_time","modify_time"]`,
              { headers }
            );
            const data = await safeJson(resp);
            if (data.code !== 0) return [];
            return (data.data?.list || []).map((c: any) => ({
              campaign_id: String(c.campaign_id),
              campaign_name: c.campaign_name,
              operation_status: c.operation_status,
              secondary_status: c.secondary_status,
              budget: c.budget,
              budget_mode: c.budget_mode,
              objective_type: c.objective_type,
              create_time: c.create_time,
              modify_time: c.modify_time,
              advertiser_id: advId,
            }));
          })
        );
        for (const r of results) {
          if (r.status === "fulfilled") allCampaigns.push(...r.value);
          else errors++;
        }
      }

      // Auto-upsert campaigns into DB
      if (allCampaigns.length > 0) {
        const clientId = bc.client_id;
        for (const c of allCampaigns) {
          const { data: existing } = await supabase
            .from("campaigns")
            .select("id")
            .eq("campaign_external_id", c.campaign_id)
            .maybeSingle();

          if (existing) {
            await supabase.from("campaigns").update({ campaign_name: c.campaign_name }).eq("id", existing.id);
          } else {
            await supabase.from("campaigns").insert({
              campaign_external_id: c.campaign_id,
              campaign_name: c.campaign_name,
              platform: "tiktok",
              client_id: clientId,
            });
          }
        }
      }

      return new Response(JSON.stringify({ success: true, campaigns: allCampaigns, accounts: ids.length, errors }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Action: duplicate campaign (with ad groups + ads) ──
    if (action === "duplicate_campaign") {
      const { advertiser_id, campaign_id, new_name, new_budget } = body;
      if (!advertiser_id || !campaign_id) {
        return new Response(JSON.stringify({ error: "advertiser_id, campaign_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const source = await getSourceCampaign(headers, advertiser_id, campaign_id);

      if (!source?.campaign) {
        return new Response(JSON.stringify({ error: "Campaign not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const orig = source.campaign;
      const sourceMode = source.mode;
      const parsedBudget = new_budget !== undefined ? Number(new_budget) : undefined;
      const budgetOverride = parsedBudget !== undefined && Number.isFinite(parsedBudget) ? parsedBudget : undefined;

      const createBody = buildCampaignCreatePayload(
        orig,
        advertiser_id,
        new_name || `Copy of ${orig.campaign_name}`,
        budgetOverride,
      );

      const createResult = await createCampaignWithFallback(headers, createBody, sourceMode);
      console.log("Duplicate campaign result:", JSON.stringify(createResult.data).slice(0, 500));

      if (!createResult.success) {
        return new Response(JSON.stringify({
          error: createResult.data?.message || "Failed to duplicate campaign",
          code: createResult.data?.code,
          source_mode: sourceMode,
        }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const targetMode = createResult.mode;
      const newCampId = String(createResult.data?.data?.campaign_id);

      await supabase.from("campaigns").insert({
        campaign_external_id: newCampId,
        campaign_name: createBody.campaign_name,
        platform: "tiktok",
        client_id: bc.client_id,
      });

      const dupResult = await duplicateAdGroupsAndAds(
        headers,
        advertiser_id,
        advertiser_id,
        campaign_id,
        newCampId,
        sourceMode,
        targetMode,
      );

      console.log(`Duplicate complete (${sourceMode}→${targetMode}): ${dupResult.adGroupsCreated} ad groups, ${dupResult.adsCreated} ads created`);

      return new Response(JSON.stringify({
        success: true,
        source_mode: sourceMode,
        target_mode: targetMode,
        new_campaign_id: newCampId,
        ad_groups_created: dupResult.adGroupsCreated,
        ads_created: dupResult.adsCreated,
        ad_groups_failed: dupResult.adGroupsFailed,
        ads_failed: dupResult.adsFailed,
        logs: dupResult.logs,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Action: bulk duplicate campaign to multiple accounts (with ad groups + ads) ──
    if (action === "bulk_duplicate") {
      const { source_advertiser_id, campaign_id, target_advertiser_ids, new_name, new_budget, copies = 1 } = body;
      if (!source_advertiser_id || !campaign_id || !target_advertiser_ids?.length) {
        return new Response(JSON.stringify({ error: "source_advertiser_id, campaign_id, target_advertiser_ids required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const numCopies = Math.min(Math.max(1, Number(copies) || 1), 50);
      const source = await getSourceCampaign(headers, source_advertiser_id, campaign_id);

      if (!source?.campaign) {
        return new Response(JSON.stringify({ error: "Campaign not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const orig = source.campaign;
      const sourceMode = source.mode;

      const results: Array<{
        advertiser_id: string;
        copy: number;
        success: boolean;
        campaign_id?: string;
        error?: string;
        ad_groups_created?: number;
        ads_created?: number;
        ad_groups_failed?: number;
        ads_failed?: number;
        logs?: string[];
      }> = [];

      for (const targetAdvId of target_advertiser_ids) {
        for (let copyNum = 1; copyNum <= numCopies; copyNum++) {
          try {
            const copyName = numCopies > 1
              ? `${new_name || orig.campaign_name} (${copyNum})`
              : (new_name || orig.campaign_name);

            const parsedBudget = new_budget !== undefined ? Number(new_budget) : undefined;
            const budgetOverride = parsedBudget !== undefined && Number.isFinite(parsedBudget) ? parsedBudget : undefined;

            const createBody = buildCampaignCreatePayload(
              orig,
              targetAdvId,
              copyName,
              budgetOverride,
            );

            const createResult = await createCampaignWithFallback(headers, createBody, sourceMode);

            if (!createResult.success) {
              results.push({
                advertiser_id: targetAdvId,
                copy: copyNum,
                success: false,
                error: `${createResult.data?.message || "Falha ao criar campanha"} [mode=${sourceMode}]`,
              });
              continue;
            }

            const targetMode = createResult.mode;
            const newId = String(createResult.data?.data?.campaign_id);

            await supabase.from("campaigns").insert({
              campaign_external_id: newId,
              campaign_name: copyName,
              platform: "tiktok",
              client_id: bc.client_id,
            });

            const dupResult = await duplicateAdGroupsAndAds(
              headers,
              source_advertiser_id,
              targetAdvId,
              campaign_id,
              newId,
              sourceMode,
              targetMode,
            );

            results.push({
              advertiser_id: targetAdvId,
              copy: copyNum,
              success: true,
              campaign_id: newId,
              ad_groups_created: dupResult.adGroupsCreated,
              ads_created: dupResult.adsCreated,
              ad_groups_failed: dupResult.adGroupsFailed,
              ads_failed: dupResult.adsFailed,
              logs: dupResult.logs,
            });
          } catch (e: any) {
            results.push({ advertiser_id: targetAdvId, copy: copyNum, success: false, error: e.message });
          }
        }
      }

      const succeeded = results.filter(r => r.success).length;
      const totalOps = target_advertiser_ids.length * numCopies;
      console.log(`Bulk duplicate (${sourceMode}): ${succeeded}/${totalOps} succeeded`);

      return new Response(JSON.stringify({ success: true, source_mode: sourceMode, results, succeeded, total: totalOps, copies: numCopies }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("TikTok sync error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

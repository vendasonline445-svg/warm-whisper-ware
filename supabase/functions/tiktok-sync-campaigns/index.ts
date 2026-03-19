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

// ── Token auto-refresh helper ──
async function refreshAccessToken(
  supabase: any,
  bc: any,
): Promise<{ access_token: string; refreshed: boolean }> {
  if (!bc.refresh_token) return { access_token: bc.access_token, refreshed: false };

  // Check if token is expired or will expire in next 30 minutes
  const expiresAt = bc.token_expires_at ? new Date(bc.token_expires_at).getTime() : 0;
  const isExpiringSoon = expiresAt > 0 && expiresAt - Date.now() < 30 * 60 * 1000;

  if (!isExpiringSoon && expiresAt > 0) {
    return { access_token: bc.access_token, refreshed: false };
  }

  const appId = Deno.env.get("TIKTOK_APP_ID");
  const appSecret = Deno.env.get("TIKTOK_APP_SECRET");
  if (!appId || !appSecret) return { access_token: bc.access_token, refreshed: false };

  try {
    const resp = await fetch("https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: appId,
        secret: appSecret,
        grant_type: "refresh_token",
        refresh_token: bc.refresh_token,
      }),
    });
    const data = await safeJson(resp);
    if (data?.code === 0 && data?.data?.access_token) {
      const newToken = data.data.access_token;
      const newRefresh = data.data.refresh_token || bc.refresh_token;
      const newExpiry = data.data.access_token_expires_in
        ? new Date(Date.now() + data.data.access_token_expires_in * 1000).toISOString()
        : null;

      await supabase.from("business_centers").update({
        access_token: newToken,
        refresh_token: newRefresh,
        ...(newExpiry ? { token_expires_at: newExpiry } : {}),
        updated_at: new Date().toISOString(),
      }).eq("id", bc.id);

      console.log(`Token refreshed for BC ${bc.bc_name}`);
      return { access_token: newToken, refreshed: true };
    }
    console.error("Token refresh failed:", data?.message);
  } catch (e) {
    console.error("Token refresh error:", e);
  }
  return { access_token: bc.access_token, refreshed: false };
}

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

const AD_LIST_FIELDS = [
  "ad_id",
  "ad_name",
  "adgroup_id",
  "campaign_id",
  "identity_id",
  "identity_type",
  "creative_material_mode",
  "ad_format",
  "ad_text",
  "landing_page_url",
  "display_name",
  "call_to_action",
  "placement_type",
  "placement",
  "creatives",
  "creative_list",
  "ad_text_list",
  "call_to_action_list",
  "landing_page_url_list",
  "page_list",
  "deeplink_list",
  "ad_configuration",
];

function hasCreativesForMode(payload: Record<string, any>, mode: CampaignApiMode): boolean {
  if (mode === "smart_plus") {
    return Array.isArray(payload.creative_list) && payload.creative_list.length > 0;
  }
  return Array.isArray(payload.creatives) && payload.creatives.length > 0;
}

function toSmartPlusCreativeList(creatives: any): any[] {
  if (!Array.isArray(creatives)) return [];
  return creatives
    .map((item: any) => {
      if (!item) return null;
      if (item.creative_info) return item;
      if (typeof item === "object") return { creative_info: item };
      return null;
    })
    .filter(Boolean);
}

function normalizeSmartPlusPayload(payload: Record<string, any>): Record<string, any> {
  const normalized = { ...payload };

  if ((!Array.isArray(normalized.creative_list) || normalized.creative_list.length === 0) && Array.isArray(normalized.creatives)) {
    normalized.creative_list = toSmartPlusCreativeList(normalized.creatives);
  }

  if ((!Array.isArray(normalized.ad_text_list) || normalized.ad_text_list.length === 0) && typeof normalized.ad_text === "string" && normalized.ad_text.trim()) {
    normalized.ad_text_list = [{ ad_text: normalized.ad_text.trim() }];
  }

  if ((!Array.isArray(normalized.landing_page_url_list) || normalized.landing_page_url_list.length === 0) && typeof normalized.landing_page_url === "string" && normalized.landing_page_url.trim()) {
    normalized.landing_page_url_list = [{ landing_page_url: normalized.landing_page_url.trim() }];
  }

  if ((!Array.isArray(normalized.call_to_action_list) || normalized.call_to_action_list.length === 0) && typeof normalized.call_to_action === "string" && normalized.call_to_action.trim()) {
    normalized.call_to_action_list = [{ call_to_action: normalized.call_to_action.trim() }];
  }

  if ((!Array.isArray(normalized.page_list) || normalized.page_list.length === 0) && typeof normalized.page_id === "string" && normalized.page_id.trim()) {
    normalized.page_list = [{ page_id: normalized.page_id.trim() }];
  }

  delete normalized.creatives;
  delete normalized.ad_text;
  delete normalized.landing_page_url;
  delete normalized.call_to_action;
  delete normalized.page_id;

  return stripUnsetValues(normalized);
}

async function requestTikTokListPage(
  headers: Record<string, string>,
  endpoint: string,
  advertiserId: string,
  page: number,
  filtering: Record<string, any>,
  pageSize = 100,
  fields?: string[],
) {
  const postResp = await fetch(`${TIKTOK_API}/${endpoint}/`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      advertiser_id: advertiserId,
      page,
      page_size: pageSize,
      filtering,
      ...(fields?.length ? { fields } : {}),
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
    ...(fields?.length ? { fields: JSON.stringify(fields) } : {}),
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
      let data = await requestTikTokListPage(
        headers,
        API_BY_MODE[mode].adGet,
        advertiserId,
        page,
        { adgroup_ids: batch },
        pageSize,
        AD_LIST_FIELDS,
      );

      if (data.code !== 0) {
        // fallback without fields in case endpoint/account does not accept custom fields
        data = await requestTikTokListPage(
          headers,
          API_BY_MODE[mode].adGet,
          advertiserId,
          page,
          { adgroup_ids: batch },
          pageSize,
        );
      }

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

async function getAdDetailForMode(
  headers: Record<string, string>,
  advertiserId: string,
  adId: string,
  mode: CampaignApiMode,
) {
  let data = await requestTikTokListPage(
    headers,
    API_BY_MODE[mode].adGet,
    advertiserId,
    1,
    { ad_ids: [String(adId)] },
    1,
    AD_LIST_FIELDS,
  );

  if (data.code !== 0) {
    data = await requestTikTokListPage(
      headers,
      API_BY_MODE[mode].adGet,
      advertiserId,
      1,
      { ad_ids: [String(adId)] },
      1,
    );
  }

  if (data.code !== 0) return null;
  return data.data?.list?.[0] || null;
}

async function buildAdPayloadForCreate(
  headers: Record<string, string>,
  sourceAdvertiserId: string,
  ad: Record<string, any>,
  preferredMode: CampaignApiMode,
) {
  const adId = String(ad?.ad_id || "");
  const modes: CampaignApiMode[] = [preferredMode, preferredMode === "standard" ? "smart_plus" : "standard"];

  let merged = { ...ad };

  if (adId) {
    for (const mode of modes) {
      const detail = await getAdDetailForMode(headers, sourceAdvertiserId, adId, mode);
      if (detail) {
        merged = { ...merged, ...detail };
        if (hasCreativesForMode(merged, mode)) break;
      }
    }
  }

  return cleanPayload(merged, AD_READONLY_FIELDS);
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

  const adPayloadCache = new Map<string, Record<string, any>>();

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
      const sourceAdId = String(ad?.ad_id || `${sourceAgId}_${Math.random()}`);
      let baseAdPayload = adPayloadCache.get(sourceAdId);

      if (!baseAdPayload) {
        baseAdPayload = await buildAdPayloadForCreate(headers, sourceAdvertiserId, ad, readMode);
        adPayloadCache.set(sourceAdId, baseAdPayload);
      }

      const adPayload = {
        ...baseAdPayload,
        advertiser_id: targetAdvertiserId,
        adgroup_id: newAgId,
      };

      const adModes: CampaignApiMode[] = [targetMode, targetMode === "standard" ? "smart_plus" : "standard"];
      let adCreated = false;
      let adErrorMessage = "";

      for (const mode of adModes) {
        let adRequestPayload = stripUnsetValues({ ...adPayload });

        if (mode === "smart_plus") {
          const detail = await getAdDetailForMode(headers, sourceAdvertiserId, sourceAdId, "smart_plus");
          if (detail) {
            adRequestPayload = stripUnsetValues({ ...adRequestPayload, ...detail });
          }

          adRequestPayload = normalizeSmartPlusPayload(adRequestPayload);

          if (!adRequestPayload.request_id) {
            adRequestPayload.request_id = generateRequestId();
          }
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

    // Auto-refresh token if needed
    const tokenResult = await refreshAccessToken(supabase, bc);
    const activeToken = tokenResult.access_token;
    if (tokenResult.refreshed) {
      console.log(`Using refreshed token for BC ${bc.bc_name}`);
    }

    const headers = {
      "Content-Type": "application/json",
      "Access-Token": activeToken,
    };

    // ── Action: get advertiser accounts (with full info + balance) ──
    if (action === "get_advertisers") {
      const resp = await fetch(
        `${TIKTOK_API}/oauth2/advertiser/get/?app_id=${Deno.env.get("TIKTOK_APP_ID")}&secret=${Deno.env.get("TIKTOK_APP_SECRET")}&access_token=${bc.access_token}`,
        { headers }
      );
      const data = await safeJson(resp);

      const advList = data?.data?.list || [];
      const advIds = advList.map((a: any) => String(a.advertiser_id));

      // Fetch full advertiser info in batches of 100
      const infoMap: Record<string, any> = {};
      for (let i = 0; i < advIds.length; i += 100) {
        const batch = advIds.slice(i, i + 100);
        try {
          const infoResp = await fetch(
            `${TIKTOK_API}/advertiser/info/?advertiser_ids=${JSON.stringify(batch)}&fields=${JSON.stringify(["advertiser_id","name","status","timezone","currency","balance","create_time","description","rejection_reason","role","owner_bc_id","contacter","email","telephone","address","license_url","company","promotion_area","industry"])}`,
            { headers }
          );
          const infoData = await safeJson(infoResp);
          if (infoData.code === 0 && infoData.data?.list) {
            for (const info of infoData.data.list) {
              infoMap[String(info.advertiser_id)] = info;
            }
          }
        } catch (e) {
          console.error("Error fetching advertiser info batch:", e);
        }
      }

      // Fetch balance data via BC endpoint
      const balanceMap: Record<string, any> = {};
      if (bc.bc_external_id) {
        try {
          let page = 1;
          let hasMore = true;
          while (hasMore && page <= 10) {
            const balResp = await fetch(
              `${TIKTOK_API}/advertiser/balance/get/?bc_id=${bc.bc_external_id}&page=${page}&page_size=100`,
              { headers }
            );
            const balData = await safeJson(balResp);
            if (balData.code === 0 && balData.data?.list) {
              for (const b of balData.data.list) {
                balanceMap[String(b.advertiser_id)] = {
                  balance: b.balance || 0,
                  cash: b.cash || 0,
                  grant: b.grant || 0,
                  transfer_in: b.transfer_in || 0,
                  transfer_out: b.transfer_out || 0,
                };
              }
              const total = balData.data?.page_info?.total_number || 0;
              hasMore = page * 100 < total;
              page++;
            } else {
              hasMore = false;
            }
          }
        } catch (e) {
          console.error("Error fetching balance data:", e);
        }
      }

      const advertisers = advList.map((adv: any) => {
        const id = String(adv.advertiser_id);
        const info = infoMap[id] || {};
        const bal = balanceMap[id] || {};
        return {
          advertiser_id: id,
          advertiser_name: info.name || adv.advertiser_name || id,
          status: info.status || "STATUS_UNKNOWN",
          timezone: info.timezone || "",
          currency: info.currency || "",
          balance: bal.balance ?? info.balance ?? 0,
          cash: bal.cash ?? 0,
          grant: bal.grant ?? 0,
          create_time: info.create_time || "",
          rejection_reason: info.rejection_reason || "",
          role: info.role || "",
          company: info.company || "",
          email: info.email || "",
          industry: info.industry || "",
          promotion_area: info.promotion_area || "",
        };
      });

      return new Response(JSON.stringify({ code: 0, data: { list: advertisers } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Action: check account health & send Pushcut alerts ──
    if (action === "check_account_health") {
      const { pushcut_url } = body;
      const advIds = (bc.advertiser_id || "").split(",").map((id: string) => id.trim()).filter(Boolean);

      if (!advIds.length) {
        return new Response(JSON.stringify({ error: "No advertiser IDs in BC" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch info for all accounts
      const alerts: Array<{ advertiser_id: string; name: string; issue: string; detail: string }> = [];
      
      for (let i = 0; i < advIds.length; i += 100) {
        const batch = advIds.slice(i, i + 100);
        try {
          const infoResp = await fetch(
            `${TIKTOK_API}/advertiser/info/?advertiser_ids=${JSON.stringify(batch)}&fields=${JSON.stringify(["advertiser_id","name","status","balance"])}`,
            { headers }
          );
          const infoData = await safeJson(infoResp);
          if (infoData.code === 0 && infoData.data?.list) {
            for (const info of infoData.data.list) {
              const id = String(info.advertiser_id);
              const name = info.name || id;
              
              // Check for problematic statuses
              const badStatuses = ["STATUS_DISABLE", "STATUS_LIMIT", "STATUS_PENDING_CONFIRM", "STATUS_PENDING_VERIFIED", "STATUS_CONFIRM_FAIL", "STATUS_CONFIRM_FAIL_END", "STATUS_LIMIT_PART"];
              if (badStatuses.includes(info.status)) {
                alerts.push({
                  advertiser_id: id,
                  name,
                  issue: "status",
                  detail: info.status,
                });
              }

              // Check for low/zero balance
              const balance = Number(info.balance || 0);
              if (balance <= 0) {
                alerts.push({
                  advertiser_id: id,
                  name,
                  issue: "balance",
                  detail: `Saldo: ${balance.toFixed(2)}`,
                });
              } else if (balance < 50) {
                alerts.push({
                  advertiser_id: id,
                  name,
                  issue: "low_balance",
                  detail: `Saldo baixo: ${balance.toFixed(2)}`,
                });
              }
            }
          }
        } catch (e) {
          console.error("Error checking account health:", e);
        }
      }

      // Also check balance via BC endpoint for more accurate data
      if (bc.bc_external_id) {
        try {
          let page = 1;
          let hasMore = true;
          while (hasMore && page <= 10) {
            const balResp = await fetch(
              `${TIKTOK_API}/advertiser/balance/get/?bc_id=${bc.bc_external_id}&page=${page}&page_size=100`,
              { headers }
            );
            const balData = await safeJson(balResp);
            if (balData.code === 0 && balData.data?.list) {
              for (const b of balData.data.list) {
                const id = String(b.advertiser_id);
                const totalBalance = Number(b.balance || 0);
                // Check if this account hasn't already been flagged
                const alreadyFlagged = alerts.some(a => a.advertiser_id === id && (a.issue === "balance" || a.issue === "low_balance"));
                if (!alreadyFlagged && totalBalance <= 0) {
                  alerts.push({
                    advertiser_id: id,
                    name: id,
                    issue: "balance",
                    detail: `Saldo: ${totalBalance.toFixed(2)}`,
                  });
                }
              }
              const total = balData.data?.page_info?.total_number || 0;
              hasMore = page * 100 < total;
              page++;
            } else {
              hasMore = false;
            }
          }
        } catch (e) {
          console.error("Error fetching BC balance:", e);
        }
      }

      // Send Pushcut notification if there are alerts
      let pushcutSent = false;
      const targetUrl = pushcut_url || "https://api.pushcut.io/SpzDS98J4ESuSNvFb2HbR/notifications/Tik%20tok%20ads%20Status";
      
      if (alerts.length > 0) {
        const statusAlerts = alerts.filter(a => a.issue === "status");
        const balanceAlerts = alerts.filter(a => a.issue === "balance" || a.issue === "low_balance");

        let notifText = `⚠️ ${alerts.length} alerta(s) em ${bc.bc_name}:\n`;
        if (statusAlerts.length > 0) {
          notifText += `\n🔴 ${statusAlerts.length} conta(s) com problema de status:\n`;
          statusAlerts.slice(0, 5).forEach(a => {
            notifText += `• ${a.name} — ${a.detail}\n`;
          });
        }
        if (balanceAlerts.length > 0) {
          notifText += `\n💰 ${balanceAlerts.length} conta(s) sem saldo/saldo baixo:\n`;
          balanceAlerts.slice(0, 5).forEach(a => {
            notifText += `• ${a.name} — ${a.detail}\n`;
          });
        }

        try {
          const pushResp = await fetch(targetUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: `⚠️ Alerta TikTok Ads — ${alerts.length} problema(s)`,
              text: notifText,
            }),
          });
          pushcutSent = pushResp.ok;
        } catch (e) {
          console.error("Pushcut send error:", e);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        total_accounts: advIds.length,
        alerts_count: alerts.length,
        alerts,
        pushcut_sent: pushcutSent,
      }), {
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
      const startDate = date_from || weekAgo;
      const endDate = date_to || today;
      const reportMetrics = [
        "spend", "impressions", "clicks", "cpc", "cpm", "ctr",
        "conversion", "cost_per_conversion",
        "real_time_conversion", "real_time_cost_per_conversion",
        "video_views_p25", "video_views_p50", "video_views_p75", "video_views_p100",
        "average_video_play",
        "likes", "comments", "shares", "follows", "profile_visits",
        "reach", "frequency",
      ];
      const reportDimensions = ["campaign_id", "stat_time_day"];

      const rows: any[] = [];
      const pageSize = 200;
      let page = 1;

      while (true) {
        const query = new URLSearchParams({
          advertiser_id: String(advertiser_id),
          report_type: "BASIC",
          data_level: "AUCTION_CAMPAIGN",
          dimensions: JSON.stringify(reportDimensions),
          metrics: JSON.stringify(reportMetrics),
          start_date: startDate,
          end_date: endDate,
          page: String(page),
          page_size: String(pageSize),
        });

        let reportData = await safeJson(await fetch(
          `${TIKTOK_API}/report/integrated/get/?${query.toString()}`,
          { headers }
        ));

        if (reportData.code !== 0 && isMethodNotAllowedError(reportData)) {
          reportData = await safeJson(await fetch(`${TIKTOK_API}/report/integrated/get/`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              advertiser_id,
              report_type: "BASIC",
              data_level: "AUCTION_CAMPAIGN",
              dimensions: reportDimensions,
              metrics: reportMetrics,
              start_date: startDate,
              end_date: endDate,
              page,
              page_size: pageSize,
            }),
          }));
        }

        if (reportData.code !== 0) {
          return new Response(JSON.stringify({
            error: reportData.message,
            code: reportData.code,
            page,
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const list = reportData.data?.list || [];
        rows.push(...list);

        const pageInfo = reportData.data?.page_info || {};
        const totalPages = Number(pageInfo.total_page || 0);
        const totalNumber = Number(pageInfo.total_number || 0);
        const hasNextByFlag = pageInfo.has_next_page === true;
        const hasNextByTotal = totalPages > 0 ? page < totalPages : totalNumber > page * pageSize;
        const hasNextByLength = list.length === pageSize;

        if (!list.length || (!hasNextByFlag && !hasNextByTotal && !hasNextByLength) || page >= 50) {
          break;
        }

        page += 1;
      }

      const uniqueExternalIds = Array.from(new Set(
        rows
          .map((row: any) => String(row?.dimensions?.campaign_id || "").trim())
          .filter(Boolean)
      ));

      const extToInternal: Record<string, string> = {};

      if (uniqueExternalIds.length > 0) {
        const { data: existingCampaigns } = await supabase
          .from("campaigns")
          .select("id, campaign_external_id")
          .in("campaign_external_id", uniqueExternalIds);

        (existingCampaigns || []).forEach((campaign: any) => {
          if (campaign.campaign_external_id) {
            extToInternal[String(campaign.campaign_external_id)] = campaign.id;
          }
        });

        for (const extId of uniqueExternalIds) {
          if (extToInternal[extId]) continue;
          const { data: created } = await supabase
            .from("campaigns")
            .insert({
              campaign_external_id: extId,
              campaign_name: `TikTok Campaign ${extId}`,
              platform: "tiktok",
              client_id: bc.client_id,
            })
            .select("id, campaign_external_id")
            .single();

          if (created?.id) {
            extToInternal[extId] = created.id;
          }
        }
      }

      let inserted = 0;
      let skipped = 0;

      for (const row of rows) {
        const dims = row.dimensions || {};
        const metrics = row.metrics || {};
        const campExtId = String(dims.campaign_id || "").trim();
        const date = String(dims.stat_time_day || "").split(" ")[0];

        if (!campExtId || !date) {
          skipped++;
          continue;
        }

        const campaignId = extToInternal[campExtId];
        if (!campaignId) {
          skipped++;
          continue;
        }

        const spendCents = Math.round(parseFloat(metrics.spend || "0") * 100);

        await supabase.from("campaign_costs").upsert(
          {
            campaign_id: campaignId,
            client_id: bc.client_id,
            date,
            spend: spendCents,
            impressions: parseInt(metrics.impressions || "0"),
            clicks: parseInt(metrics.clicks || "0"),
            cpc: parseFloat(metrics.cpc || "0"),
            cpm: parseFloat(metrics.cpm || "0"),
            ctr: parseFloat(metrics.ctr || "0"),
            conversions: parseInt(metrics.conversion || "0"),
            cost_per_conversion: parseFloat(metrics.cost_per_conversion || "0"),
            real_time_conversions: parseInt(metrics.real_time_conversion || "0"),
            real_time_cost_per_conversion: parseFloat(metrics.real_time_cost_per_conversion || "0"),
            video_views_p25: parseInt(metrics.video_views_p25 || "0"),
            video_views_p50: parseInt(metrics.video_views_p50 || "0"),
            video_views_p75: parseInt(metrics.video_views_p75 || "0"),
            video_views_p100: parseInt(metrics.video_views_p100 || "0"),
            average_video_play: parseFloat(metrics.average_video_play || "0"),
            likes: parseInt(metrics.likes || "0"),
            comments: parseInt(metrics.comments || "0"),
            shares: parseInt(metrics.shares || "0"),
            follows: parseInt(metrics.follows || "0"),
            profile_visits: parseInt(metrics.profile_visits || "0"),
            reach: parseInt(metrics.reach || "0"),
            frequency: parseFloat(metrics.frequency || "0"),
          },
          { onConflict: "campaign_id,date", ignoreDuplicates: false }
        );
        inserted++;
      }

      return new Response(
        JSON.stringify({ success: true, rows: rows.length, inserted, skipped, pages: page }),
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

      const campaignFields = [
        "campaign_id",
        "campaign_name",
        "operation_status",
        "secondary_status",
        "budget",
        "budget_mode",
        "objective_type",
        "create_time",
        "modify_time",
      ];

      const listCampaignsByMode = async (advId: string, mode: CampaignApiMode) => {
        const endpoint = API_BY_MODE[mode].campaignGet;
        const collected: any[] = [];
        let page = 1;
        const pageSize = 100;

        while (page <= 50) {
          let data = await requestTikTokListPage(
            headers,
            endpoint,
            advId,
            page,
            { operation_status: ["ENABLE", "DISABLE"] },
            pageSize,
            campaignFields,
          );

          if (data.code !== 0) {
            data = await requestTikTokListPage(
              headers,
              endpoint,
              advId,
              page,
              {},
              pageSize,
              campaignFields,
            );
          }

          if (data.code !== 0) {
            data = await requestTikTokListPage(
              headers,
              endpoint,
              advId,
              page,
              {},
              pageSize,
            );
          }

          if (data.code !== 0) {
            if (page === 1) {
              console.error(`Failed to get campaigns for ${advId} (${mode}):`, data.message);
            }
            break;
          }

          const list = data.data?.list || [];
          if (!list.length) break;

          collected.push(...list.map((c: any) => ({
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
          })));

          const pageInfo = data.data?.page_info || {};
          const totalPages = Number(pageInfo.total_page || 0);
          const totalNumber = Number(pageInfo.total_number || 0);
          const hasNextByFlag = pageInfo.has_next_page === true;
          const hasNextByTotal = totalPages > 0 ? page < totalPages : totalNumber > page * pageSize;
          const hasNextByLength = list.length === pageSize;

          if (!hasNextByFlag && !hasNextByTotal && !hasNextByLength) break;
          page += 1;
        }

        return collected;
      };

      const allCampaigns: any[] = [];
      let errors = 0;

      const batchSize = 10;
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        const results = await Promise.allSettled(
          batch.map(async (advId: string) => {
            const [standard, smartPlus] = await Promise.all([
              listCampaignsByMode(advId, "standard"),
              listCampaignsByMode(advId, "smart_plus"),
            ]);

            const uniqueById = new Map<string, any>();
            [...standard, ...smartPlus].forEach((campaign) => {
              uniqueById.set(String(campaign.campaign_id), campaign);
            });

            return Array.from(uniqueById.values());
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

    // ── Action: update ad group status (enable/disable/delete) ──
    if (action === "update_adgroup_status") {
      const { advertiser_id, adgroup_ids, operation_status } = body;
      if (!advertiser_id || !adgroup_ids?.length || !operation_status) {
        return new Response(JSON.stringify({ error: "advertiser_id, adgroup_ids, operation_status required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const resp = await fetch(`${TIKTOK_API}/adgroup/status/update/`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          advertiser_id: String(advertiser_id),
          adgroup_ids: adgroup_ids.map(String),
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

    // ── Action: update ad status (enable/disable/delete) per v1.3 docs ──
    if (action === "update_ad_status") {
      const { advertiser_id, ad_ids, operation_status } = body;
      if (!advertiser_id || !ad_ids?.length || !operation_status) {
        return new Response(JSON.stringify({ error: "advertiser_id, ad_ids, operation_status required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const resp = await fetch(`${TIKTOK_API}/ad/status/update/`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          advertiser_id: String(advertiser_id),
          ad_ids: ad_ids.map(String),
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

    // ── Action: get campaign hierarchy (ad groups + ads) ──
    if (action === "get_campaign_hierarchy") {
      const { advertiser_id, campaign_id } = body;
      if (!advertiser_id || !campaign_id) {
        return new Response(JSON.stringify({ error: "advertiser_id, campaign_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch ad groups
      const agFields = ["adgroup_id", "adgroup_name", "operation_status", "budget", "budget_mode"];
      const agResp = await fetch(`${TIKTOK_API}/adgroup/get/?advertiser_id=${advertiser_id}&campaign_ids=["${campaign_id}"]&page_size=100&fields=${JSON.stringify(agFields)}`, {
        method: "GET",
        headers,
      });
      const agData = await safeJson(agResp);
      const adGroups = (agData?.data?.list || []).map((ag: any) => ({
        adgroup_id: String(ag.adgroup_id),
        adgroup_name: ag.adgroup_name,
        operation_status: ag.operation_status,
        budget: ag.budget,
        budget_mode: ag.budget_mode,
        ads: [] as any[],
      }));

      // Fetch ads for each ad group
      for (const ag of adGroups) {
        const adFields = ["ad_id", "ad_name", "operation_status", "secondary_status"];
        const adResp = await fetch(`${TIKTOK_API}/ad/get/?advertiser_id=${advertiser_id}&adgroup_ids=["${ag.adgroup_id}"]&page_size=100&fields=${JSON.stringify(adFields)}`, {
          method: "GET",
          headers,
        });
        const adData = await safeJson(adResp);
        ag.ads = (adData?.data?.list || []).map((ad: any) => ({
          ad_id: String(ad.ad_id),
          ad_name: ad.ad_name,
          operation_status: ad.operation_status,
          secondary_status: ad.secondary_status,
        }));
      }

      return new Response(JSON.stringify({ success: true, ad_groups: adGroups }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Action: create smart campaign (Campaign + AdGroup + Spark Ad with BID cap, no Pangle) ──
    if (action === "create_smart_campaign") {
      const {
        advertiser_id,
        campaign_name,
        budget,
        budget_mode = "BUDGET_MODE_DAY",
        objective_type = "WEB_CONVERSIONS",
        bid_type = "BID_TYPE_CUSTOM",
        bid,
        pixel_id,
        optimization_event = "COMPLETE_PAYMENT",
        optimization_goal = "CONVERT",
        landing_page_url,
        identity_id,
        identity_type = "AUTH_CODE",
        tiktok_item_id,
        tiktok_item_ids = [],
        ad_texts = [],
        call_to_action = "LEARN_MORE",
        schedule_start_time,
        target_advertiser_ids,
        copies = 1,
      } = body;

      if (!advertiser_id || !campaign_name || !budget) {
        return new Response(JSON.stringify({ error: "advertiser_id, campaign_name, budget required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const targetAdvIds: string[] = target_advertiser_ids?.length
        ? target_advertiser_ids
        : [advertiser_id];
      const numCopies = Math.min(Math.max(1, Number(copies) || 1), 50);

      const results: Array<{
        advertiser_id: string;
        copy: number;
        success: boolean;
        campaign_id?: string;
        adgroup_id?: string;
        ad_id?: string;
        error?: string;
      }> = [];

      for (const targetAdvId of targetAdvIds) {
        for (let copyNum = 1; copyNum <= numCopies; copyNum++) {
          try {
            const copyName = numCopies > 1 || targetAdvIds.length > 1
              ? `${campaign_name} (${targetAdvId.slice(-4)}-${copyNum})`
              : campaign_name;

            // 1) Create Campaign via standard endpoint
            const campaignPayload: Record<string, any> = {
              advertiser_id: targetAdvId,
              campaign_name: copyName,
              objective_type,
              budget_mode,
              budget: Number(budget),
            };

            let campaignResult = await createCampaignWithFallback(headers, campaignPayload, "standard");
            if (!campaignResult.success) {
              campaignResult = await createCampaignWithFallback(headers, { ...campaignPayload, request_id: generateRequestId() }, "smart_plus");
            }

            if (!campaignResult.success) {
              results.push({
                advertiser_id: targetAdvId,
                copy: copyNum,
                success: false,
                error: campaignResult.data?.message || "Falha ao criar campanha",
              });
              continue;
            }

            const newCampId = String(campaignResult.data?.data?.campaign_id);

            // Save to DB
            await supabase.from("campaigns").insert({
              campaign_external_id: newCampId,
              campaign_name: copyName,
              platform: "tiktok",
              client_id: bc.client_id,
            });

            // 2) Create Ad Group — TikTok only (no Pangle), BID cap, OCPM billing
            const adgroupPayload: Record<string, any> = {
              advertiser_id: targetAdvId,
              campaign_id: newCampId,
              adgroup_name: `${copyName} - Conjunto`,
              placement_type: "PLACEMENT_TYPE_NORMAL",
              placements: ["PLACEMENT_TIKTOK"],
              budget_mode,
              budget: Number(budget),
              schedule_type: schedule_start_time ? "SCHEDULE_START_END" : "SCHEDULE_FROM_NOW",
              ...(schedule_start_time ? { schedule_start_time } : {}),
              optimization_goal: optimization_goal,
              pacing: "PACING_MODE_SMOOTH",
              billing_event: "OCPM",
              bid_type,
              creative_material_mode: tiktok_item_id ? "CUSTOM" : "SMART_CREATIVE",
            };

            // Audience targeting
            if (body.age_groups?.length) adgroupPayload.age_groups = body.age_groups;
            if (body.gender) adgroupPayload.gender = body.gender;
            if (body.location_ids?.length) adgroupPayload.location_ids = body.location_ids;

            // BID cap value
            if (bid && bid_type === "BID_TYPE_CUSTOM") {
              adgroupPayload.bid = Number(bid);
            }

            // Pixel + conversion event
            if (pixel_id) {
              adgroupPayload.pixel_id = pixel_id;
            }
            if (optimization_event) {
              adgroupPayload.external_action = optimization_event;
            }

            // Try standard first
            let agResp = await fetch(`${TIKTOK_API}/adgroup/create/`, {
              method: "POST",
              headers,
              body: JSON.stringify(adgroupPayload),
            });
            let agData = await safeJson(agResp);

            if (agData.code !== 0) {
              // Fallback to smart_plus
              agResp = await fetch(`${TIKTOK_API}/smart_plus/adgroup/create/`, {
                method: "POST",
                headers,
                body: JSON.stringify({ ...adgroupPayload, request_id: generateRequestId() }),
              });
              agData = await safeJson(agResp);
            }

            if (agData.code !== 0) {
              results.push({
                advertiser_id: targetAdvId,
                copy: copyNum,
                success: false,
                campaign_id: newCampId,
                error: `Campanha criada (${newCampId}), mas falha no conjunto: ${agData.message}`,
              });
              continue;
            }

            const newAgId = String(agData.data?.adgroup_id);

            // 3) Create Ad — Spark Ad or Smart Creative
            let adSuccess = false;
            let adError = "";
            let newAdId = "";

            // Resolve list of spark items (support both single and multiple)
            const allSparkItems: string[] = (tiktok_item_ids && tiktok_item_ids.length > 0)
              ? tiktok_item_ids.filter((s: string) => s && s.trim())
              : (tiktok_item_id ? [tiktok_item_id] : []);

            if (allSparkItems.length > 0) {
              // Create one Spark Ad per item_id
              for (let si = 0; si < allSparkItems.length; si++) {
                const itemId = allSparkItems[si].trim();
                const adPayload: Record<string, any> = {
                  advertiser_id: targetAdvId,
                  adgroup_id: newAgId,
                  ad_name: allSparkItems.length > 1
                    ? `${copyName} - Spark ${si + 1}`
                    : `${copyName} - Spark Ad`,
                  identity_id: identity_id || "",
                  identity_type,
                  creatives: [{
                    tiktok_item_id: itemId,
                    call_to_action,
                    ...(landing_page_url ? { landing_page_url } : {}),
                  }],
                };

                const adResp = await fetch(`${TIKTOK_API}/ad/create/`, {
                  method: "POST",
                  headers,
                  body: JSON.stringify(adPayload),
                });
                const adData = await safeJson(adResp);

                if (adData.code === 0) {
                  adSuccess = true;
                  const adIds = adData.data?.ad_ids || [];
                  if (!newAdId && adIds[0]) newAdId = String(adIds[0]);
                } else {
                  adError = adData.message || `Falha ao criar Spark Ad #${si + 1}`;
                }
              }
            } else if (ad_texts.length > 0) {
              // Smart Creative via /ad/smart_creative/create/ or /ad/aco/create/
              const titleList = ad_texts.map((t: string) => ({ title: t }));

              const acoPayload: Record<string, any> = {
                advertiser_id: targetAdvId,
                adgroup_id: newAgId,
                title_list: titleList,
                common_material: {
                  ad_name: `${copyName} - Ad`,
                  call_to_action_id: "",
                  is_smart_creative: true,
                },
              };

              if (call_to_action) {
                acoPayload.call_to_action_list = [{ call_to_action }];
              }
              if (landing_page_url) {
                acoPayload.landing_page_urls = [{ landing_page_url }];
              }

              const adResp = await fetch(`${TIKTOK_API}/ad/aco/create/`, {
                method: "POST",
                headers,
                body: JSON.stringify(acoPayload),
              });
              const adData = await safeJson(adResp);

              if (adData.code === 0) {
                adSuccess = true;
              } else {
                adError = adData.message || "Falha ao criar Smart Creative Ad";
              }
            }

            results.push({
              advertiser_id: targetAdvId,
              copy: copyNum,
              success: true,
              campaign_id: newCampId,
              adgroup_id: newAgId,
              ad_id: newAdId || undefined,
              error: adSuccess ? undefined : `Campanha+Conjunto criados, mas ad falhou: ${adError}`,
            });
          } catch (e: any) {
            results.push({ advertiser_id: targetAdvId, copy: copyNum, success: false, error: e.message });
          }
        }
      }

      const succeeded = results.filter(r => r.success).length;
      return new Response(JSON.stringify({
        success: true,
        results,
        succeeded,
        total: targetAdvIds.length * numCopies,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Action: get identities for an advertiser ──
    if (action === "get_identities") {
      const { advertiser_id } = body;
      if (!advertiser_id) {
        return new Response(JSON.stringify({ error: "advertiser_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const results: Array<{ identity_id: string; identity_type: string; display_name: string }> = [];

      const parseIdentities = (data: any, fallbackType: string) => {
        if (data.code !== 0) return;
        // Handle array response (identity_list)
        const list = data.data?.identity_list || data.data?.list || [];
        if (Array.isArray(list) && list.length > 0) {
          for (const item of list) {
            results.push({
              identity_id: item.identity_id || item.identity_authorized_bc_id || "",
              identity_type: item.identity_type || fallbackType,
              display_name: item.display_name || item.nick_name || item.identity_name || fallbackType,
            });
          }
        }
        // Handle single object response
        if (data.data?.identity_id) {
          const alreadyExists = results.some(r => r.identity_id === data.data.identity_id);
          if (!alreadyExists) {
            results.push({
              identity_id: data.data.identity_id,
              identity_type: data.data.identity_type || fallbackType,
              display_name: data.data.display_name || data.data.nick_name || fallbackType,
            });
          }
        }
      };

      // Try all identity types
      for (const idType of ["CUSTOMIZED_USER", "TT_USER", "BC_AUTH_TT"]) {
        try {
          const resp = await fetch(
            `${TIKTOK_API}/identity/get/?advertiser_id=${advertiser_id}&identity_type=${idType}`,
            { headers }
          );
          const data = await safeJson(resp);
          console.log(`Identity ${idType} response:`, JSON.stringify(data).slice(0, 500));
          parseIdentities(data, idType);
        } catch (e) {
          console.error(`Identity ${idType} error:`, e);
        }
      }

      // Also try /identity/video/list/ for Spark Ads authorized videos
      try {
        const resp = await fetch(
          `${TIKTOK_API}/identity/video/list/?advertiser_id=${advertiser_id}`,
          { headers }
        );
        const data = await safeJson(resp);
        console.log("Identity video list response:", JSON.stringify(data).slice(0, 500));
        parseIdentities(data, "TT_USER");
      } catch (e) {
        console.error("Identity video list error:", e);
      }

      return new Response(JSON.stringify({ identities: results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Action: authorize a Spark Ad post via auth code ──
    if (action === "authorize_spark_post") {
      const { advertiser_id, auth_code, original_post_auth_code } = body;
      if (!advertiser_id || !auth_code) {
        return new Response(JSON.stringify({ error: "advertiser_id and auth_code required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const advertiserId = String(advertiser_id).trim();
      if (!/^\d{8,30}$/.test(advertiserId)) {
        return new Response(JSON.stringify({
          success: false,
          error: "Advertiser ID inválido para Spark Ads",
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const normalizeCode = (code: string) => String(code || "").trim().replace(/\s+/g, "");
      const rawCode = normalizeCode(auth_code);
      if (rawCode.length < 12) {
        return new Response(JSON.stringify({
          success: false,
          error: "Auth Code inválido (muito curto)",
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const decodedCode = rawCode.replace(/%2B/gi, "+");
      const encodedCode = decodedCode.replace(/\+/g, "%2B");
      const authCodeCandidates = Array.from(new Set([rawCode, decodedCode, encodedCode].filter(Boolean)));

      const rawOriginalCode = original_post_auth_code ? normalizeCode(original_post_auth_code) : "";
      const decodedOriginalCode = rawOriginalCode.replace(/%2B/gi, "+");
      const encodedOriginalCode = decodedOriginalCode.replace(/\+/g, "%2B");

      let authData: any = null;
      let usedAuthCode = decodedCode;
      const authorizeErrors: string[] = [];

      // Try multiple auth_code formats because TikTok behavior varies by account/region
      for (const candidate of authCodeCandidates) {
        const isEncodedCandidate = candidate.includes("%2B");
        const authPayload: Record<string, any> = {
          advertiser_id: advertiserId,
          auth_code: candidate,
        };

        if (rawOriginalCode) {
          authPayload.original_post_auth_code = isEncodedCandidate ? encodedOriginalCode : decodedOriginalCode;
        }

        const authResp = await fetch(`${TIKTOK_API}/tt_video/authorize/`, {
          method: "POST",
          headers,
          body: JSON.stringify(authPayload),
        });

        authData = await safeJson(authResp);
        console.log("tt_video/authorize response:", JSON.stringify(authData).slice(0, 500));

        if (authData?.code === 0) {
          usedAuthCode = candidate;
          break;
        }

        authorizeErrors.push(String(authData?.message || "unknown error"));
      }

      // If authorization failed, still check tt_video/info because code may already be applied
      const infoCandidates = Array.from(new Set([decodedCode, rawCode].filter(Boolean)));
      let infoData: any = null;

      for (const infoCandidate of infoCandidates) {
        const infoQuery = new URLSearchParams({
          advertiser_id: advertiserId,
          auth_code: infoCandidate,
        });
        const infoResp = await fetch(`${TIKTOK_API}/tt_video/info/?${infoQuery.toString()}`, { headers });
        const currentInfoData = await safeJson(infoResp);

        if (currentInfoData?.code === 0) {
          infoData = currentInfoData;
          usedAuthCode = infoCandidate;
          break;
        }
      }

      const itemId = infoData?.data?.item_id || infoData?.data?.videos?.[0]?.item_id || "";
      const displayName = infoData?.data?.display_name || infoData?.data?.nick_name || "Spark Post";
      const profileImage = infoData?.data?.profile_image || "";

      if ((authData?.code !== 0) && !itemId) {
        return new Response(JSON.stringify({
          success: false,
          error: authData?.message || "Falha ao autorizar o post",
          advertiser_id: advertiserId,
          tips: [
            "Confirme se este Auth Code foi gerado para este mesmo perfil/post.",
            "Selecione a conta de anúncio correta antes de autorizar.",
            "Se o código tiver expirado, gere um novo no TikTok app.",
          ],
          raw: authData,
          attempts: authCodeCandidates.length,
          attempt_errors: authorizeErrors,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        item_id: itemId,
        display_name: displayName,
        profile_image: profileImage,
        identity_id: decodedCode,
        identity_type: "AUTH_CODE",
        raw_info: infoData?.data || {},
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Action: get info about a Spark Ad post ──
    if (action === "get_spark_post_info") {
      const { advertiser_id, auth_code, item_ids } = body;
      if (!advertiser_id) {
        return new Response(JSON.stringify({ error: "advertiser_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (auth_code) {
        const query = new URLSearchParams({
          advertiser_id: String(advertiser_id),
          auth_code: String(auth_code),
        });
        const resp = await fetch(`${TIKTOK_API}/tt_video/info/?${query.toString()}`, { headers });
        const data = await safeJson(resp);
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get authorized videos list
      const query = new URLSearchParams({
        advertiser_id: String(advertiser_id),
      });
      if (item_ids?.length) {
        query.set("item_ids", JSON.stringify(item_ids));
      }
      const resp = await fetch(`${TIKTOK_API}/tt_video/list/?${query.toString()}`, { headers });
      const data = await safeJson(resp);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "blockedword_list") {
      const { advertiser_id } = body;
      if (!advertiser_id) {
        return new Response(JSON.stringify({ error: "advertiser_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const query = new URLSearchParams({ advertiser_id: String(advertiser_id) });
      const resp = await fetch(`${TIKTOK_API}/blockedword/list/?${query.toString()}`, { headers });
      const data = await safeJson(resp);

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Action: blocked words - create (add words) ──
    if (action === "blockedword_create") {
      const { advertiser_id, words } = body;
      if (!advertiser_id || !words?.length) {
        return new Response(JSON.stringify({ error: "advertiser_id and words[] required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // TikTok allows max 500 words, each max 30 chars
      const validWords = (words as string[])
        .map((w: string) => w.trim())
        .filter((w: string) => w.length > 0 && w.length <= 30)
        .slice(0, 500);

      const resp = await fetch(`${TIKTOK_API}/blockedword/create/`, {
        method: "POST",
        headers,
        body: JSON.stringify({ advertiser_id: String(advertiser_id), blocked_words: validWords }),
      });
      const data = await safeJson(resp);

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Action: blocked words - delete ──
    if (action === "blockedword_delete") {
      const { advertiser_id, word_ids } = body;
      if (!advertiser_id || !word_ids?.length) {
        return new Response(JSON.stringify({ error: "advertiser_id and word_ids[] required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const resp = await fetch(`${TIKTOK_API}/blockedword/delete/`, {
        method: "POST",
        headers,
        body: JSON.stringify({ advertiser_id: String(advertiser_id), word_ids }),
      });
      const data = await safeJson(resp);

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Action: blocked words - sync to all accounts in BC ──
    if (action === "blockedword_sync_all") {
      const { words } = body;
      if (!words?.length) {
        return new Response(JSON.stringify({ error: "words[] required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const validWords = (words as string[])
        .map((w: string) => w.trim())
        .filter((w: string) => w.length > 0 && w.length <= 30)
        .slice(0, 500);

      // Get all advertiser IDs from the BC
      const advIds = (bc.advertiser_id || "").split(",").map((id: string) => id.trim()).filter(Boolean);

      if (!advIds.length) {
        return new Response(JSON.stringify({ error: "No advertiser IDs found in this BC" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const results: Array<{ advertiser_id: string; success: boolean; added?: number; error?: string }> = [];

      // Process in parallel batches of 20 to avoid timeout
      const BATCH_SIZE = 20;
      for (let i = 0; i < advIds.length; i += BATCH_SIZE) {
        const batch = advIds.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.allSettled(
          batch.map(async (advId: string) => {
            const resp = await fetch(`${TIKTOK_API}/blockedword/create/`, {
              method: "POST",
              headers,
              body: JSON.stringify({ advertiser_id: advId, blocked_words: validWords }),
            });
            const data = await safeJson(resp);
            if (data.code === 0) {
              return { advertiser_id: advId, success: true, added: validWords.length };
            } else {
              return { advertiser_id: advId, success: false, error: data.message || "API error" };
            }
          })
        );
        for (const r of batchResults) {
          if (r.status === "fulfilled") {
            results.push(r.value);
          } else {
            results.push({ advertiser_id: "unknown", success: false, error: r.reason?.message || "Request failed" });
          }
        }
      }

      const succeeded = results.filter(r => r.success).length;
      return new Response(JSON.stringify({
        success: true,
        total_accounts: advIds.length,
        succeeded,
        failed: advIds.length - succeeded,
        words_sent: validWords.length,
        results,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Action: sync ad-level metrics for creative performance ──
    if (action === "sync_ad_metrics") {
      const { advertiser_id, date_from, date_to } = body;
      if (!advertiser_id) {
        return new Response(JSON.stringify({ error: "advertiser_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const today = new Date().toISOString().split("T")[0];
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
      const startDate = date_from || weekAgo;
      const endDate = date_to || today;

      const adMetrics = [
        "spend", "impressions", "clicks", "cpc", "cpm", "ctr",
        "conversion", "cost_per_conversion",
        "real_time_conversion", "real_time_cost_per_conversion",
        "video_views_p25", "video_views_p50", "video_views_p75", "video_views_p100",
        "likes", "comments", "shares",
      ];
      const adDimensions = ["ad_id", "stat_time_day"];

      const rows: any[] = [];
      const pageSize = 200;
      let page = 1;

      while (page <= 50) {
        const query = new URLSearchParams({
          advertiser_id: String(advertiser_id),
          report_type: "BASIC",
          data_level: "AUCTION_AD",
          dimensions: JSON.stringify(adDimensions),
          metrics: JSON.stringify(adMetrics),
          start_date: startDate,
          end_date: endDate,
          page: String(page),
          page_size: String(pageSize),
        });

        let reportData = await safeJson(await fetch(
          `${TIKTOK_API}/report/integrated/get/?${query.toString()}`,
          { headers }
        ));

        if (reportData.code !== 0 && isMethodNotAllowedError(reportData)) {
          reportData = await safeJson(await fetch(`${TIKTOK_API}/report/integrated/get/`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              advertiser_id,
              report_type: "BASIC",
              data_level: "AUCTION_AD",
              dimensions: adDimensions,
              metrics: adMetrics,
              start_date: startDate,
              end_date: endDate,
              page,
              page_size: pageSize,
            }),
          }));
        }

        if (reportData.code !== 0) break;

        const list = reportData.data?.list || [];
        rows.push(...list);
        if (list.length < pageSize) break;
        page++;
      }

      // Aggregate ad metrics
      const adAgg: Record<string, any> = {};
      for (const row of rows) {
        const dims = row.dimensions || {};
        const metrics = row.metrics || {};
        const adId = String(dims.ad_id || "");
        if (!adId) continue;

        if (!adAgg[adId]) {
          adAgg[adId] = {
            ad_id: adId,
            spend: 0, impressions: 0, clicks: 0,
            conversions: 0,
            video_views_p50: 0, video_views_p100: 0,
            likes: 0, comments: 0, shares: 0,
          };
        }

        adAgg[adId].spend += Math.round(parseFloat(metrics.spend || "0") * 100);
        adAgg[adId].impressions += parseInt(metrics.impressions || "0");
        adAgg[adId].clicks += parseInt(metrics.clicks || "0");
        adAgg[adId].conversions += parseInt(metrics.conversion || "0");
        adAgg[adId].video_views_p50 += parseInt(metrics.video_views_p50 || "0");
        adAgg[adId].video_views_p100 += parseInt(metrics.video_views_p100 || "0");
        adAgg[adId].likes += parseInt(metrics.likes || "0");
        adAgg[adId].comments += parseInt(metrics.comments || "0");
        adAgg[adId].shares += parseInt(metrics.shares || "0");
      }

      for (const ad of Object.values(adAgg) as any[]) {
        ad.cpc = ad.clicks > 0 ? (ad.spend / ad.clicks) : 0;
        ad.ctr = ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100) : 0;
        ad.cost_per_conversion = ad.conversions > 0 ? (ad.spend / ad.conversions) : 0;
      }

      return new Response(JSON.stringify({
        success: true,
        ad_metrics: Object.values(adAgg),
        total_rows: rows.length,
        pages: page,
      }), {
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

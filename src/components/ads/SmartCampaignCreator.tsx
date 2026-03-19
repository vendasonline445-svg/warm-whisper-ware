import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Loader2, Rocket, ShieldCheck, Target,
  Plus, Trash2, Layers, Sparkles, CheckCircle, XCircle, RefreshCw
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

const db = supabase as any;

interface CreationResult {
  advertiser_id: string;
  copy: number;
  success: boolean;
  campaign_id?: string;
  adgroup_id?: string;
  ad_id?: string;
  error?: string;
}

const CTA_OPTIONS = [
  { value: "LEARN_MORE", label: "Saiba Mais" },
  { value: "SHOP_NOW", label: "Comprar Agora" },
  { value: "SIGN_UP", label: "Inscreva-se" },
  { value: "BUY_NOW", label: "Compre Agora" },
  { value: "CONTACT_US", label: "Entre em Contato" },
  { value: "GET_QUOTE", label: "Solicitar Orçamento" },
  { value: "SUBSCRIBE", label: "Assinar" },
  { value: "ORDER_NOW", label: "Peça Agora" },
  { value: "APPLY_NOW", label: "Aplique Agora" },
  { value: "BOOK_NOW", label: "Reserve Agora" },
  { value: "DOWNLOAD", label: "Download" },
  { value: "VIEW_MORE", label: "Ver Mais" },
];

const OPTIMIZATION_GOALS = [
  { value: "CONVERT", label: "Conversão (Recomendado)" },
  { value: "CLICK", label: "Clique no Link" },
  { value: "REACH", label: "Alcance" },
  { value: "IMPRESSION", label: "Impressões" },
  { value: "INSTALL", label: "Instalação de App" },
];

const OPTIMIZATION_EVENTS = [
  { value: "COMPLETE_PAYMENT", label: "Pagamento Completo" },
  { value: "INITIATE_CHECKOUT", label: "Iniciar Checkout" },
  { value: "ADD_TO_CART", label: "Add to Cart" },
  { value: "VIEW_CONTENT", label: "View Content" },
  { value: "CLICK", label: "Clique" },
  { value: "FORM", label: "Formulário Enviado" },
  { value: "REGISTRATION", label: "Registro" },
  { value: "SUBSCRIBE", label: "Assinatura" },
  { value: "CONTACT", label: "Contato" },
  { value: "DOWNLOAD", label: "Download" },
];

export default function SmartCampaignCreator() {
  const [bcs, setBcs] = useState<any[]>([]);
  const [selectedBc, setSelectedBc] = useState("");
  const [accounts, setAccounts] = useState<Array<{ advertiser_id: string; advertiser_name: string; status: string }>>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  // Campaign config
  const [campaignName, setCampaignName] = useState("");
  const [budget, setBudget] = useState("");
  const [budgetMode, setBudgetMode] = useState("BUDGET_MODE_DAY");
  const [bidType, setBidType] = useState("BID_TYPE_CUSTOM");
  const [bid, setBid] = useState("");
  const [pixelId, setPixelId] = useState("");
  const [optimizationGoal, setOptimizationGoal] = useState("CONVERT");
  const [optimizationEvent, setOptimizationEvent] = useState("COMPLETE_PAYMENT");
  const [landingPageUrl, setLandingPageUrl] = useState("");
  const [selectedCTAs, setSelectedCTAs] = useState<string[]>(CTA_OPTIONS.map(c => c.value));

  // Spark Ads — multiple posts with individual auth codes
  const [useSparkAds, setUseSparkAds] = useState(true);
  const [sparkItems, setSparkItems] = useState<string[]>([""]);
  const [identityId, setIdentityId] = useState("");
  const [identityType, setIdentityType] = useState("AUTH_CODE");
  const [availableIdentities, setAvailableIdentities] = useState<Array<{ identity_id: string; identity_type: string; display_name: string }>>([]);
  const [loadingIdentities, setLoadingIdentities] = useState(false);

  // Auth Code flow — supports multiple posts
  const [authCode, setAuthCode] = useState("");
  const [authorizingPost, setAuthorizingPost] = useState(false);
  const [authorizedPosts, setAuthorizedPosts] = useState<Array<{ auth_code: string; item_id: string; display_name: string; identity_id: string; identity_type: string }>>([]);

  // Smart Creative texts (when NOT using Spark Ads)
  const [adTexts, setAdTexts] = useState<string[]>([""]);

  // Audience targeting
  const [ageGroups, setAgeGroups] = useState<string[]>([]);
  const [gender, setGender] = useState("GENDER_UNLIMITED");
  const [scheduleStart, setScheduleStart] = useState("");

  // Bulk config
  const [copies, setCopies] = useState(1);

  // State
  const [creating, setCreating] = useState(false);
  const [results, setResults] = useState<CreationResult[]>([]);

  useEffect(() => { loadBCs(); }, []);

  const loadBCs = async () => {
    const { data } = await db
      .from("business_centers")
      .select("*")
      .eq("platform", "tiktok")
      .not("access_token", "is", null)
      .not("advertiser_id", "is", null);
    setBcs(data || []);
    if (data?.length === 1) setSelectedBc(data[0].id);
  };

  useEffect(() => {
    if (!selectedBc) { setAccounts([]); setSelectedAccounts([]); return; }
    loadAccounts();
  }, [selectedBc]);

  const loadAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const { data, error } = await supabase.functions.invoke("tiktok-sync-campaigns", {
        body: { bc_id: selectedBc, action: "get_advertisers" },
      });
      if (error) throw error;
      setAccounts(data?.data?.list || []);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
    setLoadingAccounts(false);
  };

  const toggleAccount = (advId: string) => {
    setSelectedAccounts(prev =>
      prev.includes(advId) ? prev.filter(id => id !== advId) : [...prev, advId]
    );
  };

  const selectAllActive = () => {
    const activeIds = accounts
      .filter(a => !["STATUS_DISABLE", "STATUS_PENDING_CONFIRM", "STATUS_CONFIRM_FAIL"].includes(a.status))
      .map(a => a.advertiser_id);
    setSelectedAccounts(activeIds);
  };

  const fetchIdentities = async (advId: string) => {
    if (!selectedBc || !advId) return;
    setLoadingIdentities(true);
    try {
      const { data, error } = await supabase.functions.invoke("tiktok-sync-campaigns", {
        body: { bc_id: selectedBc, action: "get_identities", advertiser_id: advId },
      });
      if (error) throw error;
      const ids = data?.identities || [];
      setAvailableIdentities(ids);
      if (ids.length > 0) {
        setIdentityId(ids[0].identity_id);
        setIdentityType(ids[0].identity_type);
        toast({ title: `✅ ${ids.length} identidade(s) encontrada(s) automaticamente` });
      }
      // Don't show error toast here — we'll show the auth code UI instead
    } catch (err: any) {
      console.error("Fetch identities error:", err);
    }
    setLoadingIdentities(false);
  };

  // Authorize a Spark Ads post using auth code
  const authorizeSparkPost = async () => {
    if (!authCode.trim() || !selectedBc) return;
    setAuthorizingPost(true);
    try {
      // Use selected account or fallback to first advertiser_id in BC
      const bcAdvertiserRaw = bcs.find((b: any) => b.id === selectedBc)?.advertiser_id;
      const fallbackAdvId = typeof bcAdvertiserRaw === "string"
        ? bcAdvertiserRaw.split(",").map((id: string) => id.trim()).find(Boolean)
        : "";
      const advId = selectedAccounts[0] || fallbackAdvId;

      if (!advId) {
        toast({ title: "Selecione uma conta", description: "Não foi possível identificar o advertiser_id para autorizar o Spark post.", variant: "destructive" });
        setAuthorizingPost(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("tiktok-sync-campaigns", {
        body: {
          bc_id: selectedBc,
          action: "authorize_spark_post",
          advertiser_id: advId,
          auth_code: authCode.trim(),
        },
      });
      if (error) throw error;
      if (!data?.success) {
        toast({ title: "Falha na autorização", description: data?.error || "Verifique o Auth Code", variant: "destructive" });
        setAuthorizingPost(false);
        return;
      }

      // Auto-fill identity and item_id
      const postIdentityId = authCode.trim();
      const postIdentityType = "AUTH_CODE";
      setIdentityId(postIdentityId);
      setIdentityType(postIdentityType);

      if (data.item_id) {
        // Add the item_id to spark items (replace empty first slot or append)
        const newItems = sparkItems[0] === "" ? [data.item_id] : [...sparkItems, data.item_id];
        setSparkItems(newItems);
        setAuthorizedPosts(prev => [...prev, {
          auth_code: postIdentityId,
          item_id: data.item_id,
          display_name: data.display_name || "Post autorizado",
          identity_id: postIdentityId,
          identity_type: postIdentityType,
        }]);
      }

      toast({
        title: "✅ Post autorizado com sucesso!",
        description: data.item_id
          ? `Item ID: ${data.item_id} — ${data.display_name || ""}`
          : "Auth Code aplicado. Cole o Item ID manualmente se necessário.",
      });
      setAuthCode("");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
    setAuthorizingPost(false);
  };

  // Auto-fetch identities when accounts are selected
  useEffect(() => {
    if (selectedAccounts.length > 0 && useSparkAds) {
      fetchIdentities(selectedAccounts[0]);
    }
  }, [selectedAccounts, useSparkAds]);

  const addAdText = () => {
    if (adTexts.length < 5) setAdTexts([...adTexts, ""]);
  };

  const removeAdText = (index: number) => {
    setAdTexts(adTexts.filter((_, i) => i !== index));
  };

  const updateAdText = (index: number, value: string) => {
    const updated = [...adTexts];
    updated[index] = value;
    setAdTexts(updated);
  };

  const canSubmit = () => {
    if (!campaignName || !budget || !selectedAccounts.length) return false;
    if (bidType === "BID_TYPE_CUSTOM" && !bid) return false;
    if (useSparkAds && (!sparkItems.some(s => s.trim()) || !identityId)) return false;
    if (!useSparkAds && !adTexts.some(t => t.trim())) return false;
    return true;
  };

  const handleCreate = async () => {
    if (!canSubmit()) return;
    setCreating(true);
    setResults([]);

    try {
      const { data, error } = await supabase.functions.invoke("tiktok-sync-campaigns", {
        body: {
          bc_id: selectedBc,
          action: "create_smart_campaign",
          advertiser_id: selectedAccounts[0],
          target_advertiser_ids: selectedAccounts,
          campaign_name: campaignName,
          budget: parseFloat(budget),
          budget_mode: budgetMode,
          bid_type: bidType,
          bid: bid ? parseFloat(bid) : undefined,
          pixel_id: pixelId || undefined,
          optimization_goal: optimizationGoal,
          optimization_event: optimizationEvent,
          landing_page_url: landingPageUrl || undefined,
          call_to_action: selectedCTAs,
          tiktok_item_ids: useSparkAds ? sparkItems.filter(s => s.trim()) : undefined,
          tiktok_item_id: useSparkAds ? sparkItems.filter(s => s.trim())[0] : undefined,
          identity_id: useSparkAds ? identityId : undefined,
          identity_type: useSparkAds ? identityType : undefined,
          // Send per-post identity data for multi-post Spark Ads
          authorized_posts: useSparkAds && authorizedPosts.length > 0 ? authorizedPosts : undefined,
          ad_texts: useSparkAds ? [] : adTexts.filter(t => t.trim()),
          age_groups: ageGroups.length > 0 ? ageGroups : undefined,
          gender: gender !== "GENDER_UNLIMITED" ? gender : undefined,
          schedule_start_time: scheduleStart || undefined,
          copies,
        },
      });

      if (error) throw error;
      setResults(data?.results || []);

      const succeeded = data?.succeeded || 0;
      const total = data?.total || 0;
      toast({
        title: `${succeeded}/${total} campanhas criadas com sucesso`,
        description: succeeded < total ? `${total - succeeded} falharam` : "Todas as campanhas foram criadas!",
        variant: succeeded === total ? "default" : "destructive",
      });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
    setCreating(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Rocket className="h-5 w-5 text-primary" />
        <h2 className="text-base font-bold">Criar Campanha Smart+</h2>
        <Badge variant="outline" className="text-[9px]">BID Cap • OCPM • Sem Pangle • Spark Ads</Badge>
      </div>

      {/* BC Selector */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">Business Center</Label>
          <Select value={selectedBc} onValueChange={setSelectedBc}>
            <SelectTrigger className="h-8 text-xs mt-1">
              <SelectValue placeholder="Selecione o BC" />
            </SelectTrigger>
            <SelectContent>
              {bcs.map((bc: any) => (
                <SelectItem key={bc.id} value={bc.id} className="text-xs">
                  {bc.bc_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedBc && (
        <>
          <Separator />

          {/* Campaign Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4" /> Configuração da Campanha
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Nome da Campanha *</Label>
                  <Input value={campaignName} onChange={e => setCampaignName(e.target.value)}
                    placeholder="Ex: [Smart+] Produto X - BID R$15" className="h-8 text-xs mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Pixel ID</Label>
                  <Input value={pixelId} onChange={e => setPixelId(e.target.value)}
                    placeholder="ID do pixel TikTok" className="h-8 text-xs mt-1" />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">Orçamento (R$) *</Label>
                  <Input type="number" step="0.01" value={budget} onChange={e => setBudget(e.target.value)}
                    placeholder="50.00" className="h-8 text-xs mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Modo</Label>
                  <Select value={budgetMode} onValueChange={setBudgetMode}>
                    <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BUDGET_MODE_DAY" className="text-xs">Diário</SelectItem>
                      <SelectItem value="BUDGET_MODE_TOTAL" className="text-xs">Total</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">BID Cap (R$) *</Label>
                  <Input type="number" step="0.01" value={bid} onChange={e => setBid(e.target.value)}
                    placeholder="15.00" className="h-8 text-xs mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Objetivo de Otimização</Label>
                  <Select value={optimizationGoal} onValueChange={setOptimizationGoal}>
                    <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {OPTIMIZATION_GOALS.map(og => (
                        <SelectItem key={og.value} value={og.value} className="text-xs">
                          {og.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {optimizationGoal === "CONVERT" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Evento de Conversão (external_action)</Label>
                    <Select value={optimizationEvent} onValueChange={setOptimizationEvent}>
                      <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {OPTIMIZATION_EVENTS.map(ev => (
                          <SelectItem key={ev.value} value={ev.value} className="text-xs">
                            {ev.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div>
                <Label className="text-xs">Landing Page URL</Label>
                <Input value={landingPageUrl} onChange={e => setLandingPageUrl(e.target.value)}
                  placeholder="https://seusite.com/produto" className="h-8 text-xs mt-1" />
              </div>

              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1">
                  <p className="text-[10px] font-medium">Placement: TikTok Only • Billing: OCPM</p>
                  <p className="text-[9px] text-muted-foreground">Pangle desabilitado • Pacing suave</p>
                </div>
                <Badge className="text-[9px] bg-primary/10 text-primary border-primary/20">Ativo</Badge>
              </div>

              {/* Audience Targeting */}
              <Separator />
              <div className="space-y-2">
                <Label className="text-xs font-medium">🎯 Segmentação de Público</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[10px]">Gênero</Label>
                    <Select value={gender} onValueChange={setGender}>
                      <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GENDER_UNLIMITED" className="text-xs">Todos</SelectItem>
                        <SelectItem value="GENDER_MALE" className="text-xs">Masculino</SelectItem>
                        <SelectItem value="GENDER_FEMALE" className="text-xs">Feminino</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px]">Agendar Início</Label>
                    <Input type="datetime-local" value={scheduleStart}
                      onChange={e => setScheduleStart(e.target.value)}
                      className="h-8 text-xs mt-1" />
                  </div>
                </div>
                <div>
                  <Label className="text-[10px]">Faixas Etárias</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {["AGE_13_17", "AGE_18_24", "AGE_25_34", "AGE_35_44", "AGE_45_54", "AGE_55_100"].map(age => {
                      const labels: Record<string, string> = {
                        AGE_13_17: "13-17", AGE_18_24: "18-24", AGE_25_34: "25-34",
                        AGE_35_44: "35-44", AGE_45_54: "45-54", AGE_55_100: "55+",
                      };
                      const isSelected = ageGroups.includes(age);
                      return (
                        <button key={age} type="button"
                          onClick={() => setAgeGroups(prev => isSelected ? prev.filter(a => a !== age) : [...prev, age])}
                          className={`px-2 py-1 rounded-md text-[10px] font-medium border transition-colors ${
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted/30 text-muted-foreground border-border"
                          }`}>
                          {labels[age]}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-1">Deixe vazio para todas as idades (recomendado para Smart+).</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Spark Ads / Creative */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> Criativo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch checked={useSparkAds} onCheckedChange={setUseSparkAds} />
                  <Label className="text-xs font-medium">Usar Spark Ads</Label>
                </div>
                {useSparkAds && (
                  <Badge variant="outline" className="text-[9px]">Post orgânico como anúncio (v1.3 creatives[])</Badge>
                )}
              </div>

              {useSparkAds ? (
                <div className="space-y-3 border border-border rounded-lg p-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs">TikTok Item IDs (Posts) * — {sparkItems.filter(s => s.trim()).length} post(s)</Label>
                      {sparkItems.length < 10 && (
                        <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => setSparkItems([...sparkItems, ""])}>
                          <Plus className="h-3 w-3 mr-1" /> Adicionar Post
                        </Button>
                      )}
                    </div>
                    {sparkItems.map((item, i) => (
                      <div key={i} className="flex gap-2 mt-1">
                        <Input
                          value={item}
                          onChange={e => {
                            const updated = [...sparkItems];
                            updated[i] = e.target.value;
                            setSparkItems(updated);
                          }}
                          placeholder={`ID do post TikTok #${i + 1}`}
                          className="h-8 text-xs flex-1"
                        />
                        {sparkItems.length > 1 && (
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setSparkItems(sparkItems.filter((_, j) => j !== i))}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <p className="text-[9px] text-muted-foreground mt-1">Cada post gera um anúncio separado dentro da campanha. Máx. 10.</p>
                  </div>
                  {/* Auth Code Authorization — Primary method for Spark Ads */}
                  <Separator />
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs font-medium">🔑 Autorizar Post via Auth Code</Label>
                      <p className="text-[9px] text-muted-foreground">
                        O dono do post gera o Auth Code no TikTok (Post → Compartilhar → Ad Settings → Gerar Código).
                        Cole o código aqui para autorizar e preencher automaticamente o Item ID e Identity.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={authCode}
                        onChange={e => setAuthCode(e.target.value)}
                        placeholder="Cole o Auth Code do post aqui (ex: #XtjblzbEuO...)"
                        className="h-8 text-xs flex-1"
                      />
                      <Button
                        size="sm"
                        onClick={authorizeSparkPost}
                        disabled={!authCode.trim() || authorizingPost || (!selectedAccounts.length && !selectedBc)}
                        className="h-8 text-[10px]"
                      >
                        {authorizingPost ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                        Autorizar
                      </Button>
                    </div>

                    {/* Show authorized posts */}
                    {authorizedPosts.length > 0 && (
                      <div className="space-y-1">
                        {authorizedPosts.map((p, i) => (
                          <div key={i} className="flex items-center gap-2 text-[10px] p-1.5 rounded bg-primary/5 border border-primary/20">
                            <CheckCircle className="h-3 w-3 text-primary shrink-0" />
                            <span className="font-medium">{p.display_name}</span>
                            <span className="font-mono text-muted-foreground">Item: {p.item_id}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Identity section — auto-filled by auth code or manual */}
                  <Separator />
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-xs">Identity ID {identityId ? "✅" : "*"}</Label>
                        <Button
                          size="sm" variant="outline" className="h-6 text-[10px]"
                          onClick={() => selectedAccounts[0] && fetchIdentities(selectedAccounts[0])}
                          disabled={loadingIdentities || !selectedAccounts.length}
                        >
                          {loadingIdentities ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                          Buscar Identidades
                        </Button>
                      </div>
                      {availableIdentities.length > 0 ? (
                        <Select value={identityId} onValueChange={(val) => {
                          setIdentityId(val);
                          const found = availableIdentities.find(i => i.identity_id === val);
                          if (found) setIdentityType(found.identity_type);
                        }}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Selecione uma identidade" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableIdentities.map(id => (
                              <SelectItem key={id.identity_id} value={id.identity_id} className="text-xs">
                                {id.display_name} ({id.identity_type}) — {id.identity_id.slice(0, 12)}...
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input value={identityId} onChange={e => setIdentityId(e.target.value)}
                          placeholder={identityId ? identityId : "Use Auth Code acima ou cole manualmente"}
                          className="h-8 text-xs" />
                      )}
                      <p className="text-[9px] text-muted-foreground mt-1">
                        {identityId
                          ? `✅ Identity preenchido — Tipo: ${identityType}`
                          : "Autorize um post acima com Auth Code, ou busque identidades existentes (TT_USER, BC_AUTH_TT)."
                        }
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs">Tipo de Identidade</Label>
                      <Select value={identityType} onValueChange={setIdentityType}>
                        <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AUTH_CODE" className="text-xs">Auth Code (Post autorizado)</SelectItem>
                          <SelectItem value="TT_USER" className="text-xs">TT User</SelectItem>
                          <SelectItem value="BC_AUTH_TT" className="text-xs">BC Auth TT</SelectItem>
                          <SelectItem value="CUSTOMIZED_USER" className="text-xs">Customized User</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Textos do Anúncio (1-5)</Label>
                    {adTexts.length < 5 && (
                      <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={addAdText}>
                        <Plus className="h-3 w-3 mr-1" /> Adicionar
                      </Button>
                    )}
                  </div>
                  {adTexts.map((text, i) => (
                    <div key={i} className="flex gap-2">
                      <Input value={text} onChange={e => updateAdText(i, e.target.value)}
                        placeholder={`Texto ${i + 1} (12-40 chars)`}
                        maxLength={40} className="h-8 text-xs flex-1" />
                      {adTexts.length > 1 && (
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => removeAdText(i)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs">Call to Action — {selectedCTAs.length} selecionada(s)</Label>
                    <Button size="sm" variant="ghost" className="h-5 text-[9px] px-2"
                      onClick={() => setSelectedCTAs(
                        selectedCTAs.length === CTA_OPTIONS.length ? [] : CTA_OPTIONS.map(c => c.value)
                      )}>
                      {selectedCTAs.length === CTA_OPTIONS.length ? "Desmarcar todas" : "Selecionar todas"}
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 border border-border rounded-lg p-2">
                    {CTA_OPTIONS.map(cta => {
                      const isSelected = selectedCTAs.includes(cta.value);
                      return (
                        <button
                          key={cta.value}
                          type="button"
                          onClick={() => setSelectedCTAs(prev =>
                            isSelected ? prev.filter(v => v !== cta.value) : [...prev, cta.value]
                          )}
                          className={`px-2 py-1 rounded-md text-[10px] font-medium border transition-colors ${
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted/30 text-muted-foreground border-border opacity-50 line-through"
                          }`}
                        >
                          {cta.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-1">Desmarque as CTAs que não deseja. Smart+ usa todas as selecionadas.</p>
                </div>
                <div>
                  <Label className="text-xs">Cópias por Conta</Label>
                  <Input type="number" min={1} max={50} value={copies}
                    onChange={e => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                    className="h-8 text-xs mt-1" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Layers className="h-4 w-4" /> Contas de Destino
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingAccounts ? (
                <div className="flex items-center justify-center py-6 gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando contas...
                </div>
              ) : accounts.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhuma conta encontrada.</p>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[10px] text-muted-foreground">{selectedAccounts.length} conta(s) selecionada(s)</p>
                    <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={selectAllActive}>
                      Selecionar todas ativas
                    </Button>
                  </div>
                  <div className="border border-border rounded-lg max-h-48 overflow-y-auto divide-y divide-border">
                    {accounts.map((acc) => {
                      const isDisabled = ["STATUS_DISABLE", "STATUS_PENDING_CONFIRM", "STATUS_CONFIRM_FAIL"].includes(acc.status);
                      return (
                        <label key={acc.advertiser_id}
                          className={`flex items-center gap-3 px-3 py-2 text-xs transition-colors ${isDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:bg-muted/50"}`}>
                          <Checkbox
                            checked={selectedAccounts.includes(acc.advertiser_id)}
                            disabled={isDisabled}
                            onCheckedChange={() => !isDisabled && toggleAccount(acc.advertiser_id)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="truncate font-medium">{acc.advertiser_name}</p>
                            <p className="text-[10px] font-mono text-muted-foreground">{acc.advertiser_id}</p>
                          </div>
                          <Badge variant={isDisabled ? "destructive" : "outline"} className="text-[9px]">
                            {isDisabled ? "Suspensa" : "Ativa"}
                          </Badge>
                        </label>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Summary & Create */}
          {selectedAccounts.length > 0 && (
            <Card className="border-primary/30">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium">Resumo da Criação</p>
                    <p className="text-[10px] text-muted-foreground">
                      {copies} cópia(s) × {selectedAccounts.length} conta(s) = <strong>{copies * selectedAccounts.length} campanha(s)</strong>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-[9px]">BID Cap: R$ {bid || "—"}</Badge>
                    <Badge variant="outline" className="text-[9px]">TikTok Only</Badge>
                    <Badge variant="outline" className="text-[9px]">OCPM</Badge>
                    <Badge variant="outline" className="text-[9px]">{useSparkAds ? "Spark Ad" : "Smart Creative"}</Badge>
                  </div>
                </div>
                <Button onClick={handleCreate} className="w-full" disabled={!canSubmit() || creating}>
                  {creating ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Criando campanhas...</>
                  ) : (
                    <><Rocket className="h-4 w-4 mr-2" /> Criar {copies * selectedAccounts.length} Campanha(s) Smart+</>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {results.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Resultados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {results.map((r, i) => (
                    <div key={i} className={`flex items-start gap-2 text-xs p-2 rounded ${r.success ? "bg-emerald-500/5" : "bg-destructive/5"}`}>
                      {r.success ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" /> : <XCircle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />}
                      <div className="min-w-0">
                        <p className="font-mono text-[10px] text-muted-foreground">{r.advertiser_id} (cópia {r.copy})</p>
                        {r.campaign_id && <p className="text-[10px]">Campaign: {r.campaign_id}</p>}
                        {r.adgroup_id && <p className="text-[10px]">AdGroup: {r.adgroup_id}</p>}
                        {r.ad_id && <p className="text-[10px]">Ad: {r.ad_id}</p>}
                        {r.error && <p className="text-[10px] text-destructive">{r.error}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

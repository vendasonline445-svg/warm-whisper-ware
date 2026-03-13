import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Brain, RefreshCw, AlertTriangle, Lightbulb, Target, TrendingUp,
  CheckCircle2, XCircle, ArrowRight, Zap, Loader2, Sparkles,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Bottleneck {
  stage: string;
  severity: "critical" | "warning" | "info";
  description: string;
}

interface Insight {
  title: string;
  description: string;
  type: "problem" | "opportunity" | "success";
}

interface Recommendation {
  action: string;
  impact: "high" | "medium" | "low";
  category: string;
}

interface AIAnalysis {
  score: number;
  scoreLabel: string;
  bottlenecks: Bottleneck[];
  insights: Insight[];
  recommendations: Recommendation[];
  summary: string;
}

interface Props {
  visitors: number;
  buyClicks: number;
  imageClicks: number;
  avgScroll: number;
  checkouts: number;
  abandoned: number;
  pixGenerated: number;
  pixPaid: number;
  cardsCollected: number;
  paid: number;
  pending: number;
  totalRevenue: number;
  activeNow: number;
  totalLeads: number;
}

export default function AdminAIAssistant(props: Props) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const runAnalysis = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error: fnError } = await supabase.functions.invoke("conversion-assistant", {
        body: { metrics: props },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setAnalysis(data as AIAnalysis);
      setLastUpdated(new Date());
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Erro ao analisar dados");
    } finally {
      setLoading(false);
    }
  }, [props]);

  // Auto-run on mount
  useEffect(() => {
    if (!analysis && !loading && props.visitors > 0) {
      runAnalysis();
    }
  }, []);

  const scoreColor = (score: number) =>
    score >= 81 ? "text-emerald-500" : score >= 61 ? "text-green-500" : score >= 31 ? "text-amber-500" : "text-red-500";
  const scoreBg = (score: number) =>
    score >= 81 ? "from-emerald-500/20 to-emerald-500/5" : score >= 61 ? "from-green-500/20 to-green-500/5" : score >= 31 ? "from-amber-500/20 to-amber-500/5" : "from-red-500/20 to-red-500/5";
  const scoreProgressColor = (score: number) =>
    score >= 81 ? "bg-emerald-500" : score >= 61 ? "bg-green-500" : score >= 31 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <Brain className="h-5 w-5 text-purple-500" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">Assistente de Conversão AI</h2>
            <p className="text-xs text-muted-foreground">
              Análise inteligente do funil com recomendações automáticas
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-[10px] text-muted-foreground">
              Atualizado: {lastUpdated.toLocaleTimeString("pt-BR")}
            </span>
          )}
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50 transition-all"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {loading ? "Analisando..." : "Analisar Funil"}
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && !analysis && (
        <div className="bg-card border rounded-2xl p-12 flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-purple-500/10 flex items-center justify-center animate-pulse">
            <Sparkles className="h-8 w-8 text-purple-500" />
          </div>
          <p className="text-sm font-semibold text-muted-foreground">A IA está analisando seu funil...</p>
          <div className="w-48">
            <Progress value={45} className="h-2" />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-destructive/5 border border-destructive/30 rounded-2xl p-5 flex items-center gap-3">
          <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-destructive">Erro na análise</p>
            <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* No data */}
      {!loading && !analysis && !error && props.visitors === 0 && (
        <div className="bg-card border rounded-2xl p-8 text-center">
          <p className="text-muted-foreground text-sm">Sem dados suficientes para análise. Aguarde visitantes no funil.</p>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-6">
          {/* Score Card */}
          <div className={`bg-gradient-to-br ${scoreBg(analysis.score)} border rounded-2xl p-6`}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Score de Conversão</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className={`text-5xl font-black ${scoreColor(analysis.score)}`}>{analysis.score}</span>
                  <span className="text-lg text-muted-foreground font-semibold">/100</span>
                </div>
                <span className={`inline-block mt-2 text-xs font-bold px-3 py-1 rounded-full ${
                  analysis.score >= 81 ? "bg-emerald-500/20 text-emerald-600" :
                  analysis.score >= 61 ? "bg-green-500/20 text-green-600" :
                  analysis.score >= 31 ? "bg-amber-500/20 text-amber-600" :
                  "bg-red-500/20 text-red-600"
                }`}>{analysis.scoreLabel}</span>
              </div>
              <div className="w-full max-w-xs">
                <div className="h-4 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${scoreProgressColor(analysis.score)}`}
                    style={{ width: `${analysis.score}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-muted-foreground mt-1 font-medium">
                  <span>Crítico</span><span>Atenção</span><span>Saudável</span><span>Excelente</span>
                </div>
              </div>
            </div>
            <p className="text-sm text-foreground/80 mt-4 leading-relaxed">{analysis.summary}</p>
          </div>

          {/* Bottlenecks */}
          {analysis.bottlenecks.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Gargalos Detectados
              </h3>
              <div className="space-y-2">
                {analysis.bottlenecks.map((b, i) => (
                  <div key={i} className={`border rounded-2xl p-4 flex items-start gap-3 transition-all hover:scale-[1.005] ${
                    b.severity === "critical" ? "bg-red-500/5 border-red-500/30" :
                    b.severity === "warning" ? "bg-amber-500/5 border-amber-500/30" :
                    "bg-blue-500/5 border-blue-500/30"
                  }`}>
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      b.severity === "critical" ? "bg-red-500/10" :
                      b.severity === "warning" ? "bg-amber-500/10" : "bg-blue-500/10"
                    }`}>
                      <Target className={`h-4 w-4 ${
                        b.severity === "critical" ? "text-red-500" :
                        b.severity === "warning" ? "text-amber-500" : "text-blue-500"
                      }`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{b.stage}</span>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          b.severity === "critical" ? "bg-red-500/20 text-red-600" :
                          b.severity === "warning" ? "bg-amber-500/20 text-amber-600" :
                          "bg-blue-500/20 text-blue-600"
                        }`}>{b.severity === "critical" ? "Crítico" : b.severity === "warning" ? "Atenção" : "Info"}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{b.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Insights */}
          {analysis.insights.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Lightbulb className="h-4 w-4" /> Insights
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {analysis.insights.map((ins, i) => (
                  <div key={i} className={`border rounded-2xl p-4 transition-all hover:scale-[1.02] ${
                    ins.type === "problem" ? "bg-red-500/5 border-red-500/20" :
                    ins.type === "opportunity" ? "bg-blue-500/5 border-blue-500/20" :
                    "bg-emerald-500/5 border-emerald-500/20"
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      {ins.type === "problem" ? <XCircle className="h-4 w-4 text-red-500" /> :
                       ins.type === "opportunity" ? <Zap className="h-4 w-4 text-blue-500" /> :
                       <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                      <span className={`text-[10px] font-bold uppercase ${
                        ins.type === "problem" ? "text-red-500" :
                        ins.type === "opportunity" ? "text-blue-500" : "text-emerald-500"
                      }`}>{ins.type === "problem" ? "Problema" : ins.type === "opportunity" ? "Oportunidade" : "Sucesso"}</span>
                    </div>
                    <p className="text-sm font-bold">{ins.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{ins.description}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Recommendations */}
          {analysis.recommendations.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Recomendações
              </h3>
              <div className="bg-card border rounded-2xl divide-y">
                {analysis.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      rec.impact === "high" ? "bg-emerald-500/10" :
                      rec.impact === "medium" ? "bg-amber-500/10" : "bg-muted"
                    }`}>
                      <ArrowRight className={`h-4 w-4 ${
                        rec.impact === "high" ? "text-emerald-500" :
                        rec.impact === "medium" ? "text-amber-500" : "text-muted-foreground"
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{rec.action}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          rec.impact === "high" ? "bg-emerald-500/20 text-emerald-600" :
                          rec.impact === "medium" ? "bg-amber-500/20 text-amber-600" :
                          "bg-muted text-muted-foreground"
                        }`}>Impacto {rec.impact === "high" ? "Alto" : rec.impact === "medium" ? "Médio" : "Baixo"}</span>
                        <span className="text-[10px] font-medium text-muted-foreground px-2 py-0.5 rounded-full bg-muted">{rec.category}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

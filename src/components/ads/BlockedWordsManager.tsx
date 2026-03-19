import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { ShieldBan, Send, Loader2, CheckCircle2, XCircle, Trash2, RefreshCw } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const db = supabase as any;

interface BCInfo {
  id: string;
  bc_name: string;
  advertiser_id: string;
  access_token: string;
}

interface SyncResult {
  advertiser_id: string;
  success: boolean;
  added?: number;
  error?: string;
}

export default function BlockedWordsManager() {
  const [bcs, setBcs] = useState<BCInfo[]>([]);
  const [selectedBcId, setSelectedBcId] = useState<string>("");
  const [wordsText, setWordsText] = useState("");
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<SyncResult[]>([]);
  const [existingWords, setExistingWords] = useState<Array<{ word_id: string; word: string }>>([]);
  const [loadingWords, setLoadingWords] = useState(false);
  const [selectedAdvForView, setSelectedAdvForView] = useState("");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await db
        .from("business_centers")
        .select("id, bc_name, advertiser_id, access_token")
        .eq("status", "active");
      setBcs(data || []);
      if (data?.length === 1) setSelectedBcId(data[0].id);
    })();
  }, []);

  const selectedBc = bcs.find(b => b.id === selectedBcId);
  const advIds = (selectedBc?.advertiser_id || "").split(",").map(s => s.trim()).filter(Boolean);

  const wordList = wordsText
    .split(/[,\n]/)
    .map(w => w.trim())
    .filter(w => w.length > 0);

  const invalidWords = wordList.filter(w => w.length > 30);

  const handleSyncAll = async () => {
    if (!selectedBcId || !wordList.length) {
      toast({ title: "Preencha as palavras e selecione um BC", variant: "destructive" });
      return;
    }

    if (invalidWords.length > 0) {
      toast({ title: `${invalidWords.length} palavras excedem 30 caracteres`, variant: "destructive" });
      return;
    }

    setSending(true);
    setResults([]);
    setProgress(10);

    try {
      const { data, error } = await supabase.functions.invoke("tiktok-sync-campaigns", {
        body: { action: "blockedword_sync_all", bc_id: selectedBcId, words: wordList },
      });

      setProgress(100);

      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
      } else if (data?.results) {
        setResults(data.results);
        const s = data.succeeded || 0;
        const f = data.failed || 0;
        toast({
          title: `Blocked Words sincronizadas`,
          description: `✅ ${s} contas atualizadas, ❌ ${f} falharam — ${data.words_sent} palavras enviadas`,
        });
      }
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const loadExistingWords = async (advId: string) => {
    if (!selectedBcId || !advId) return;
    setLoadingWords(true);
    setSelectedAdvForView(advId);
    setExistingWords([]);

    try {
      const { data, error } = await supabase.functions.invoke("tiktok-sync-campaigns", {
        body: { action: "blockedword_list", bc_id: selectedBcId, advertiser_id: advId },
      });

      if (data?.code === 0 && data?.data?.words) {
        setExistingWords(data.data.words);
      } else {
        toast({ title: "Erro ao carregar", description: data?.message || error?.message, variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setLoadingWords(false);
    }
  };

  const deleteWord = async (wordId: string) => {
    if (!selectedBcId || !selectedAdvForView) return;

    try {
      const { data } = await supabase.functions.invoke("tiktok-sync-campaigns", {
        body: { action: "blockedword_delete", bc_id: selectedBcId, advertiser_id: selectedAdvForView, word_ids: [wordId] },
      });

      if (data?.code === 0) {
        setExistingWords(prev => prev.filter(w => w.word_id !== wordId));
        toast({ title: "Palavra removida" });
      } else {
        toast({ title: "Erro", description: data?.message, variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldBan className="h-5 w-5 text-destructive" />
            Blocked Words — Sincronização em Massa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Envie até <strong>500 palavras</strong> (máx. 30 caracteres cada) para bloquear comentários em <strong>todas as contas de anúncio</strong> do Business Center selecionado.
          </p>

          {/* BC Selector */}
          <div>
            <label className="text-sm font-medium mb-1 block">Business Center</label>
            <Select value={selectedBcId} onValueChange={setSelectedBcId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um BC" />
              </SelectTrigger>
              <SelectContent>
                {bcs.map(bc => (
                  <SelectItem key={bc.id} value={bc.id}>
                    {bc.bc_name} ({(bc.advertiser_id || "").split(",").filter(Boolean).length} contas)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedBc && (
            <div className="text-xs text-muted-foreground">
              <strong>{advIds.length}</strong> contas de anúncio serão atualizadas
            </div>
          )}

          {/* Words Input */}
          <div>
            <label className="text-sm font-medium mb-1 block">
              Palavras Bloqueadas ({wordList.length}/500)
            </label>
            <Textarea
              placeholder="Digite as palavras separadas por vírgula ou uma por linha. Ex:&#10;comprar&#10;venda&#10;promoção&#10;golpe, fraude, scam"
              className="min-h-[200px] font-mono text-sm"
              value={wordsText}
              onChange={e => setWordsText(e.target.value)}
            />
            {wordList.length > 500 && (
              <p className="text-xs text-destructive mt-1">
                Máximo 500 palavras. Você tem {wordList.length}.
              </p>
            )}
            {invalidWords.length > 0 && (
              <p className="text-xs text-destructive mt-1">
                {invalidWords.length} palavra(s) com mais de 30 caracteres: {invalidWords.slice(0, 3).join(", ")}...
              </p>
            )}
          </div>

          {/* Summary */}
          <div className="flex items-center gap-4 text-sm">
            <Badge variant="outline">{wordList.length} palavras</Badge>
            <Badge variant="outline">{advIds.length} contas</Badge>
            {wordList.length > 0 && invalidWords.length === 0 && (
              <Badge className="bg-green-500/10 text-green-600 border-green-500/30">Pronto para enviar</Badge>
            )}
          </div>

          {/* Send Button */}
          <Button
            onClick={handleSyncAll}
            disabled={sending || !selectedBcId || wordList.length === 0 || wordList.length > 500 || invalidWords.length > 0}
            className="w-full"
            size="lg"
          >
            {sending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando para {advIds.length} contas...</>
            ) : (
              <><Send className="h-4 w-4 mr-2" /> Enviar Blocked Words para todas as contas</>
            )}
          </Button>

          {sending && <Progress value={progress} className="h-2" />}

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Resultados:</h4>
              <div className="max-h-60 overflow-y-auto space-y-1">
                {results.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs p-2 rounded bg-secondary/50">
                    {r.success ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive shrink-0" />
                    )}
                    <span className="font-mono">{r.advertiser_id}</span>
                    {r.success ? (
                      <span className="text-muted-foreground">— {r.added} palavras adicionadas</span>
                    ) : (
                      <span className="text-destructive">{r.error}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View existing blocked words per account */}
      {selectedBc && advIds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Visualizar Palavras por Conta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Select value={selectedAdvForView} onValueChange={v => loadExistingWords(v)}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecione uma conta para visualizar" />
                </SelectTrigger>
                <SelectContent>
                  {advIds.map(id => (
                    <SelectItem key={id} value={id}>{id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedAdvForView && (
                <Button variant="outline" size="icon" onClick={() => loadExistingWords(selectedAdvForView)} disabled={loadingWords}>
                  <RefreshCw className={`h-4 w-4 ${loadingWords ? "animate-spin" : ""}`} />
                </Button>
              )}
            </div>

            {loadingWords && <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>}

            {!loadingWords && selectedAdvForView && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">{existingWords.length} palavras bloqueadas</p>
                <div className="flex flex-wrap gap-1.5 max-h-60 overflow-y-auto">
                  {existingWords.map(w => (
                    <Badge key={w.word_id} variant="secondary" className="gap-1 pr-1">
                      {w.word}
                      <button
                        onClick={() => deleteWord(w.word_id)}
                        className="ml-1 hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  {existingWords.length === 0 && (
                    <p className="text-xs text-muted-foreground">Nenhuma palavra bloqueada nesta conta</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

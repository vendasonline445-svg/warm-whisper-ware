import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";

interface Pixel {
  id: string;
  name: string;
  pixel_id: string;
  api_token: string;
  status: string;
  created_at: string;
}

export default function AdminTikTokTab() {
  const [pixels, setPixels] = useState<Pixel[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", pixel_id: "", api_token: "" });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchPixels();
  }, []);

  const fetchPixels = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("tiktok_pixels")
      .select("*")
      .order("created_at", { ascending: false });
    setPixels((data as Pixel[]) || []);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!form.name || !form.pixel_id || !form.api_token) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    setAdding(true);
    const { error } = await supabase.from("tiktok_pixels").insert({
      name: form.name,
      pixel_id: form.pixel_id,
      api_token: form.api_token,
      status: "active",
    });
    if (error) {
      toast({ title: "Erro ao adicionar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Pixel adicionado!" });
      setForm({ name: "", pixel_id: "", api_token: "" });
      fetchPixels();
    }
    setAdding(false);
  };

  const toggleStatus = async (pixel: Pixel) => {
    const newStatus = pixel.status === "active" ? "inactive" : "active";
    const { error } = await supabase.from("tiktok_pixels").update({ status: newStatus }).eq("id", pixel.id);
    if (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    } else {
      fetchPixels();
    }
  };

  const deletePixel = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover este pixel?")) return;
    const { error } = await supabase.from("tiktok_pixels").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
    } else {
      fetchPixels();
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Add Pixel Form */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <Plus className="h-4 w-4" /> Adicionar Pixel
        </h2>
        <input
          placeholder="Nome do Pixel (ex: Campanha Principal)"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full border rounded-lg px-4 py-2.5 text-sm bg-background"
        />
        <input
          placeholder="Pixel ID (ex: D6GM4RBC77UAAN00B800)"
          value={form.pixel_id}
          onChange={(e) => setForm({ ...form, pixel_id: e.target.value })}
          className="w-full border rounded-lg px-4 py-2.5 text-sm bg-background"
        />
        <input
          placeholder="Events API Access Token"
          value={form.api_token}
          onChange={(e) => setForm({ ...form, api_token: e.target.value })}
          type="password"
          className="w-full border rounded-lg px-4 py-2.5 text-sm bg-background"
        />
        <button
          onClick={handleAdd}
          disabled={adding}
          className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-semibold text-sm disabled:opacity-50"
        >
          {adding ? "Adicionando..." : "Adicionar Pixel"}
        </button>
      </div>

      {/* Pixel List */}
      <div className="space-y-3">
        <h2 className="font-semibold text-sm">Pixels cadastrados ({pixels.length})</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : pixels.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum pixel cadastrado.</p>
        ) : (
          pixels.map((px) => (
            <div
              key={px.id}
              className={`rounded-xl border p-4 space-y-2 ${
                px.status === "active" ? "bg-card" : "bg-muted/30 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{px.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{px.pixel_id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleStatus(px)} title="Alternar status">
                    {px.status === "active" ? (
                      <ToggleRight className="h-6 w-6 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="h-6 w-6 text-muted-foreground" />
                    )}
                  </button>
                  <button onClick={() => deletePixel(px.id)} title="Remover">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className={`px-2 py-0.5 rounded-full font-medium ${
                  px.status === "active" ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"
                }`}>
                  {px.status === "active" ? "Ativo" : "Inativo"}
                </span>
                <span className="text-muted-foreground">
                  Token: {px.api_token.slice(0, 8)}...
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

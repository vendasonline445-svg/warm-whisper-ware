import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Package, Search, Filter } from "lucide-react";

const ADMIN_PASSWORD = "12345";

type TrackingStatus = "all" | "enviado" | "em_transito" | "entregue";

interface OrderTracking {
  id: string;
  order_id: string;
  customer_name: string;
  customer_email: string;
  product_name: string;
  zipcode: string;
  tracking_code: string | null;
  tracking_url: string | null;
  status: string;
  created_at: string;
}

export default function AdminRastreios() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [orders, setOrders] = useState<OrderTracking[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<TrackingStatus>("all");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
    } else {
      alert("Senha incorreta");
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    let query = supabase
      .from("order_tracking")
      .select("*")
      .order("created_at", { ascending: false });

    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const { data, error } = await query;
    if (!error && data) {
      setOrders(data as OrderTracking[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (authenticated) fetchOrders();
  }, [authenticated, filter]);

  const filteredOrders = orders.filter((o) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      o.customer_name.toLowerCase().includes(s) ||
      o.customer_email.toLowerCase().includes(s) ||
      o.zipcode?.includes(s) ||
      o.tracking_code?.toLowerCase().includes(s)
    );
  });

  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      enviado: "Enviado",
      em_transito: "Em Trânsito",
      entregue: "Entregue",
    };
    return map[s] || s;
  };

  const statusColor = (s: string) => {
    const map: Record<string, string> = {
      enviado: "bg-blue-100 text-blue-800",
      em_transito: "bg-yellow-100 text-yellow-800",
      entregue: "bg-green-100 text-green-800",
    };
    return map[s] || "bg-gray-100 text-gray-800";
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <form onSubmit={handleLogin} className="bg-background p-8 rounded-xl shadow-lg w-full max-w-sm space-y-4">
          <h1 className="text-xl font-bold text-center">Painel de Rastreios</h1>
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-lg px-4 py-2"
          />
          <button type="submit" className="w-full bg-primary text-primary-foreground py-2 rounded-lg font-semibold">
            Entrar
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/admin")} className="p-2 hover:bg-background rounded-lg">
              <ArrowLeft size={20} />
            </button>
            <Package size={24} className="text-primary" />
            <h1 className="text-2xl font-bold">Rastreios</h1>
          </div>
          <span className="text-sm text-muted-foreground">{filteredOrders.length} pedidos</span>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nome, email, CEP ou código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "enviado", "em_transito", "entregue"] as TrackingStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-background border hover:bg-accent"
                }`}
              >
                {s === "all" ? "Todos" : statusLabel(s)}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-background rounded-xl shadow overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Nenhum rastreio encontrado</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-semibold">Pedido</th>
                  <th className="text-left px-4 py-3 font-semibold">Cliente</th>
                  <th className="text-left px-4 py-3 font-semibold">Produto</th>
                  <th className="text-left px-4 py-3 font-semibold">CEP</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="text-left px-4 py-3 font-semibold">Rastreio</th>
                  <th className="text-left px-4 py-3 font-semibold">Data</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">{order.order_id.slice(0, 8)}...</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{order.customer_name}</div>
                      <div className="text-xs text-muted-foreground">{order.customer_email}</div>
                    </td>
                    <td className="px-4 py-3">{order.product_name}</td>
                    <td className="px-4 py-3">{order.zipcode || "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(order.status)}`}>
                        {statusLabel(order.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {order.tracking_code ? (
                        order.tracking_url ? (
                          <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className="text-primary underline text-xs">
                            {order.tracking_code}
                          </a>
                        ) : (
                          <span className="text-xs font-mono">{order.tracking_code}</span>
                        )
                      ) : (
                        <span className="text-muted-foreground text-xs">Pendente</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

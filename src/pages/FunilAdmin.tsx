import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useState } from "react";
import { FunilPedidos } from "@/components/funil/FunilPedidos";
import { FunilLeads } from "@/components/funil/FunilLeads";
import { FunilRastreios } from "@/components/funil/FunilRastreios";
import { FunilMetricas } from "@/components/funil/FunilMetricas";

type FunilTab = "pedidos" | "leads" | "rastreios" | "metricas";

export default function FunilAdmin() {
  const [tab, setTab] = useState<FunilTab>("pedidos");

  const tabs: { id: FunilTab; label: string }[] = [
    { id: "pedidos", label: "Pedidos" },
    { id: "leads", label: "Leads" },
    { id: "rastreios", label: "Rastreios" },
    { id: "metricas", label: "Métricas" },
  ];

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-background">
        <aside className="w-52 border-r border-border flex flex-col">
          <div className="p-5 border-b border-border">
            <p className="font-semibold text-sm">Mesa Dobrável</p>
            <p className="text-xs text-muted-foreground mt-0.5">Painel do Funil</p>
          </div>
          <nav className="flex-1 p-3 space-y-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  tab === t.id
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
          <div className="p-3 border-t border-border">
            <a
              href="/admin"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Voltar ao FunnelIQ
            </a>
          </div>
        </aside>

        <main className="flex-1 overflow-auto">
          {tab === "pedidos" && <FunilPedidos />}
          {tab === "leads" && <FunilLeads />}
          {tab === "rastreios" && <FunilRastreios />}
          {tab === "metricas" && <FunilMetricas />}
        </main>
      </div>
    </ProtectedRoute>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const SITE_ID = "mesa-dobravel";

type StatusFilter =
  | "todos"
  | "paid"
  | "pix_generated"
  | "pending"
  | "card_submitted"
  | "checkout_started";

export function FunilLeads() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("todos");

  async function load(status: StatusFilter) {
    setLoading(true);
    let query = supabase
      .from("checkout_leads")
      .select("*")
      .eq("site_id", SITE_ID)
      .order("created_at", { ascending: false })
      .limit(300);

    if (status !== "todos") query = query.eq("status", status);

    const { data } = await query;
    setLeads(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load(filter);
  }, [filter]);

  const filters: { id: StatusFilter; label: string }[] = [
    { id: "todos", label: "Todos" },
    { id: "paid", label: "Pagos" },
    { id: "pix_generated", label: "PIX Gerado" },
    { id: "pending", label: "Pendentes" },
    { id: "card_submitted", label: "Cartão" },
    { id: "checkout_started", label: "Abandonos" },
  ];

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Leads</h1>
      <div className="flex gap-2 mb-6 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted border-b border-border">
              <tr>
                {["Data", "Nome", "Email", "Telefone", "Status"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-medium text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.map((l, i) => (
                <tr
                  key={l.id}
                  className={`border-b border-border last:border-0 ${
                    i % 2 === 0 ? "" : "bg-muted/30"
                  }`}
                >
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(l.created_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 font-medium">{l.name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {l.email ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {l.phone ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                      {l.status ?? "—"}
                    </span>
                  </td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center py-12 text-muted-foreground text-sm"
                  >
                    Nenhum lead encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

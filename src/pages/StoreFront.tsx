import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/use-cart";
import { ShoppingCart, Search, Star } from "lucide-react";

export default function StoreFront() {
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const { totalItems } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    supabase
      .from("products")
      .select("*")
      .eq("active", true)
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false })
      .then(({ data }) => setProducts(data ?? []));
  }, []);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const formatPrice = (cents: number) =>
    (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="flex-1 flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar produtos..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <button
            onClick={() => navigate("/carrinho")}
            className="relative p-2 rounded-lg hover:bg-muted"
          >
            <ShoppingCart className="w-5 h-5" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Banner */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 px-4 py-3 text-white text-center text-sm font-medium">
        ⚡ Frete grátis em todos os pedidos hoje!
      </div>

      {/* Grid de produtos */}
      <div className="p-3">
        <div className="grid grid-cols-2 gap-2">
          {filtered.map(product => (
            <div
              key={product.id}
              onClick={() => navigate(`/p/${product.slug}`)}
              className="bg-card border border-border rounded-xl overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="aspect-square bg-muted relative">
                {product.images?.[0]?.url ? (
                  <img
                    src={product.images[0].url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                    Sem foto
                  </div>
                )}
                {product.badge_text && (
                  <span className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded font-medium">
                    {product.badge_text}
                  </span>
                )}
              </div>

              <div className="p-2">
                <p className="text-xs text-foreground line-clamp-2 leading-tight mb-1">
                  {product.name}
                </p>
                <div className="flex items-center gap-1 mb-1">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs text-muted-foreground">
                    {product.rating} ({product.rating_count})
                  </span>
                </div>
                <div>
                  {product.original_price_cents && (
                    <p className="text-xs text-muted-foreground line-through">
                      {formatPrice(product.original_price_cents)}
                    </p>
                  )}
                  <p className="text-base font-bold text-foreground">
                    {formatPrice(product.price_cents)}
                  </p>
                  {product.installments > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {product.installments}x de {formatPrice(Math.ceil(product.price_cents / product.installments))} s/juros
                    </p>
                  )}
                </div>
                {product.sold_count > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {product.sold_count.toLocaleString("pt-BR")} vendidos
                  </p>
                )}
                {product.free_shipping && (
                  <p className="text-xs text-green-600 font-medium mt-1">
                    Frete grátis
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground text-sm">
            Nenhum produto encontrado
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border flex">
        <button className="flex-1 py-3 text-xs text-center text-primary font-medium">
          🏠 Loja
        </button>
        <button
          onClick={() => navigate("/carrinho")}
          className="flex-1 py-3 text-xs text-center text-muted-foreground relative"
        >
          🛒 Carrinho
          {totalItems > 0 && (
            <span className="absolute top-1 right-6 w-4 h-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
              {totalItems}
            </span>
          )}
        </button>
        <button
          onClick={() => navigate("/loja-admin")}
          className="flex-1 py-3 text-xs text-center text-muted-foreground"
        >
          ⚙️ Admin
        </button>
      </nav>

      <div className="h-16" />
    </div>
  );
}

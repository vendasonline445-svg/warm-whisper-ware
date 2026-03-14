import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/use-cart";

export default function ProductPage() {
  const { slug } = useParams();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState({ h: "00", m: "20", s: "00" });
  const { addItem, totalItems } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    if (!slug) return;
    supabase
      .from("products")
      .select("*")
      .eq("slug", slug)
      .eq("active", true)
      .single()
      .then(({ data }) => {
        setProduct(data);
        setLoading(false);
        if (data?.variants && Array.isArray(data.variants)) {
          const defaults: Record<string, string> = {};
          (data.variants as any[]).forEach((v: any) => {
            if (v.options?.[0]) defaults[v.name] = v.options[0].value;
          });
          setSelectedVariants(defaults);
        }
      });
  }, [slug]);

  useEffect(() => {
    if (!product?.countdown_minutes) return;
    let total = product.countdown_minutes * 60;
    const timer = setInterval(() => {
      total--;
      if (total <= 0) { clearInterval(timer); return; }
      const h = Math.floor(total / 3600);
      const m = Math.floor((total % 3600) / 60);
      const s = total % 60;
      setTimeLeft({
        h: String(h).padStart(2, "0"),
        m: String(m).padStart(2, "0"),
        s: String(s).padStart(2, "0"),
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [product]);

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
    </div>
  );

  if (!product) return (
    <div className="flex flex-col items-center justify-center h-screen gap-3">
      <p className="text-muted-foreground">Produto não encontrado</p>
      <button onClick={() => navigate("/loja")} className="text-primary text-sm">
        ← Voltar à loja
      </button>
    </div>
  );

  const formatPrice = (cents: number) =>
    (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const discount = product.original_price_cents
    ? Math.round((1 - product.price_cents / product.original_price_cents) * 100)
    : 0;

  const variants = Array.isArray(product.variants) ? product.variants as any[] : [];

  const handleBuyNow = () => {
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      imageUrl: product.images?.[0]?.url ?? "",
      priceCents: product.price_cents,
      variant: selectedVariants,
    });
    const params = new URLSearchParams({
      product: product.slug,
      price: String(product.price_cents),
      name: product.name,
      ...Object.entries(selectedVariants).reduce((acc, [k, v]) => ({
        ...acc, [k.toLowerCase()]: v
      }), {}),
    });
    navigate(`/checkout?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-50 bg-background border-b border-border flex items-center justify-between px-4 py-3">
        <button onClick={() => navigate(-1)} className="text-foreground">
          ← Voltar
        </button>
        <button onClick={() => navigate("/carrinho")} className="relative">
          🛒
          {totalItems > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
              {totalItems}
            </span>
          )}
        </button>
      </header>

      <div className="aspect-square bg-muted">
        {product.images?.[0]?.url ? (
          <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            Sem foto
          </div>
        )}
      </div>

      <div className="px-4 py-4 space-y-4">
        {product.badge_text && product.countdown_minutes > 0 && (
          <div className="flex items-center justify-between bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-red-500">⚡</span>
              <span className="text-sm font-semibold text-red-600">{product.badge_text}</span>
            </div>
            <div className="flex items-center gap-1 text-red-600 font-mono text-sm font-bold">
              <span>{timeLeft.h}</span>:<span>{timeLeft.m}</span>:<span>{timeLeft.s}</span>
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold">{formatPrice(product.price_cents)}</span>
            {discount > 0 && (
              <span className="bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded font-medium">
                -{discount}%
              </span>
            )}
          </div>
          {product.original_price_cents && (
            <p className="text-sm text-muted-foreground line-through">
              {formatPrice(product.original_price_cents)}
            </p>
          )}
          {product.installments > 0 && (
            <p className="text-sm text-muted-foreground">
              {product.installments}x de {formatPrice(Math.ceil(product.price_cents / product.installments))} sem juros no cartão
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex">
            {[1,2,3,4,5].map(i => (
              <span key={i} className={`text-sm ${i <= Math.round(product.rating) ? 'text-yellow-400' : 'text-muted-foreground/30'}`}>★</span>
            ))}
          </div>
          <span className="text-sm font-medium">{product.rating}</span>
          <span className="text-sm text-muted-foreground">({product.rating_count} avaliações)</span>
          {product.sold_count > 0 && (
            <span className="text-sm text-muted-foreground">• {product.sold_count?.toLocaleString("pt-BR")} vendidos</span>
          )}
        </div>

        {product.buyers_last_days > 0 && (
          <p className="text-sm text-orange-600 font-medium">
            🔥 {product.buyers_last_days.toLocaleString("pt-BR")}+ pessoas compraram nos últimos {product.buyers_days_window} dias
          </p>
        )}

        <h1 className="text-base font-semibold leading-snug">{product.name}</h1>

        {variants.map((variant: any) => (
          <div key={variant.name}>
            <p className="text-sm font-medium mb-2">{variant.name}:</p>
            <div className="flex flex-wrap gap-2">
              {variant.options?.map((opt: any) => (
                <button
                  key={opt.value}
                  onClick={() => setSelectedVariants(prev => ({ ...prev, [variant.name]: opt.value }))}
                  className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                    selectedVariants[variant.name] === opt.value
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-green-600">📦</span>
            <div>
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                {product.free_shipping ? 'Frete grátis' : 'Frete calculado no checkout'}
              </p>
              <p className="text-xs text-green-600">
                Receba em {product.shipping_days_min}-{product.shipping_days_max} dias úteis
                {product.free_shipping && product.shipping_original_cents > 0 && (
                  <span className="line-through ml-1">
                    Taxa: {formatPrice(product.shipping_original_cents)}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>🔒</span>
          <span>100% Protegido • Compra Garantida</span>
        </div>

        {product.description && (
          <div>
            <h3 className="text-sm font-semibold mb-2">Descrição</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-3 flex gap-2">
        <button
          onClick={() => {
            addItem({
              productId: product.id,
              slug: product.slug,
              name: product.name,
              imageUrl: product.images?.[0]?.url ?? "",
              priceCents: product.price_cents,
              variant: selectedVariants,
            });
            navigate("/carrinho");
          }}
          className="flex-1 py-3 rounded-xl border border-primary text-primary text-sm font-semibold"
        >
          Adicionar ao carrinho
        </button>
        <button
          onClick={handleBuyNow}
          className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
        >
          COMPRAR AGORA
        </button>
      </div>
    </div>
  );
}

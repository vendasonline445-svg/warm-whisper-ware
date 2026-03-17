import { createContext, useContext, useState, useEffect } from "react";

export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  imageUrl: string;
  priceCents: number;
  quantity: number;
  variant?: Record<string, string>;
}

interface CartContextType {
  items: CartItem[];
  totalItems: number;
  totalCents: number;
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType>({} as CartContextType);

const CART_KEY = 'fiq_cart';
const CART_TS_KEY = 'fiq_cart_ts';
const CART_TTL_MS = 30 * 60 * 1000; // 30 minutes

function loadCart(): CartItem[] {
  try {
    const ts = Number(localStorage.getItem(CART_TS_KEY) || '0');
    if (Date.now() - ts > CART_TTL_MS) {
      localStorage.removeItem(CART_KEY);
      localStorage.removeItem(CART_TS_KEY);
      return [];
    }
    const saved = localStorage.getItem(CART_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCart);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    if (items.length > 0) {
      // only set timestamp when cart has items
      if (!localStorage.getItem(CART_TS_KEY)) {
        localStorage.setItem(CART_TS_KEY, String(Date.now()));
      }
    } else {
      localStorage.removeItem(CART_TS_KEY);
    }
  }, [items]);

  // Check expiry every minute
  useEffect(() => {
    const interval = setInterval(() => {
      const ts = Number(localStorage.getItem(CART_TS_KEY) || '0');
      if (ts && Date.now() - ts > CART_TTL_MS) {
        setItems([]);
        localStorage.removeItem(CART_KEY);
        localStorage.removeItem(CART_TS_KEY);
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const addItem = (newItem: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
    setItems(prev => {
      const existing = prev.find(i => i.productId === newItem.productId);
      if (existing) {
        return prev.map(i =>
          i.productId === newItem.productId
            ? { ...i, quantity: i.quantity + (newItem.quantity ?? 1) }
            : i
        );
      }
      return [...prev, { ...newItem, quantity: newItem.quantity ?? 1 }];
    });
  };

  const removeItem = (productId: string) =>
    setItems(prev => prev.filter(i => i.productId !== productId));

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) { removeItem(productId); return; }
    setItems(prev => prev.map(i =>
      i.productId === productId ? { ...i, quantity } : i
    ));
  };

  const clearCart = () => setItems([]);

  return (
    <CartContext.Provider value={{
      items,
      totalItems: items.reduce((s, i) => s + i.quantity, 0),
      totalCents: items.reduce((s, i) => s + i.priceCents * i.quantity, 0),
      addItem, removeItem, updateQuantity, clearCart,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);

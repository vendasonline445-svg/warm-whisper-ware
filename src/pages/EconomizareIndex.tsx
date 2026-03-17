import { useState, useEffect, useRef, useCallback } from "react";
import confetti from "canvas-confetti";
import { useNavigate } from "react-router-dom";
import { trackFunnelEvent } from "@/lib/tracking-hub";
import { getUrlWithUtm } from "@/utils/utm";
import { trackEvent, trackPageViewOnce } from "@/utils/track-event";
import {
  Star, ChevronLeft, ChevronRight, ShoppingCart, Check, Trash2,
  Truck, Shield, Package, Clock, Zap, CheckCircle2, X,
  Store, MessageCircle, Share2, MoreHorizontal, Gift, Copy, Camera, MapPin,
  CreditCard, Tag, ShieldCheck, Ticket, Flag, Link, ChevronDown, ArrowLeft, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";

const PRODUCT_ID = "economizare-bloqueador";
const PRICE = 57.40;
const OLD_PRICE = 139.90;
const DISCOUNT = 59;
const INSTALLMENTS_VALUE = (PRICE / 6).toFixed(2).replace(".", ",");

const productImages = [
  "/images/eco/eco-produto-1.png",
  "/images/eco/eco-produto-2.jpg",
  "/images/eco/eco-produto-3.png",
  "/images/eco/eco-produto-tiktok.png",
  "/images/eco/eco-inovacao.png",
  "/images/eco/eco-sustentabilidade.png",
];

const reviews = [
  { name: "Maria Clara S.", avatar: "/images/avatar-carla.webp", text: "Instalei e minha conta de água já baixou no primeiro mês! Super fácil de colocar, qualquer pessoa consegue. Recomendo demais!", rating: 5, photos: ["/images/eco/eco-produto-1.png", "/images/eco/eco-produto-3.png"], daysAgo: 1 },
  { name: "José Ricardo M.", avatar: "/images/avatar-karine.webp", text: "Produto excelente! Reduziu quase metade da minha conta. A instalação é simples e rápida, não precisa de encanador.", rating: 5, photos: ["/images/eco/eco-produto-2.jpg"], daysAgo: 2 },
  { name: "Ana Paula F.", avatar: "/images/avatar-patricia.webp", text: "Comprei com receio mas funcionou de verdade! Economizei R$80 no primeiro mês. O produto é muito bem feito e veio bem embalado.", rating: 5, photos: ["/images/eco/eco-produto-4.png", "/images/eco/eco-produto-1.png"], daysAgo: 1 },
  { name: "Carlos Eduardo B.", avatar: "/images/avatar-karine.webp", text: "Vi no Shark Tank e resolvi testar. Não me arrependo! A conta que era R$280 caiu pra R$180. Produto de qualidade.", rating: 5, photos: [], daysAgo: 2 },
  { name: "Fernanda Lima", avatar: "/images/avatar-juliana.webp", text: "Já é o terceiro que compro — coloquei na casa dos meus pais e na da sogra também. Todo mundo economizando! 💧", rating: 5, photos: [], daysAgo: 1 },
  { name: "Roberto Alves", avatar: "/images/avatar-karine.webp", text: "Estava pagando absurdos de conta de água. Com o Economizare a diferença foi gritante. Instalação em 5 minutos!", rating: 5, photos: [], daysAgo: 2 },
  { name: "Patricia Souza", avatar: "/images/avatar-raquel.webp", text: "Produto incrível! A gente nem sabia que pagava pelo ar na tubulação. Agora pago só pela água mesmo. Nota 10!", rating: 5, photos: [], daysAgo: 1 },
  { name: "Marcos Vinícius R.", avatar: "/images/avatar-karine.webp", text: "Entrega super rápida, veio bem protegido. Instalei sozinho seguindo o manual. Produto robusto e bem acabado.", rating: 5, photos: [], daysAgo: 2 },
  { name: "Luciana Costa", avatar: "/images/avatar-carla.webp", text: "Minha conta reduziu de R$350 pra R$200! É impressionante como pagamos pelo ar que passa no hidrômetro. Recomendo!", rating: 5, photos: [], daysAgo: 1 },
  { name: "André Santos", avatar: "/images/avatar-karine.webp", text: "Comprei pro meu comércio e a economia foi absurda. Já se pagou no primeiro mês. Vou comprar mais unidades!", rating: 5, photos: [], daysAgo: 2 },
  { name: "Camila Oliveira", avatar: "/images/avatar-patricia.webp", text: "Vi o produto no TikTok e não acreditei muito, mas resolvi testar. Resultado: conta 40% menor! Amei ❤️", rating: 5, photos: [], daysAgo: 1 },
  { name: "Thiago Mendes", avatar: "/images/avatar-karine.webp", text: "Produto com certificação INMETRO, isso me deu confiança. E realmente funciona! Economia real e comprovada.", rating: 4, photos: [], daysAgo: 2 },
  { name: "Débora Nascimento", avatar: "/images/avatar-juliana.webp", text: "Instalação mega simples, sem precisar de ferramentas especiais. E o regulador de pressão é um diferencial enorme!", rating: 5, photos: [], daysAgo: 1 },
  { name: "Rafael Pereira", avatar: "/images/avatar-karine.webp", text: "Já testei outros bloqueadores mas o Economizare é muito superior. O regulador integrado faz toda a diferença.", rating: 5, photos: [], daysAgo: 2 },
  { name: "Sandra Martins", avatar: "/images/avatar-raquel.webp", text: "Produto maravilhoso! Tem 1 ano de garantia e 5 anos de validade. Melhor investimento que fiz pra minha casa.", rating: 5, photos: [], daysAgo: 1 },
  { name: "Daniela Rocha", avatar: "/images/avatar-carla.webp", text: "Comprei 2 unidades e instalei em 10 minutos! A economia na conta foi imediata. Super recomendo!", rating: 5, photos: [], daysAgo: 2 },
  { name: "Bruno Henrique", avatar: "/images/avatar-karine.webp", text: "Minha conta era de R$400, agora pago R$250. Produto sensacional, qualidade excepcional!", rating: 5, photos: [], daysAgo: 1 },
  { name: "Alessandra Lima", avatar: "/images/avatar-patricia.webp", text: "Melhor compra que fiz esse ano! A economia é real e o produto é muito bem feito. Super indico! 🌟", rating: 5, photos: [], daysAgo: 2 },
  { name: "Rodrigo Costa", avatar: "/images/avatar-karine.webp", text: "Produto certificado e com garantia. Faz exatamente o que promete. Minha conta baixou bastante!", rating: 5, photos: [], daysAgo: 1 },
  { name: "Juliana Matos", avatar: "/images/avatar-juliana.webp", text: "Nota 1000! Economizei muito na conta de água. Instalação simples, produto de qualidade. Vou comprar pra toda família!", rating: 5, photos: [], daysAgo: 2 },
];

function getReviewDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const months = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

const faqs = [
  { q: "Como funciona o Economizare?", a: "O Eliminador de Ar impede que o ar presente na rede de abastecimento passe pelo seu hidrômetro e seja contabilizado como água, podendo reduzir sua conta em até 50%." },
  { q: "É seguro de usar?", a: "Sim! O produto foi atestado pelo SICAL do Brasil, laboratório acreditado pelo INMETRO. Possui marca e patente registrados junto ao INPI." },
  { q: "Como é a instalação?", a: "Instalação simples, sem obras ou intervenções estruturais. Qualquer pessoa consegue instalar seguindo o manual incluso." },
  { q: "Qual a garantia?", a: "1 ano de garantia total contra defeitos de fabricação e 5 anos de validade do produto." },
  { q: "Qual o prazo de entrega?", a: "Receba em 1 a 3 dias úteis após confirmação do pagamento. Frete grátis para todo o Brasil!" },
  { q: "Funciona em qualquer rede hidráulica?", a: "Sim! O Economizare é compatível com qualquer rede hidráulica residencial ou comercial. Possui regulagem de pressão integrada." },
];

function useCountdown() {
  const [time, setTime] = useState({ h: 0, m: 30, s: 0 });
  useEffect(() => {
    const interval = setInterval(() => {
      setTime((prev) => {
        let { h, m, s } = prev;
        s--;
        if (s < 0) { s = 59; m--; }
        if (m < 0) { m = 59; h--; }
        if (h < 0) return { h: 0, m: 30, s: 0 };
        return { h, m, s };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  return time;
}

const fmt = (n: number) => String(n).padStart(2, "0");

function getSectionAtScroll(scrollTop: number): string {
  const docHeight = document.documentElement.scrollHeight;
  const pct = (scrollTop / docHeight) * 100;
  if (pct < 10) return "hero";
  if (pct < 25) return "galeria";
  if (pct < 40) return "detalhes";
  if (pct < 55) return "descricao";
  if (pct < 70) return "avaliacoes";
  if (pct < 85) return "faq";
  return "rodape";
}

function CountUp({ target, suffix, divisor, decimals, run }: { target: number; suffix: string; divisor: number; decimals: number; run: boolean }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!run) { setValue(0); return; }
    const duration = 1200;
    const steps = 40;
    const increment = target / steps;
    let current = 0;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      current = Math.min(target, Math.round(increment * step));
      setValue(current);
      if (step >= steps) clearInterval(interval);
    }, duration / steps);
    return () => clearInterval(interval);
  }, [run, target]);
  const display = decimals > 0 ? (value / divisor).toFixed(decimals) : Math.round(value / divisor).toString();
  return <p className="text-lg font-black text-cta">{display}{suffix}</p>;
}

const EconomizareIndex = () => {
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndX = useRef(0);
  const swiping = useRef(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const galleryRef = useRef<HTMLDivElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalClosing, setModalClosing] = useState(false);
  const [modalMode, setModalMode] = useState<'cart' | 'buy'>('cart');
  const [modalQty, setModalQty] = useState(1);
  const [flyingDot, setFlyingDot] = useState(false);
  const [exitModalOpen, setExitModalOpen] = useState(false);
  const [exit2Open, setExit2Open] = useState(false);
  const [exitShown, setExitShown] = useState(false);
  const [exit2Shown, setExit2Shown] = useState(false);
  const [couponCopied, setCouponCopied] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [reviewZoomOpen, setReviewZoomOpen] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [reviewZoomPhotos, setReviewZoomPhotos] = useState<string[]>([]);
  const [reviewZoomIndex, setReviewZoomIndex] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareClosing, setShareClosing] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [reportMenuOpen, setReportMenuOpen] = useState(false);
  const [reportStep, setReportStep] = useState<'menu' | 'reasons' | 'form' | 'done'>('menu');
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [cartClosing, setCartClosing] = useState(false);
  const [cartItems, setCartItems] = useState<{quantity: number}[]>(() => {
    try {
      const saved = localStorage.getItem('eco_cart');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : parsed?.quantity ? [parsed] : [];
    } catch { return []; }
  });

  const saveCart = (items: {quantity: number}[]) => {
    setCartItems(items);
    if (items.length) localStorage.setItem('eco_cart', JSON.stringify(items));
    else localStorage.removeItem('eco_cart');
  };

  const addToCart = (qty: number) => {
    if (cartItems.length > 0) {
      const updated = [...cartItems];
      updated[0] = { quantity: updated[0].quantity + qty };
      saveCart(updated);
    } else {
      saveCart([{ quantity: qty }]);
    }
  };

  const updateCartItem = (index: number, qty: number) => {
    if (qty <= 0) {
      saveCart(cartItems.filter((_, i) => i !== index));
    } else {
      const updated = [...cartItems];
      updated[index] = { quantity: qty };
      saveCart(updated);
    }
  };

  const cartTotalQty = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const cartTotal = cartTotalQty * PRICE;

  const closeCart = () => {
    setCartClosing(true);
    setTimeout(() => { setCartOpen(false); setCartClosing(false); }, 300);
  };

  const [storeOpen, setStoreOpen] = useState(false);
  const [storeClosing, setStoreClosing] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatClosing, setChatClosing] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'bot' | 'user', text: string}[]>([
    { role: 'bot', text: 'Olá! Como posso te ajudar com informações sobre o Bloqueador de Ar Economizare?' }
  ]);
  const [chatTyping, setChatTyping] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatTyping]);

  const closeStore = () => {
    setStoreClosing(true);
    setTimeout(() => { setStoreOpen(false); setStoreClosing(false); }, 300);
  };

  const closeChat = () => {
    setChatClosing(true);
    setTimeout(() => { setChatOpen(false); setChatClosing(false); }, 300);
  };

  const sendChatMessage = async (text: string) => {
    if (!text.trim() || chatTyping) return;
    const userMsg = text.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatTyping(true);

    // Simple FAQ-based bot response
    const lowerMsg = userMsg.toLowerCase();
    const matchedFaq = faqs.find(f => lowerMsg.includes(f.q.toLowerCase().slice(0, 15)) || f.q.toLowerCase().split(' ').some(w => w.length > 4 && lowerMsg.includes(w)));

    setTimeout(() => {
      setChatTyping(false);
      const buyKeywords = ['comprar', 'quero comprar', 'como compro', 'quero uma', 'quero esse', 'onde compro', 'me vende', 'vou levar', 'quero pedir', 'fazer pedido'];
      const isBuyIntent = buyKeywords.some(kw => lowerMsg.includes(kw));

      if (isBuyIntent) {
        setChatMessages(prev => [...prev,
          { role: 'bot', text: 'Ótima escolha! O Economizare é o produto mais vendido para economia de água. Vou te direcionar para a compra!' },
          { role: 'bot', text: '🛒 Direcionando para o checkout agora!' }
        ]);
        setTimeout(() => {
          closeChat();
          setTimeout(() => handleBuyNow(), 400);
        }, 5000);
      } else if (matchedFaq) {
        setChatMessages(prev => [...prev, { role: 'bot', text: matchedFaq.a }]);
      } else if (lowerMsg.includes('preço') || lowerMsg.includes('valor') || lowerMsg.includes('quanto')) {
        setChatMessages(prev => [...prev, { role: 'bot', text: `O Economizare está com um super desconto! De R$ ${OLD_PRICE.toFixed(2).replace('.', ',')} por apenas R$ ${PRICE.toFixed(2).replace('.', ',')} — isso é ${DISCOUNT}% de desconto! E ainda pode parcelar em até 6x sem juros. 💰` }]);
      } else if (lowerMsg.includes('frete') || lowerMsg.includes('entrega') || lowerMsg.includes('prazo')) {
        setChatMessages(prev => [...prev, { role: 'bot', text: 'O frete é GRÁTIS para todo o Brasil! 🚚 Prazo de entrega de 1 a 3 dias úteis após confirmação do pagamento.' }]);
      } else {
        setChatMessages(prev => [...prev, { role: 'bot', text: 'O Economizare é um eliminador de ar que reduz sua conta de água em até 50%! Possui certificação INMETRO, instalação simples e garantia de 1 ano. Posso ajudar com algo mais específico?' }]);
      }
    }, 1500);
  };

  const handleQuickQuestion = (faq: { q: string; a: string }) => {
    sendChatMessage(faq.q);
  };

  const countdown = useCountdown();
  const [belowFoldReady, setBelowFoldReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setBelowFoldReady(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    trackFunnelEvent({
      event: "view_content",
      value: PRICE,
      properties: {
        content_type: "product",
        content_id: PRODUCT_ID,
        content_name: "Bloqueador de Ar Economizare",
        contents: [{ content_id: PRODUCT_ID, quantity: 1 }],
      },
    });
    trackPageViewOnce("/economizare");

    let maxScroll = 0;
    let lastScrollMilestone = 0;
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        const pct = Math.round((scrollTop / docHeight) * 100);
        if (pct > maxScroll) maxScroll = pct;
        const milestones = [25, 50, 75, 90];
        for (const m of milestones) {
          if (pct >= m && lastScrollMilestone < m) {
            lastScrollMilestone = m;
            trackEvent("scroll_milestone", { percent: m, section: getSectionAtScroll(scrollTop) });
          }
        }
      }
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const section = target.closest("[data-section]")?.getAttribute("data-section") || getSectionAtScroll(window.scrollY);
      const rect = document.documentElement;
      const xPct = Math.round((e.clientX / rect.clientWidth) * 100);
      const yPct = Math.round(((e.pageY) / rect.scrollHeight) * 100);
      trackEvent("click_position", { x: xPct, y: yPct, section, element: target.tagName.toLowerCase(), element_text: (target.textContent || "").slice(0, 50).trim() });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("click", handleClick);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("click", handleClick);
      if (maxScroll > 0) trackEvent("scroll_depth", { percent: maxScroll });
    };
  }, []);

  useEffect(() => {
    const anyOpen = storeOpen || chatOpen || exitModalOpen || exit2Open || modalOpen || cartOpen;
    document.body.style.overflow = anyOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [storeOpen, chatOpen, exitModalOpen, exit2Open, modalOpen, cartOpen]);

  const fireCelebration = useCallback(() => {
    const colors = ["#0f7b3f", "#1a9d5c", "#22c55e", "#ffd700", "#00d2d3", "#34d399"];
    confetti({ particleCount: 40, spread: 70, origin: { y: 0.55 }, colors, gravity: 1.2 });
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "triangle";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.12 + 0.4);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + i * 0.12);
        osc.stop(audioCtx.currentTime + i * 0.12 + 0.4);
      });
    } catch (_) {}
  }, []);

  const fireAlertSiren = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(600, audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(900, audioCtx.currentTime + 0.15);
      osc.frequency.linearRampToValueAtTime(600, audioCtx.currentTime + 0.3);
      osc.frequency.linearRampToValueAtTime(900, audioCtx.currentTime + 0.45);
      osc.frequency.linearRampToValueAtTime(600, audioCtx.currentTime + 0.6);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.7);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.7);
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (exitShown) return;
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && e.relatedTarget === null) {
        setExitModalOpen(true);
        setExitShown(true);
        fireCelebration();
      }
    };
    let popstateReady = false;
    const popstateReadyTimer = setTimeout(() => { popstateReady = true; }, 2000);
    const handlePopState = () => {
      if (!popstateReady) { window.history.pushState(null, "", window.location.href); return; }
      window.history.pushState(null, "", window.location.href);
      setExitModalOpen(true);
      setExitShown(true);
      fireCelebration();
    };
    window.history.pushState(null, "", window.location.href);
    document.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("popstate", handlePopState);
    return () => {
      document.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("popstate", handlePopState);
      clearTimeout(popstateReadyTimer);
    };
  }, [exitShown, fireCelebration]);

  const openModal = (mode: 'cart' | 'buy') => {
    setModalQty(1);
    setModalMode(mode);
    setModalOpen(true);
    trackFunnelEvent({
      event: "add_to_cart",
      value: PRICE,
      properties: { content_type: "product", content_id: PRODUCT_ID, content_name: "Bloqueador de Ar Economizare", contents: [{ content_id: PRODUCT_ID, quantity: 1 }] },
    });
  };

  const closeModal = () => {
    setModalClosing(true);
    setTimeout(() => { setModalOpen(false); setModalClosing(false); }, 300);
  };

  const nav = useNavigate();

  const handleModalConfirm = () => {
    if (modalMode === 'buy') {
      saveCart([{ quantity: modalQty }]);
      const params = new URLSearchParams(window.location.search);
      nav(getUrlWithUtm(`/economizare/checkout?${params.toString()}`));
    } else {
      addToCart(modalQty);
      closeModal();
      setTimeout(() => {
        setFlyingDot(true);
        setTimeout(() => setFlyingDot(false), 800);
      }, 350);
    }
  };

  const handleBuyNow = () => {
    trackFunnelEvent({ event: "click_buy" });
    if (cartItems.length > 0) {
      setCartOpen(true);
    } else {
      openModal('buy');
    }
  };

  const handleCartCheckout = () => {
    if (cartItems.length === 0) return;
    nav(getUrlWithUtm(`/economizare/checkout`));
  };

  const copyCoupon = () => {
    navigator.clipboard.writeText("VOLTA25");
    setCouponCopied(true);
    setTimeout(() => setCouponCopied(false), 2000);
  };

  const nextImage = () => setCurrentImage((p) => (p + 1) % productImages.length);
  const prevImage = () => setCurrentImage((p) => (p - 1 + productImages.length) % productImages.length);

  return (
    <div className="min-h-screen bg-white pb-[72px]">
      {/* Flying dot animation */}
      {flyingDot && (
        <div className="fixed z-[100] pointer-events-none" style={{
          animation: 'flyToCart 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
          left: '50%',
          bottom: '80px',
        }}>
          <div className="h-4 w-4 rounded-full bg-cta shadow-lg" />
        </div>
      )}
      <style>{`
        @keyframes flyToCart {
          0% { transform: translate(-50%, 0) scale(1); opacity: 1; }
          40% { transform: translate(20vw, -40vh) scale(1.3); opacity: 1; }
          100% { transform: translate(35vw, -90vh) scale(0.3); opacity: 0; }
        }
      `}</style>

      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b bg-card">
        <div className="mx-auto max-w-[480px] flex items-center gap-2 px-3 py-2.5">
          <ChevronLeft className="h-6 w-6 text-foreground cursor-pointer flex-shrink-0" onClick={() => { setExitModalOpen(true); setExitShown(true); fireCelebration(); }} />
          <div className="flex-1 mx-1">
            <div className="flex items-center gap-2 bg-muted rounded-full px-3 py-1.5 pointer-events-none select-none">
              <Search className="h-3.5 w-3.5 text-muted-foreground/60" />
              <span className="text-xs text-muted-foreground/60">Pesquisar</span>
            </div>
          </div>
          <div className="flex items-center gap-5 flex-shrink-0">
            <Share2 className="h-5 w-5 text-muted-foreground cursor-pointer" onClick={() => setShareOpen(true)} />
            <div className="relative cursor-pointer" onClick={() => setCartOpen(true)}>
              <ShoppingCart className="h-5 w-5 text-muted-foreground" />
              {cartTotalQty > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-cta text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center">{cartTotalQty}</span>
              )}
            </div>
            <MoreHorizontal className="h-5 w-5 text-muted-foreground cursor-pointer" onClick={() => { setReportStep('menu'); setReportMenuOpen(true); }} />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[480px]">
        {/* Product Gallery */}
        <section className="bg-card">
          <div
            ref={galleryRef}
            className="relative aspect-[4/3] sm:aspect-[4/3] overflow-hidden bg-card cursor-grab active:cursor-grabbing"
            onDragStart={(e) => e.preventDefault()}
            onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; touchEndX.current = e.touches[0].clientX; touchStartY.current = e.touches[0].clientY; swiping.current = false; setDragOffset(0); }}
            onTouchMove={(e) => {
              const dx = e.touches[0].clientX - touchStartX.current;
              const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
              touchEndX.current = e.touches[0].clientX;
              if (Math.abs(dx) > dy && Math.abs(dx) > 8) {
                swiping.current = true;
                if (!isDragging) setIsDragging(true);
                e.preventDefault();
                const containerWidth = galleryRef.current?.offsetWidth || 1;
                const baseOffsetPx = -currentImage * containerWidth;
                const minOffsetPx = -((productImages.length - 1) * containerWidth);
                const maxOffsetPx = 0;
                let nextOffsetPx = baseOffsetPx + dx;
                if (nextOffsetPx > maxOffsetPx) nextOffsetPx = maxOffsetPx + (nextOffsetPx - maxOffsetPx) * 0.25;
                else if (nextOffsetPx < minOffsetPx) nextOffsetPx = minOffsetPx + (nextOffsetPx - minOffsetPx) * 0.25;
                setDragOffset(nextOffsetPx - baseOffsetPx);
              }
            }}
            onTouchEnd={(e) => {
              setIsDragging(false);
              const endX = touchEndX.current || touchStartX.current;
              const diff = touchStartX.current - endX;
              const containerWidth = galleryRef.current?.offsetWidth || 300;
              const threshold = containerWidth * 0.2;
              if (swiping.current && Math.abs(diff) > threshold) { e.preventDefault(); if (diff > 0) nextImage(); else prevImage(); }
              setDragOffset(0);
              swiping.current = false;
            }}
            onTouchCancel={() => { setIsDragging(false); setDragOffset(0); swiping.current = false; }}
            onClick={() => { if (!swiping.current) { trackEvent("click_product_image"); setZoomOpen(true); } }}
          >
            <div
              className="flex h-full"
              style={{
                transform: `translateX(calc(-${currentImage * (100 / productImages.length)}% + ${dragOffset}px))`,
                transition: isDragging ? 'none' : 'transform 0.35s cubic-bezier(0.25, 1, 0.5, 1)',
                width: `${productImages.length * 100}%`,
              }}
            >
              {productImages.map((img, i) => (
                <div key={i} className="h-full flex-shrink-0" style={{ width: `${100 / productImages.length}%` }}>
                  <img src={img} alt={`Produto ${i + 1}`} className="h-full w-full select-none object-contain" loading={i <= 1 ? "eager" : "lazy"} fetchPriority={i === 0 ? "high" : "auto"} decoding={i === 0 ? "sync" : "async"} draggable={false} onDragStart={(e) => e.preventDefault()} />
                </div>
              ))}
            </div>
            <button onClick={(e) => { e.stopPropagation(); prevImage(); }} className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-foreground/10 backdrop-blur-sm" aria-label="Anterior">
              <ChevronLeft className="h-5 w-5 text-foreground/70" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); nextImage(); }} className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-foreground/10 backdrop-blur-sm" aria-label="Próxima">
              <ChevronRight className="h-5 w-5 text-foreground/70" />
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-foreground/60 px-2.5 py-1 text-xs font-medium text-card">
              {currentImage + 1}/{productImages.length}
            </span>
          </div>
          {/* Thumbnails */}
          <div className="flex gap-1.5 overflow-x-auto px-3 py-2">
            {productImages.map((img, i) => (
              <button key={i} onClick={() => setCurrentImage(i)} className={`h-[44px] w-[44px] flex-shrink-0 overflow-hidden rounded border-2 transition-all ${i === currentImage ? "border-cta" : "border-transparent"}`}>
                <img src={img} alt="" className="h-full w-full object-cover" loading="eager" decoding="async" />
              </button>
            ))}
          </div>
        </section>

        {/* Price Banner */}
        <section className="bg-gradient-to-r from-[#0f7b3f] to-[#1a9d5c] px-3 py-3 text-white flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-black leading-none">R$ {PRICE.toFixed(2).replace(".", ",")}</span>
            <span className="text-[11px] line-through opacity-60">R$ {OLD_PRICE.toFixed(2).replace(".", ",")}</span>
            <span className="rounded-md bg-white px-1.5 py-0.5 text-[11px] font-extrabold text-[#0f7b3f]">-{DISCOUNT}%</span>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 justify-end mb-1">
              <Zap className="h-3 w-3 fill-white" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-90">Oferta Relâmpago</span>
            </div>
            <div className="flex items-center gap-1 justify-end">
              <span className="text-[10px] font-semibold opacity-80">Termina em:</span>
              <div className="flex items-center gap-0.5">
                {[countdown.h, countdown.m, countdown.s].map((v, i) => (
                  <span key={i} className="flex items-center">
                    {i > 0 && <span className="mx-0.5 text-[10px] font-bold">:</span>}
                    <span className="rounded bg-white/20 px-1 py-0.5 text-[10px] font-mono font-bold">{fmt(v)}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="px-3">
          {/* Installments */}
          <div className="mt-2 flex items-center gap-1.5 text-[13px] text-foreground">
            <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
            <span>6x de <strong>R$ {INSTALLMENTS_VALUE}</strong> sem juros no cartão</span>
          </div>

          {/* Coupon badge */}
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-badge-green px-2.5 py-0.5 text-[11px] font-semibold text-badge-green-foreground">
            <Tag className="h-3 w-3" />
            Cupom Aplicado
          </div>

          {/* Title */}
          <h1 className="mt-3 text-[15px] font-bold leading-snug text-foreground cursor-pointer active:opacity-70" onClick={() => document.getElementById("buy-bar")?.scrollIntoView({ behavior: "smooth" })}>
            Economizare — Eliminador de Ar para Hidrômetro | Reduza sua Conta de Água em até 50%
          </h1>

          {/* Rating */}
          <div className="mt-1.5 flex items-center gap-1.5 text-[13px]">
            <Star className="h-3.5 w-3.5 fill-primary text-primary" />
            <span className="font-bold">4.8</span>
            <span className="text-muted-foreground">(2.847)</span>
            <span className="text-muted-foreground mx-0.5">•</span>
            <span className="text-muted-foreground">8.234 vendidos</span>
          </div>
          <p className="mt-0.5 text-[11px] font-medium text-cta">3.5K+ pessoas compraram nos últimos 3 dias</p>

          {/* Shipping */}
          <div className="mt-3 flex items-center gap-2.5 rounded-xl border p-2.5">
            <span className="rounded bg-badge-green px-2 py-0.5 text-[11px] font-bold text-badge-green-foreground flex items-center gap-1">
              <Truck className="h-3 w-3" /> Frete grátis
            </span>
            <div className="text-[13px]">
              <span>Receba em <strong>1 - 3 dias úteis</strong></span>
              <div className="text-[11px] text-muted-foreground">
                Taxa de envio: <span className="line-through">R$ 29,90</span>{" "}
                <span className="font-semibold text-success">Grátis</span>
              </div>
            </div>
          </div>

          {/* Customer Protection */}
          <div className="mt-3 rounded-xl border bg-card p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-[13px]">Proteção do cliente</span>
              </div>
              <span className="text-[11px] font-bold text-success">100% Protegido</span>
            </div>
            <div className="space-y-2 text-[13px]">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                <span>Devolução gratuita em até 7 dias</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CreditCard className="h-4 w-4 text-blue-500 flex-shrink-0" />
                <span>Reembolso automático por danos</span>
              </div>
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 text-success flex-shrink-0" />
                <span>Pagamento seguro e criptografado</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Ticket className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span>Cupom por atraso na entrega</span>
              </div>
            </div>
            <div className="mt-3 rounded-lg bg-success/10 p-2.5 text-center">
              <p className="text-[11px] text-foreground/80">
                Sua compra é <strong className="text-success">100% protegida</strong>. Garantimos devolução do valor integral caso o produto não corresponda à descrição.
              </p>
            </div>
          </div>
        </div>

        {/* Gray Divider */}
        <div className="mt-4 h-2 bg-muted/60" />

        {belowFoldReady ? (<>

        <div className="px-3">
          {/* Reviews */}
          <section className="mt-3" itemScope itemType="https://schema.org/Product">
            <meta itemProp="name" content="Economizare Eliminador de Ar" />
            <div itemProp="aggregateRating" itemScope itemType="https://schema.org/AggregateRating">
              <meta itemProp="ratingValue" content="4.8" />
              <meta itemProp="reviewCount" content="2847" />
              <meta itemProp="bestRating" content="5" />
              <h2 className="text-[15px] font-bold mb-1">Avaliações dos clientes (<span itemProp="ratingCount">2.847</span>)</h2>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl font-black">4.8</span>
                <span className="text-muted-foreground text-[13px]">/5</span>
                <div className="flex gap-0.5 ml-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-3 mt-2 text-[12px] text-muted-foreground">
                <span className="flex items-center gap-1">📷 Inclui imagens <span className="font-semibold text-foreground">(128)</span></span>
                <span className="flex items-center gap-1">5 <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /> <span className="font-semibold text-foreground">(2.534)</span></span>
                <span className="flex items-center gap-1">4 <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /> <span className="font-semibold text-foreground">(245)</span></span>
                <span className="flex items-center gap-1">3 <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /> <span className="font-semibold text-foreground">(42)</span></span>
                <span className="flex items-center gap-1">2 <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /> <span className="font-semibold text-foreground">(18)</span></span>
                <span className="flex items-center gap-1">1 <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /> <span className="font-semibold text-foreground">(8)</span></span>
              </div>
            </div>

            <div className="divide-y mt-4">
              {(showAllReviews ? reviews : reviews.slice(0, 3)).map((r, idx) => (
                <div key={idx} className="py-4 first:pt-0" itemProp="review" itemScope itemType="https://schema.org/Review">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <img src={r.avatar} alt={r.name} className="h-8 w-8 rounded-full object-cover" loading="lazy" />
                    <div className="flex-1">
                      <span className="font-semibold text-[13px]" itemProp="author" itemScope itemType="https://schema.org/Person">
                        <span itemProp="name">{r.name}</span>
                      </span>
                      <span className="block text-[11px] text-muted-foreground">{getReviewDate(r.daysAgo)}</span>
                    </div>
                  </div>
                  <div className="flex gap-0.5 mb-1.5" itemProp="reviewRating" itemScope itemType="https://schema.org/Rating">
                    <meta itemProp="ratingValue" content={String(r.rating)} />
                    <meta itemProp="bestRating" content="5" />
                    {Array.from({ length: r.rating }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-[13px] leading-relaxed text-foreground/90" itemProp="reviewBody">{r.text}</p>
                  {r.photos.length > 0 && (
                    <div className="mt-2 flex gap-1.5 overflow-x-auto">
                      {r.photos.map((p, i) => (
                        <img key={i} src={p} alt={`Foto ${i + 1}`} className="h-14 w-14 rounded-lg object-cover flex-shrink-0 cursor-pointer active:scale-95 transition-transform" loading="lazy" onClick={() => { setReviewZoomPhotos(r.photos); setReviewZoomIndex(i); setReviewZoomOpen(true); }} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button onClick={() => setShowAllReviews(prev => !prev)} className="w-full py-3 mt-2 text-sm font-semibold text-[#0f7b3f] border border-[#0f7b3f]/30 rounded-lg flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform">
              {showAllReviews ? "Mostrar menos avaliações" : "Ver todas as 2.847 avaliações"}
              <ChevronDown className={`h-4 w-4 transition-transform ${showAllReviews ? "rotate-180" : ""}`} />
            </button>
          </section>

          {/* Store Info */}
          <section className="mt-6 border-y py-5 cursor-pointer active:bg-muted/50 transition-colors" onClick={() => setStoreOpen(true)}>
            <div className="flex items-center gap-3">
              <img src="/images/eco/logo-economizare.png" alt="Economizare" className="h-11 w-11 rounded-full object-contain border" />
              <div className="flex-1">
                <p className="font-bold text-[14px]">Economizare</p>
                <p className="text-[11px] text-muted-foreground">Loja Oficial — Economia de Água</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  <span className="text-[12px] font-semibold">4.8</span>
                  <span className="text-[11px] text-muted-foreground">(32.891 avaliações)</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </section>

          {/* Product Description */}
          <section className="mt-5">
            <h2 className="text-[15px] font-bold mb-2">Descrição do produto</h2>
            <div className="space-y-3 text-[13px] leading-relaxed text-foreground/90">
              <p>
                O <strong>Economizare — Eliminador de Ar para Hidrômetro</strong> é a solução definitiva para reduzir sua conta de água. Ele impede que o ar presente na rede de abastecimento passe pelo seu hidrômetro e seja contabilizado como consumo de água.
              </p>
              <img src="/images/eco/eco-inovacao.png" alt="Tecnologia inovadora" className="w-full rounded-xl" loading="lazy" />
              <p><strong>✅ ECONOMIA REAL:</strong> Reduza sua conta de água em até 50%! O ar presente na tubulação é contabilizado como água pelo hidrômetro. O Economizare elimina esse problema de forma definitiva.</p>
              <img src="/images/eco/eco-produto-3.png" alt="Produto Economizare" className="w-full rounded-xl" loading="lazy" />
              <p><strong>✅ INSTALAÇÃO SIMPLES:</strong> Não precisa de encanador! Qualquer pessoa consegue instalar seguindo o manual ilustrado incluso. Sem obras, sem complicações.</p>
              <img src="/images/eco/eco-sustentabilidade.png" alt="Sustentabilidade" className="w-full rounded-xl" loading="lazy" />
              <p><strong>✅ CERTIFICAÇÃO INMETRO:</strong> Produto atestado pelo SICAL do Brasil, laboratório acreditado pelo INMETRO. Marca e patente registrados junto ao INPI.</p>
              <img src="/images/eco/eco-produto-4.png" alt="Regulador de pressão" className="w-full rounded-xl" loading="lazy" />
              <p><strong>✅ REGULADOR DE PRESSÃO:</strong> Diferencial exclusivo! O regulador integrado protege sua rede hidráulica e otimiza o funcionamento do eliminador de ar.</p>
              <p><strong>✅ PARA TODOS OS AMBIENTES:</strong> Funciona em residências, apartamentos, comércios, condomínios e indústrias. Compatível com qualquer rede hidráulica.</p>
            </div>
          </section>

          {/* Specs */}
          <section className="mt-5">
            <h2 className="text-[15px] font-bold mb-2">Especificações Técnicas:</h2>
            <ul className="space-y-1 text-[13px] text-foreground/90 list-disc pl-5">
              <li><strong>Material:</strong> Latão cromado de alta resistência</li>
              <li><strong>Conexão:</strong> ¾" (padrão brasileiro)</li>
              <li><strong>Pressão máxima:</strong> 10 bar</li>
              <li><strong>Regulador de pressão:</strong> Integrado</li>
              <li><strong>Garantia:</strong> 1 ano contra defeitos</li>
              <li><strong>Validade:</strong> 5 anos</li>
              <li><strong>Certificação:</strong> SICAL/INMETRO</li>
              <li><strong>Marca registrada:</strong> INPI</li>
            </ul>
            <p className="mt-3 text-[13px] leading-relaxed text-foreground/90">
              <strong>GARANTIA DE 1 ANO:</strong> A Economizare é líder em soluções de economia de água. Com mais de 8.000 unidades vendidas e nota 4.8 de satisfação, a Economizare é sinônimo de qualidade e economia. Participe do Shark Tank Brasil!
            </p>
          </section>

          {/* Shipping Details */}
          <section className="mt-5">
            <h2 className="text-[15px] font-bold mb-2">Envio e Entrega</h2>
            <div className="space-y-0">
              <div className="flex items-start gap-2.5 rounded-xl bg-green-50 border border-green-200 p-3 mb-3">
                <Truck className="h-4 w-4 mt-0.5 flex-shrink-0 text-[#0f7b3f]" />
                <div>
                  <p className="font-semibold text-[13px]">Frete Grátis para todo o Brasil!</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Economize <strong>R$ 29,90</strong> no frete — promoção por tempo limitado.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-3">
                <Clock className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-semibold text-[13px]">Prazo de entrega</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Receba em <strong>1 a 3 dias úteis</strong> após confirmação do pagamento.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-3">
                <Package className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-semibold text-[13px]">Rastreamento completo</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Acompanhe seu pedido em tempo real pelo código de rastreio enviado por e-mail e WhatsApp.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-3">
                <Shield className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-semibold text-[13px]">Entrega garantida</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Entrega garantida e segurada pelos Correios®. Em caso de extravio, reenviamos ou devolvemos o valor integral.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4">
                <span className="flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold text-muted-foreground mt-0.5 flex-shrink-0">BR</span>
                <p className="text-xs text-muted-foreground">
                  Envio rápido, seguro e com rastreamento para <strong className="text-foreground">todos os estados do Brasil</strong>.
                </p>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="mt-5 mb-5">
            <h2 className="text-[15px] font-bold mb-2">Perguntas Frequentes</h2>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-left text-[13px] font-semibold">{faq.q}</AccordionTrigger>
                  <AccordionContent className="text-[13px] text-muted-foreground">{faq.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>

          {/* Footer */}
          <footer className="mt-8 border-t pt-6 pb-24">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 max-w-[280px] mx-auto mb-4">
              {[
                { icon: "🛡️", text: "Compra Segura" },
                { icon: "👤", text: "Proteção ao Cliente" },
                { icon: "💳", text: "Pagamento Seguro" },
                { icon: "🔒", text: "Criptografia SSL" },
                { icon: "📋", text: "LGPD" },
              ].map((item) => (
                <span key={item.text} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="text-[10px] opacity-60">{item.icon}</span>
                  {item.text}
                </span>
              ))}
            </div>
            <p className="text-center text-[10px] text-muted-foreground/70 leading-relaxed max-w-[300px] mx-auto mb-4">
              Seus dados são protegidos com criptografia SSL. Estamos em conformidade com a LGPD (Lei nº 13.709/2018).
            </p>
            <div className="text-center text-xs text-muted-foreground space-y-2">
              <p className="font-semibold text-foreground text-[13px]">Economizare LTDA</p>
              <p>CNPJ: 26.682.422/0001-88</p>
              <p>Contato: contato@economizare.com</p>
              <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors">
                ↑ Voltar ao topo
              </button>
            </div>
            <div className="mt-4 border-t pt-4 text-center text-[11px] text-muted-foreground">
              <p>© 2026 ECONOMIZARE LTDA — CNPJ 26.682.422/0001-88 — Todos os direitos reservados</p>
              <p className="mt-1">
                <a href="/politica-de-privacidade" className="text-destructive hover:underline">Política de privacidade</a>
                <span className="mx-1">·</span>
                <a href="/termos-de-uso" className="text-destructive hover:underline">Termos de uso</a>
              </p>
            </div>
          </footer>
        </div>
        </>) : <div className="mt-8 flex justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" /></div>}
      </div>

      {/* Sticky Bottom Bar */}
      <div id="buy-bar" className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card shadow-[0_-2px_12px_rgba(0,0,0,0.06)] px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] flex items-center gap-1.5">
        <div className="flex items-center gap-3 flex-shrink-0">
          <button onClick={() => setStoreOpen(true)} className="flex flex-col items-center text-[10px] text-muted-foreground gap-0.5 min-w-[32px]">
            <Store className="h-5 w-5" />
            <span>Loja</span>
          </button>
          <button onClick={() => setChatOpen(true)} className="flex flex-col items-center text-[10px] text-muted-foreground gap-0.5 min-w-[32px]">
            <MessageCircle className="h-5 w-5" />
            <span>Chat</span>
          </button>
        </div>
        <button onClick={() => openModal('cart')} className="flex-1 flex items-center justify-center gap-1 py-2.5 text-xs font-bold text-cta whitespace-nowrap">
          <ShoppingCart className="h-3.5 w-3.5 flex-shrink-0 text-cta" />
          <span className="text-cta font-bold text-[11px]">Adicionar ao carrinho</span>
        </button>
        <Button onClick={handleBuyNow} className="flex-shrink-0 bg-cta text-cta-foreground hover:bg-cta-hover font-bold text-[11px] py-2.5 px-4 h-auto rounded-lg uppercase tracking-wide whitespace-nowrap">
          COMPRAR AGORA
        </Button>
      </div>

      {/* Add to Cart / Buy Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[60]" onClick={closeModal}>
          <div className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${modalClosing ? 'opacity-0' : 'opacity-100 animate-in fade-in-0'}`} />
          <div className={`absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl transition-transform duration-300 mx-auto sm:max-w-md ${modalClosing ? 'translate-y-full' : 'animate-in slide-in-from-bottom'}`} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>
            <button onClick={closeModal} className="absolute right-3 top-3 rounded-full bg-muted p-1.5 text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>

            <div className="px-5 pt-2 pb-3">
              <p className="text-base font-bold">Selecione a quantidade</p>
            </div>

            <div className="flex items-center gap-3 px-5 pb-4">
              <img src="/images/eco/eco-produto-1.png" alt="Economizare" className="h-16 w-16 rounded-lg object-contain border bg-muted/30 p-1" />
              <div>
                <p className="font-bold text-sm">Bloqueador de Ar Economizare</p>
                <p className="text-[#0f7b3f] font-extrabold text-lg">R$ {PRICE.toFixed(2).replace('.', ',')}</p>
                <p className="text-xs text-muted-foreground line-through">R$ {OLD_PRICE.toFixed(2).replace('.', ',')}</p>
                <span className="inline-block mt-0.5 rounded bg-green-100 text-green-700 text-[10px] font-bold px-1.5 py-0.5">Economize {DISCOUNT}%</span>
              </div>
            </div>

            <div className="px-5 pb-4">
              <p className="text-sm font-semibold mb-2">Quantidade:</p>
              <div className="flex items-center gap-3">
                <button onClick={() => setModalQty(q => Math.max(1, q - 1))} className="h-9 w-9 rounded-xl border-2 border-border flex items-center justify-center text-lg font-bold hover:border-cta/50 transition-colors">−</button>
                <span className="text-base font-bold w-6 text-center">{modalQty}</span>
                <button onClick={() => setModalQty(q => q + 1)} className="h-9 w-9 rounded-xl border-2 border-border flex items-center justify-center text-lg font-bold hover:border-cta/50 transition-colors">+</button>
                <span className="ml-auto text-[#0f7b3f] font-extrabold text-lg">R$ {(PRICE * modalQty).toFixed(2).replace('.', ',')}</span>
              </div>
            </div>

            <div className="px-5 pb-6">
              <button onClick={handleModalConfirm} className="w-full font-bold text-base py-4 rounded-2xl transition-all bg-cta text-white hover:bg-cta-hover">
                {modalMode === 'buy' ? `Comprar agora - R$ ${(PRICE * modalQty).toFixed(2).replace('.', ',')}` : `Adicionar ao carrinho - R$ ${(PRICE * modalQty).toFixed(2).replace('.', ',')}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {shareOpen && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center">
          <div className={`absolute inset-0 transition-opacity duration-300 ${shareClosing ? 'opacity-0' : 'opacity-100'}`} style={{ backgroundColor: 'rgba(0,0,0,0.3)' }} onClick={() => { setShareClosing(true); setTimeout(() => { setShareOpen(false); setShareClosing(false); }, 300); }} />
          <div className={`relative w-full max-w-md bg-background rounded-t-2xl transition-transform duration-300 ease-out ${shareClosing ? 'translate-y-full' : 'translate-y-0'}`} style={{ animation: shareClosing ? undefined : 'slideUpShare 0.3s ease-out' }}>
            <style>{`@keyframes slideUpShare { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
            <div className="flex justify-center pt-2.5 pb-1">
              <div className="w-8 h-[3px] rounded-full bg-border/60" />
            </div>
            <div className="flex items-center justify-between px-4 pb-2">
              <div className="w-5" />
              <p className="text-[13px] font-medium text-foreground">Enviar para</p>
              <button onClick={() => { setShareClosing(true); setTimeout(() => { setShareOpen(false); setShareClosing(false); }, 300); }} className="p-0.5">
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
            <div className="flex items-start justify-evenly px-3 pb-5 pt-1">
              {[
                { name: "Copiar\nlink", icon: <Link className="h-4 w-4 text-white" />, bg: "bg-muted-foreground", action: () => { navigator.clipboard.writeText(window.location.href); setCouponCopied(true); setTimeout(() => setCouponCopied(false), 2000); } },
                { name: "WhatsApp", icon: <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.555 4.126 1.526 5.86L0 24l6.335-1.652A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-2.006 0-3.885-.588-5.47-1.597l-.393-.237-3.762.982.999-3.648-.26-.414A9.72 9.72 0 012.25 12 9.75 9.75 0 0112 2.25 9.75 9.75 0 0121.75 12 9.75 9.75 0 0112 21.75z"/></svg>, bg: "bg-[#25D366]", action: () => window.open(`https://wa.me/?text=${encodeURIComponent('Olha esse eliminador de ar incrível! Reduz a conta de água em até 50%! ' + window.location.href)}`, '_blank') },
                { name: "Facebook", icon: <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>, bg: "bg-[#1877F2]", action: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank') },
                { name: "Telegram", icon: <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0h-.056zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>, bg: "bg-[#0088cc]", action: () => window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent('Olha esse eliminador de ar incrível!')}`, '_blank') },
              ].map((item) => (
                <button key={item.name} onClick={() => { item.action(); }} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                  <div className={`h-10 w-10 rounded-full ${item.bg} flex items-center justify-center`}>
                    {item.icon}
                  </div>
                  <span className="text-[9px] text-muted-foreground text-center leading-tight whitespace-pre-line">{item.name}</span>
                </button>
              ))}
            </div>
            {couponCopied && <p className="text-center text-[10px] text-cta font-medium pb-2 -mt-2">Link copiado!</p>}
          </div>
        </div>
      )}

      {/* Report Modal */}
      {reportMenuOpen && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setReportMenuOpen(false)} />
          <div className="relative w-full max-w-lg bg-background rounded-t-2xl animate-in slide-in-from-bottom duration-300 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              {(reportStep === 'form') && <button onClick={() => setReportStep('reasons')} className="p-1"><ChevronLeft className="h-5 w-5" /></button>}
              {reportStep === 'reasons' && <button onClick={() => setReportStep('menu')} className="p-1"><ChevronLeft className="h-5 w-5" /></button>}
              {(reportStep === 'menu' || reportStep === 'done') && <div className="w-7" />}
              <h3 className="font-bold text-base flex-1 text-center">Report</h3>
              <button onClick={() => setReportMenuOpen(false)} className="p-1"><X className="h-5 w-5" /></button>
            </div>

            {reportStep === 'menu' && (
              <div className="p-5">
                <button onClick={() => setReportStep('reasons')} className="flex items-center gap-3 w-full py-3 text-left">
                  <Flag className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Report</span>
                </button>
              </div>
            )}

            {reportStep === 'reasons' && (
              <div className="flex-1 overflow-y-auto">
                <p className="px-5 pt-4 pb-2 text-xs text-muted-foreground font-medium">Selecione um motivo</p>
                {["Produto perigoso ou inseguro", "Itens tóxicos ou inflamáveis", "Conteúdo discriminatório ou ofensivo", "Produtos ilegais", "Informações imprecisas do produto", "Golpe ou fraude", "Possível produto falsificado", "Outro"].map((reason) => (
                  <button key={reason} onClick={() => { setReportReason(reason); setReportStep('form'); }} className="flex items-center justify-between w-full px-5 py-3.5 border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <span className="text-sm">{reason}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}

            {reportStep === 'form' && (
              <div className="flex-1 overflow-y-auto flex flex-col">
                <div className="px-5 py-3 bg-muted/30 border-b border-border"><p className="text-xs text-muted-foreground">Motivo: {reportReason}</p></div>
                <div className="px-5 py-4 flex items-center gap-3 border-b border-border">
                  <img src="/images/eco/eco-produto-1.png" alt="Produto" className="h-14 w-14 rounded-lg object-contain border bg-muted/30 p-1" />
                  <div>
                    <p className="text-sm font-medium line-clamp-1">Bloqueador de Ar Economizare</p>
                    <p className="text-xs text-muted-foreground">Economizare-BR</p>
                  </div>
                </div>
                <div className="px-5 py-4 flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold">Descrição (Opcional):</p>
                    <p className="text-xs text-muted-foreground">{reportDescription.length}/300</p>
                  </div>
                  <textarea maxLength={300} value={reportDescription} onChange={(e) => setReportDescription(e.target.value)} placeholder="Compartilhe mais detalhes sobre o problema" className="w-full h-24 border border-border rounded-lg p-3 text-sm resize-none bg-background focus:outline-none focus:ring-1 focus:ring-cta placeholder:text-muted-foreground" />
                </div>
                <div className="px-5 pb-6 pt-2">
                  <button onClick={() => { setReportStep('done'); setReportDescription(''); localStorage.setItem('eco_coupon', 'DESCULPA80'); }} className="w-full py-3.5 rounded-xl bg-cta text-white font-bold text-sm hover:bg-cta-hover transition-colors">Reportar</button>
                </div>
              </div>
            )}

            {reportStep === 'done' && (
              <div className="flex-1 flex flex-col items-center px-5 py-10">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4"><Check className="h-8 w-8 text-cta" /></div>
                <h4 className="font-bold text-base mb-2">Obrigado por reportar</h4>
                <p className="text-sm text-muted-foreground text-center max-w-xs mb-6">Analisaremos seu report e tomaremos as medidas necessárias.</p>
                <div className="w-full rounded-2xl border-2 border-dashed border-cta/40 bg-cta/5 p-5 text-center mb-6">
                  <p className="text-xs text-muted-foreground mb-1">Como pedido de desculpas, aqui vai um cupom especial:</p>
                  <p className="text-2xl font-extrabold text-cta tracking-wider my-2">DESCULPA80</p>
                  <p className="text-sm font-semibold text-cta">80% OFF na sua próxima compra</p>
                  <button onClick={() => { navigator.clipboard.writeText('DESCULPA80'); setCouponCopied(true); setTimeout(() => setCouponCopied(false), 2000); }} className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-cta hover:underline">
                    <Copy className="h-3.5 w-3.5" />
                    {couponCopied ? 'Copiado!' : 'Copiar cupom'}
                  </button>
                </div>
                <div className="w-full mt-auto pt-4 pb-2">
                  <button onClick={() => setReportMenuOpen(false)} className="w-full py-3.5 rounded-xl bg-cta text-white font-bold text-sm hover:bg-cta-hover transition-colors">Concluído</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Image Zoom Modal */}
      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl p-0 border-0 bg-transparent shadow-none [&>button]:hidden">
          <DialogDescription className="sr-only">Imagem ampliada do produto</DialogDescription>
          <DialogTitle className="sr-only">Imagem do produto</DialogTitle>
          <button onClick={() => setZoomOpen(false)} className="absolute top-3 right-3 z-50 h-10 w-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
            <X className="h-6 w-6 text-white" />
          </button>
          <div className="relative"
            onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; touchStartY.current = e.touches[0].clientY; swiping.current = false; }}
            onTouchMove={(e) => { const dx = Math.abs(e.touches[0].clientX - touchStartX.current); const dy = e.touches[0].clientY - touchStartY.current; if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) { swiping.current = true; e.preventDefault(); } touchEndX.current = e.touches[0].clientX; }}
            onTouchEnd={(e) => { const diffX = touchStartX.current - touchEndX.current; const diffY = e.changedTouches[0].clientY - touchStartY.current; if (diffY > 100) { setZoomOpen(false); return; } if (swiping.current && Math.abs(diffX) > 50) { if (diffX > 0) nextImage(); else prevImage(); } }}
          >
            <img src={productImages[currentImage]} alt="Produto ampliado" className="w-full h-auto rounded-lg" />
            <button onClick={(e) => { e.stopPropagation(); prevImage(); }} className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-foreground/30 backdrop-blur-sm flex items-center justify-center"><ChevronLeft className="h-5 w-5 text-white" /></button>
            <button onClick={(e) => { e.stopPropagation(); nextImage(); }} className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-foreground/30 backdrop-blur-sm flex items-center justify-center"><ChevronRight className="h-5 w-5 text-white" /></button>
            <span className="absolute bottom-3 right-3 rounded-full bg-foreground/60 px-2.5 py-1 text-xs font-medium text-white">{currentImage + 1}/{productImages.length}</span>
          </div>
        </DialogContent>
      </Dialog>

      {/* Review Photo Zoom Modal */}
      <Dialog open={reviewZoomOpen} onOpenChange={setReviewZoomOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl p-0 border-0 bg-transparent shadow-none [&>button]:hidden">
          <DialogDescription className="sr-only">Foto da avaliação ampliada</DialogDescription>
          <DialogTitle className="sr-only">Foto da avaliação</DialogTitle>
          <button onClick={() => setReviewZoomOpen(false)} className="absolute top-3 right-3 z-50 h-10 w-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
            <X className="h-6 w-6 text-white" />
          </button>
          <div className="relative"
            onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; touchStartY.current = e.touches[0].clientY; swiping.current = false; }}
            onTouchMove={(e) => { const dx = Math.abs(e.touches[0].clientX - touchStartX.current); const dy = Math.abs(e.touches[0].clientY - touchStartY.current); if (dx > dy && dx > 10) { swiping.current = true; e.preventDefault(); } touchEndX.current = e.touches[0].clientX; }}
            onTouchEnd={(e) => { const diffX = touchStartX.current - touchEndX.current; const diffY = e.changedTouches[0].clientY - touchStartY.current; if (diffY > 100) { setReviewZoomOpen(false); return; } if (swiping.current && Math.abs(diffX) > 50) { if (diffX > 0) setReviewZoomIndex((prev) => Math.min(prev + 1, reviewZoomPhotos.length - 1)); else setReviewZoomIndex((prev) => Math.max(prev - 1, 0)); } }}
          >
            <img src={reviewZoomPhotos[reviewZoomIndex]} alt="Foto da avaliação ampliada" className="w-full h-auto rounded-lg" />
            {reviewZoomPhotos.length > 1 && (
              <>
                <button onClick={(e) => { e.stopPropagation(); setReviewZoomIndex((prev) => Math.max(prev - 1, 0)); }} disabled={reviewZoomIndex === 0} className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-foreground/30 backdrop-blur-sm flex items-center justify-center disabled:opacity-30"><ChevronLeft className="h-5 w-5 text-white" /></button>
                <button onClick={(e) => { e.stopPropagation(); setReviewZoomIndex((prev) => Math.min(prev + 1, reviewZoomPhotos.length - 1)); }} disabled={reviewZoomIndex === reviewZoomPhotos.length - 1} className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-foreground/30 backdrop-blur-sm flex items-center justify-center disabled:opacity-30"><ChevronRight className="h-5 w-5 text-white" /></button>
              </>
            )}
            <span className="absolute bottom-3 right-3 rounded-full bg-foreground/60 px-2.5 py-1 text-xs font-medium text-white">{reviewZoomIndex + 1}/{reviewZoomPhotos.length}</span>
          </div>
        </DialogContent>
      </Dialog>

      {/* Exit Modal 1 - 25% OFF */}
      {exitModalOpen && (
        <div className="fixed inset-0 z-[60]" onClick={() => { setExitModalOpen(false); if (!exit2Shown) { setExit2Open(true); setExit2Shown(true); fireAlertSiren(); } }}>
          <div className="absolute inset-0 bg-black/60 animate-in fade-in-0" />
          <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl transition-transform duration-300 mx-auto sm:max-w-md animate-in slide-in-from-bottom max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-muted-foreground/30" /></div>
            <button onClick={() => { setExitModalOpen(false); if (!exit2Shown) { setExit2Open(true); setExit2Shown(true); fireAlertSiren(); } }} className="absolute right-3 top-3 rounded-full bg-muted p-1.5 text-muted-foreground hover:text-foreground transition-colors"><X className="h-3.5 w-3.5" /></button>

            <div className="px-5 pt-2 pb-3"><p className="text-base font-bold">Ei, espera! 🎁</p></div>

            <div className="mx-5 rounded-lg bg-coupon-bg p-3 mb-4 coupon-spin-border">
              <svg className="marching-border" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" rx="7" ry="7" width="calc(100% - 2px)" height="calc(100% - 2px)" fill="none" stroke="hsl(142 71% 45%)" strokeWidth="2" strokeDasharray="8 6" /></svg>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Cupom de Desconto</p>
              <p className="text-2xl font-black tracking-wider text-destructive mb-0.5">VOLTA25</p>
              <p className="text-xs"><strong>25% OFF</strong> na sua compra</p>
              <p className="text-xs mt-1.5">⏳ Expira em <strong className="text-destructive">{fmt(countdown.m)}:{fmt(countdown.s)}</strong></p>
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-destructive" style={{ width: `${Math.max(5, ((countdown.m * 60 + countdown.s) / 300) * 100)}%` }} />
              </div>
            </div>

            <div className="flex items-center gap-3 px-5 pb-4">
              <img src="/images/eco/eco-produto-1.png" alt="Economizare" className="h-16 w-16 rounded-lg object-contain border bg-muted/30 p-1" />
              <div>
                <p className="font-bold text-sm">Bloqueador de Ar Economizare</p>
                <p className="text-xs text-muted-foreground line-through">R$ {OLD_PRICE.toFixed(2).replace('.', ',')}</p>
                <p className="text-xs text-muted-foreground line-through">R$ {PRICE.toFixed(2).replace('.', ',')}</p>
                <p className="text-[#0f7b3f] font-extrabold text-lg">R$ {(PRICE * 0.75).toFixed(2).replace('.', ',')}</p>
                <span className="inline-block mt-0.5 rounded bg-green-100 text-green-700 text-[10px] font-bold px-1.5 py-0.5">+25% OFF com cupom</span>
              </div>
            </div>

            <div className="px-5 pb-6">
              <button onClick={() => {
                saveCart([{ quantity: 1 }]);
                setExitModalOpen(false);
                nav(getUrlWithUtm(`/economizare/checkout?cupom=VOLTA25`));
              }} className="w-full font-bold text-base py-4 rounded-2xl transition-all bg-cta text-white hover:bg-cta-hover animate-[bounce-soft_2s_ease-in-out_infinite]">
                Aproveitar desconto <span className="inline-block animate-[wiggle_1s_ease-in-out_infinite]">🔥</span> - R$ {(PRICE * 0.75).toFixed(2).replace('.', ',')}
              </button>
              <p className="text-[10px] text-muted-foreground mt-2 text-center">Válido por tempo limitado. Não perca!</p>
            </div>
          </div>
        </div>
      )}

      {/* Exit Modal 2 - 50% OFF */}
      {exit2Open && (
        <div className="fixed inset-0 z-[60]" onClick={() => setExit2Open(false)}>
          <div className="absolute inset-0 bg-black/60 animate-in fade-in-0" />
          <div className="absolute inset-0 bg-destructive/20 animate-[pulse-red_1.5s_ease-in-out_infinite] pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl transition-transform duration-300 mx-auto sm:max-w-md animate-in slide-in-from-bottom max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-muted-foreground/30" /></div>
            <button onClick={() => setExit2Open(false)} className="absolute right-3 top-3 rounded-full bg-muted p-1.5 text-muted-foreground hover:text-foreground transition-colors"><X className="h-3.5 w-3.5" /></button>

            <div className="px-5 pt-2 pb-3"><p className="text-base font-bold">Última chance! 🔥</p></div>

            <div className="mx-5 rounded-lg bg-destructive/5 p-3 mb-4 coupon-spin-border">
              <svg className="marching-border" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" rx="7" ry="7" width="calc(100% - 2px)" height="calc(100% - 2px)" fill="none" stroke="hsl(0 84% 60%)" strokeWidth="2" strokeDasharray="8 6" /></svg>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Oferta Final Exclusiva</p>
              <p className="text-2xl font-black tracking-wider text-destructive mb-0.5">ULTIMA50</p>
              <p className="text-xs"><strong>50% OFF</strong> — só agora!</p>
              <p className="text-xs mt-1.5">⏳ Expira em <strong className="text-destructive">{fmt(countdown.m)}:{fmt(countdown.s)}</strong></p>
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-destructive" style={{ width: `${Math.max(5, ((countdown.m * 60 + countdown.s) / 300) * 100)}%` }} />
              </div>
            </div>

            <div className="flex items-center gap-3 px-5 pb-4">
              <img src="/images/eco/eco-produto-1.png" alt="Economizare" className="h-16 w-16 rounded-lg object-contain border bg-muted/30 p-1" />
              <div>
                <p className="font-bold text-sm">Bloqueador de Ar Economizare</p>
                <p className="text-xs text-muted-foreground line-through">R$ {OLD_PRICE.toFixed(2).replace('.', ',')}</p>
                <p className="text-xs text-muted-foreground line-through">R$ {PRICE.toFixed(2).replace('.', ',')}</p>
                <p className="text-destructive font-extrabold text-lg">R$ {(PRICE * 0.50).toFixed(2).replace('.', ',')}</p>
                <span className="inline-block mt-0.5 rounded bg-destructive/10 text-destructive text-[10px] font-bold px-1.5 py-0.5">+50% OFF com cupom</span>
              </div>
            </div>

            <div className="px-5 pb-6">
              <button onClick={() => {
                saveCart([{ quantity: 1 }]);
                setExit2Open(false);
                nav(getUrlWithUtm(`/economizare/checkout?cupom=ULTIMA50`));
              }} className="w-full font-bold text-base py-4 rounded-2xl transition-all bg-destructive text-destructive-foreground hover:bg-destructive/90 animate-[bounce-soft_2s_ease-in-out_infinite]">
                Última chance <span className="inline-block animate-[wiggle_1s_ease-in-out_infinite]">🔥</span> - R$ {(PRICE * 0.50).toFixed(2).replace('.', ',')}
              </button>
              <p className="text-[10px] text-muted-foreground mt-2 text-center">Oferta FINAL. Após fechar, o desconto expira!</p>
            </div>
          </div>
        </div>
      )}

      {/* Store Modal */}
      {storeOpen && (
        <div className="fixed inset-0 z-[60]" onClick={closeStore}>
          <div className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${storeClosing ? 'opacity-0' : 'opacity-100 animate-in fade-in-0'}`} />
          <div className={`absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl max-h-[85vh] overflow-y-auto transition-transform duration-300 mx-auto sm:max-w-md ${storeClosing ? 'translate-y-full' : 'animate-in slide-in-from-bottom'}`} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-muted-foreground/30" /></div>
            <button onClick={closeStore} className="absolute right-3 top-3 rounded-full bg-muted p-1.5 text-muted-foreground hover:text-foreground transition-colors"><X className="h-3.5 w-3.5" /></button>

            <div className="px-5 py-6 space-y-5">
              <div className="flex items-center gap-4">
                <img src="/images/eco/logo-economizare.png" alt="Economizare" className="h-14 w-14 rounded-full object-contain border" />
                <div>
                  <h3 className="font-bold text-base">Economizare</h3>
                  <p className="text-xs text-muted-foreground">Fabricação e Comércio de Peças</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-semibold">4.8</span>
                    <span className="text-xs text-muted-foreground">(32.891 avaliações)</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-2">Sobre a Economizare</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  A Economizare é especialista em soluções para economia de água. Com tecnologia patenteada e certificação INMETRO, nossos produtos ajudam milhares de famílias brasileiras a reduzirem suas contas de água de forma legal e segura. Participamos do Shark Tank Brasil e somos referência no mercado.
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2"><MapPin className="h-4 w-4 text-muted-foreground" /><span className="font-semibold text-sm">Localização</span></div>
                <p className="text-sm text-muted-foreground">São Paulo - SP, Brasil</p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2"><Shield className="h-4 w-4 text-muted-foreground" /><span className="font-semibold text-sm">Políticas da Loja</span></div>
                <div className="space-y-3">
                  <div><p className="text-sm font-semibold flex items-center gap-1.5">📦 Devolução Gratuita</p><p className="text-xs text-muted-foreground">7 dias para devolução sem custo</p></div>
                  <div><p className="text-sm font-semibold flex items-center gap-1.5">✅ Garantia Economizare</p><p className="text-xs text-muted-foreground">1 ano de garantia + 5 anos de validade</p></div>
                  <div><p className="text-sm font-semibold flex items-center gap-1.5">🚚 Frete Grátis</p><p className="text-xs text-muted-foreground">Entrega gratuita para todo o Brasil</p></div>
                  <div><p className="text-sm font-semibold flex items-center gap-1.5">🔒 Pagamento Seguro</p><p className="text-xs text-muted-foreground">Transações protegidas e criptografadas</p></div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-3 border-t text-center">
                {[
                  { target: 850000, suffix: "K", divisor: 1000, decimals: 0, label: "Seguidores" },
                  { target: 8200, suffix: "K", divisor: 1000, decimals: 1, label: "Vendidos" },
                  { target: 96, suffix: "%", divisor: 1, decimals: 0, label: "Satisfação" },
                ].map((stat) => (
                  <div key={stat.label}>
                    <CountUp target={stat.target} suffix={stat.suffix} divisor={stat.divisor} decimals={stat.decimals} run={storeOpen} />
                    <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {chatOpen && (
        <div className="fixed inset-0 z-[60]" onClick={closeChat}>
          <div className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${chatClosing ? 'opacity-0' : 'opacity-100 animate-in fade-in-0'}`} />
          <div className={`absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl max-h-[85vh] flex flex-col transition-transform duration-300 mx-auto sm:max-w-md ${chatClosing ? 'translate-y-full' : 'animate-in slide-in-from-bottom'}`} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-muted-foreground/30" /></div>
            <button onClick={closeChat} className="absolute left-3 top-3 rounded-full bg-muted p-1.5 text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft className="h-3.5 w-3.5" /></button>
            <div className="px-5 pt-2 pb-3 border-b flex items-center gap-3">
              <img src="/images/eco/logo-economizare.png" alt="Economizare" className="w-8 h-8 rounded-full object-contain border border-border" />
              <div>
                <p className="text-sm font-bold leading-tight">Economizare Oficial</p>
                <p className="text-[11px] text-green-600 font-medium flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />{chatTyping ? 'digitando...' : 'Online agora'}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-[300px] max-h-[60vh]">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                  {msg.role === 'bot' && <img src="/images/eco/logo-economizare.png" alt="Economizare" className="w-7 h-7 rounded-full object-contain flex-shrink-0 border border-border" />}
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${msg.role === 'user' ? 'bg-cta text-white rounded-br-sm' : 'bg-muted text-foreground rounded-bl-sm'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatTyping && (
                <div className="flex justify-start items-end gap-2">
                  <img src="/images/eco/logo-economizare.png" alt="Economizare" className="w-7 h-7 rounded-full object-contain flex-shrink-0 border border-border" />
                  <div className="bg-muted text-foreground rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
                    <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="border-t px-4 py-3 space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Perguntas rápidas:</p>
              <div className="flex flex-wrap gap-2">
                {faqs.map((faq, i) => (
                  <button key={i} onClick={() => handleQuickQuestion(faq)} className="text-xs border border-border rounded-full px-3 py-1.5 text-foreground hover:bg-muted transition-colors">
                    {faq.q}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); sendChatMessage(chatInput); }} className="border-t px-4 py-3 flex items-center gap-2">
              <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Digite sua pergunta..." className="flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-cta" />
              <button type="submit" disabled={chatTyping || !chatInput.trim()} className="bg-cta text-white rounded-full p-2.5 disabled:opacity-50">
                <ChevronRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Cart Modal */}
      {cartOpen && (
        <div className="fixed inset-0 z-[60]" onClick={closeCart}>
          <div className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${cartClosing ? 'opacity-0' : 'opacity-100 animate-in fade-in-0'}`} />
          <div className={`absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl transition-transform duration-300 mx-auto sm:max-w-md ${cartClosing ? 'translate-y-full' : 'animate-in slide-in-from-bottom'}`} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-muted-foreground/30" /></div>
            <button onClick={closeCart} className="absolute right-3 top-3 rounded-full bg-muted p-1.5 text-muted-foreground hover:text-foreground transition-colors"><X className="h-3.5 w-3.5" /></button>

            <div className="px-5 pt-2 pb-3 border-b">
              <p className="text-base font-bold text-center">Carrinho de compras ({cartTotalQty})</p>
            </div>

            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6">
                <ShoppingCart className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <p className="text-lg font-bold text-foreground mb-1">Seu carrinho está vazio</p>
                <p className="text-sm text-muted-foreground text-center mb-6">Vamos preenchê-lo com seus produtos favoritos e ótimas ofertas!</p>
                <button onClick={closeCart} className="bg-cta text-white font-bold text-sm py-3 px-10 rounded-full hover:bg-cta-hover transition-colors">Começar a comprar</button>
              </div>
            ) : (
              <div className="px-5 py-4">
                {cartItems.map((item, idx) => (
                  <div key={idx} className="flex gap-3 pb-4 border-b mb-4 last:mb-0">
                    <img src="/images/eco/eco-produto-1.png" alt="Economizare" className="h-20 w-20 rounded-lg object-contain border bg-muted/30 p-1 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-bold text-sm">Bloqueador de Ar Economizare</p>
                      <p className="text-xs text-muted-foreground">Eliminador de Ar p/ Hidrômetro</p>
                      <p className="text-[#0f7b3f] font-extrabold text-base mt-1">R$ {(PRICE * item.quantity).toFixed(2).replace('.', ',')}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <button onClick={() => updateCartItem(idx, item.quantity - 1)} className="h-7 w-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-muted"><span className="text-sm font-bold">−</span></button>
                        <span className="text-sm font-bold w-5 text-center">{item.quantity}</span>
                        <button onClick={() => updateCartItem(idx, item.quantity + 1)} className="h-7 w-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-muted"><span className="text-sm font-bold">+</span></button>
                        <button onClick={() => saveCart(cartItems.filter((_, i) => i !== idx))} className="ml-auto h-7 w-7 rounded-full flex items-center justify-center text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="flex justify-between items-center py-3 border-b">
                  <span className="text-sm font-semibold">Total</span>
                  <span className="text-lg font-extrabold text-[#0f7b3f]">R$ {cartTotal.toFixed(2).replace('.', ',')}</span>
                </div>

                <button onClick={handleCartCheckout} className="w-full bg-cta text-white font-bold text-base py-3.5 rounded-2xl mt-4 hover:bg-cta-hover transition-colors">Finalizar compra</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EconomizareIndex;

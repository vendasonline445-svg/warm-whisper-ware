import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { initTikTokTracking, trackPageView } from "@/lib/tiktok-tracking";
import { initSessionReplay } from "@/lib/session-replay";
import Index from "./pages/Index";
import Checkout from "./pages/Checkout";
import TemplateCheckout from "./pages/TemplateCheckout";
import TemplateAdmin from "./pages/TemplateAdmin";
import PixPayment from "./pages/PixPayment";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import AdminTikTok from "./pages/AdminTikTok";
import PoliticaPrivacidade from "./pages/PoliticaPrivacidade";
import TermosDeUso from "./pages/TermosDeUso";
import Upsell1 from "./pages/Upsell1";
import Obrigado from "./pages/Obrigado";
import ObrigadoUpsell from "./pages/ObrigadoUpsell";
import AdminRastreios from "./pages/AdminRastreios";
import TrackingRedirect from "./pages/TrackingRedirect";

const queryClient = new QueryClient();

// SPA page view tracker
function TikTokSPATracker() {
  const location = useLocation();
  useEffect(() => {
    trackPageView();
  }, [location.pathname]);
  return null;
}

// Init tracking on app load
initTikTokTracking();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <TikTokSPATracker />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/template-checkout" element={<TemplateCheckout />} />
          <Route path="/pix" element={<PixPayment />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/tiktok" element={<AdminTikTok />} />
          <Route path="/admin/rastreios" element={<AdminRastreios />} />
          <Route path="/adm" element={<TemplateAdmin />} />
          <Route path="/politica-de-privacidade" element={<PoliticaPrivacidade />} />
          <Route path="/termos-de-uso" element={<TermosDeUso />} />
          <Route path="/taxa-alfandega" element={<Upsell1 />} />
          <Route path="/upsell1" element={<Upsell1 />} />
          <Route path="/obrigado" element={<Obrigado />} />
          <Route path="/obrigado-upsell" element={<ObrigadoUpsell />} />
          <Route path="/r/:trackingId" element={<TrackingRedirect />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

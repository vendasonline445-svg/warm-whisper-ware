import { useState, useEffect } from "react";
import { ShieldCheck, XCircle, CreditCard, Lock } from "lucide-react";

const messages = [
  { icon: ShieldCheck, text: "Seus dados estão seguros conosco" },
  { icon: XCircle, text: "Cancelamento fácil" },
  { icon: CreditCard, text: "Parcelas sem juros disponíveis" },
  { icon: Lock, text: "Checkout 100% seguro e garantido" },
];

export default function RotatingTrustBar() {
  const [index, setIndex] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % messages.length);
        setAnimating(false);
      }, 400);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const { icon: Icon, text } = messages[index];

  return (
    <div className="h-5 overflow-hidden relative">
      <p
        className={`text-xs text-success flex items-center justify-center gap-1 transition-all duration-400 ${
          animating
            ? "opacity-0 -translate-y-3"
            : "opacity-100 translate-y-0"
        }`}
        style={{ transitionDuration: "400ms" }}
      >
        <Icon className="h-3 w-3 flex-shrink-0" />
        {text}
      </p>
    </div>
  );
}

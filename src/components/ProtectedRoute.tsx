import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import FunnelIQLogo from "@/components/FunnelIQLogo";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError("Email ou senha incorretos");
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    if (password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres");
      setLoading(false);
      return;
    }
    const { error: authError } = await supabase.auth.signUp({ email, password });
    if (authError) {
      setError(authError.message);
    } else {
      setSuccess("Conta criada! Verifique seu email para confirmar o cadastro.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background admin-bg p-4">
      <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="w-full max-w-sm space-y-6 glass-card p-8 rounded-2xl">
        <div className="flex flex-col items-center gap-3">
          <FunnelIQLogo size={48} />
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">FunnelIQ</h1>
            <p className="text-xs text-muted-foreground mt-1">
              {isSignUp ? "Crie sua conta" : "Inteligência para otimizar funis de conversão"}
            </p>
          </div>
        </div>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          autoComplete="email"
          required
        />
        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          autoComplete={isSignUp ? "new-password" : "current-password"}
          required
        />
        {error && <p className="text-destructive text-sm text-center">{error}</p>}
        {success && <p className="text-green-500 text-sm text-center">{success}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground py-3 rounded-xl font-semibold transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? (isSignUp ? "Criando..." : "Entrando...") : (isSignUp ? "Criar conta" : "Entrar")}
        </button>
        <button
          type="button"
          onClick={() => { setIsSignUp(!isSignUp); setError(""); setSuccess(""); }}
          className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {isSignUp ? "Já tem conta? Entrar" : "Não tem conta? Criar acesso"}
        </button>
      </form>
    </div>
  );
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <FunnelIQLogo size={48} />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!session) return <AdminLogin />;
  return <>{children}</>;
}

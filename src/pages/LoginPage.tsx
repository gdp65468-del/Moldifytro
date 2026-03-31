import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { useAuth } from "@/hooks/useAuth";

export function LoginPage() {
  const { signIn, signInWithGoogle, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const redirectTo = (location.state as { redirectTo?: string } | null)?.redirectTo ?? "/dashboard";

  useEffect(() => {
    if (user) {
      navigate(redirectTo, { replace: true });
    }
  }, [navigate, redirectTo, user]);

  return (
    <div className="mx-auto max-w-lg">
      <Panel className="text-center">
        <h1 className="font-display text-2xl font-bold text-ink sm:text-4xl">Entrar no Moldify</h1>
        <p className="mt-3 text-sm leading-6 text-stone-600 sm:text-base">
          Faca login para salvar rascunhos, publicar templates e liberar o link compartilhavel.
        </p>

        <Button
          className="mt-8 w-full"
          variant="secondary"
          onClick={async () => {
            setError(null);
            try {
              await signInWithGoogle(redirectTo);
            } catch (authError) {
              setError(authError instanceof Error ? authError.message : "Nao foi possivel entrar com Google.");
            }
          }}
        >
          Continuar com Google
        </Button>

        <div className="mt-5 flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-stone-400">
          <span className="h-px flex-1 bg-stone-200" />
          <span>ou</span>
          <span className="h-px flex-1 bg-stone-200" />
        </div>

        <label className="mt-5 block text-left text-sm font-semibold text-ink">
          E-mail
          <input
            type="email"
            className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-stone-800 outline-none transition focus:border-ember"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="voce@empresa.com"
            autoComplete="email"
          />
        </label>

        <label className="mt-4 block text-left text-sm font-semibold text-ink">
          Senha
          <input
            type="password"
            className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-stone-800 outline-none transition focus:border-ember"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Sua senha"
            autoComplete="current-password"
          />
        </label>

        <Button
          className="mt-6 w-full"
          onClick={async () => {
            setError(null);
            try {
              await signIn(email, password);
            } catch (authError) {
              setError(authError instanceof Error ? authError.message : "Nao foi possivel entrar.");
            }
          }}
        >
          Entrar com e-mail e senha
        </Button>

        {error ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-left text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <p className="mt-4 text-sm text-stone-500">
          O login usa Supabase Auth com Google ou e-mail e senha.
        </p>

        <p className="mt-2 text-sm text-stone-500">
          Ainda nao tem conta?{" "}
          <Link to="/signup" className="font-semibold text-ember">
            Criar conta
          </Link>
        </p>
      </Panel>
    </div>
  );
}

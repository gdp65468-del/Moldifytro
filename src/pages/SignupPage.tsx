import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { useAuth } from "@/hooks/useAuth";
import { signUpWithEmailPassword } from "@/services/auth";

export function SignupPage() {
  const { user, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const redirectTo = (location.state as { redirectTo?: string } | null)?.redirectTo ?? "/dashboard";

  useEffect(() => {
    if (user) {
      navigate(redirectTo, { replace: true });
    }
  }, [navigate, redirectTo, user]);

  return (
    <div className="mx-auto max-w-lg">
      <Panel className="text-center">
        <h1 className="font-display text-2xl font-bold text-ink sm:text-4xl">Criar conta no Moldify</h1>
        <p className="mt-3 text-sm leading-6 text-stone-600 sm:text-base">
          Inscreva-se com e-mail e senha para salvar templates e publicar links.
        </p>

        <Button
          className="mt-8 w-full"
          variant="secondary"
          onClick={async () => {
            setError(null);
            setMessage(null);
            try {
              await signInWithGoogle(redirectTo);
            } catch (signupError) {
              setError(
                signupError instanceof Error
                  ? signupError.message
                  : "Nao foi possivel criar ou entrar com Google.",
              );
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
            placeholder="Crie uma senha"
            autoComplete="new-password"
          />
        </label>

        <label className="mt-4 block text-left text-sm font-semibold text-ink">
          Confirmar senha
          <input
            type="password"
            className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-stone-800 outline-none transition focus:border-ember"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Repita a senha"
            autoComplete="new-password"
          />
        </label>

        <Button
          className="mt-6 w-full"
          onClick={async () => {
            setError(null);
            setMessage(null);

            if (!email.trim()) {
              setError("Informe seu e-mail.");
              return;
            }

            if (password.length < 6) {
              setError("A senha deve ter pelo menos 6 caracteres.");
              return;
            }

            if (password !== confirmPassword) {
              setError("As senhas nao conferem.");
              return;
            }

            try {
              const result = await signUpWithEmailPassword(email, password);
              if (result.signedIn) {
                navigate(redirectTo, { replace: true });
                return;
              }

              setMessage("Conta criada. Verifique seu e-mail para confirmar o cadastro.");
            } catch (signupError) {
              setError(signupError instanceof Error ? signupError.message : "Nao foi possivel criar a conta.");
            }
          }}
        >
          Criar conta
        </Button>

        {error ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-left text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {message ? (
          <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-left text-sm text-emerald-700">
            {message}
          </p>
        ) : null}

        <p className="mt-4 text-sm text-stone-500">
          Ja tem conta?{" "}
          <Link to="/login" className="font-semibold text-ember">
            Entrar
          </Link>
        </p>
      </Panel>
    </div>
  );
}

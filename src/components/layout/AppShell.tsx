import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Brand } from "@/components/layout/Brand";
import { CookieNotice } from "@/components/layout/CookieNotice";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";

export function AppShell() {
  const { user, signOut, isAdmin } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
    [
      "transition",
      isActive ? "text-ember" : "text-stone-700 hover:text-ember",
    ].join(" ");

  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="border-b border-stone-200/70 bg-paper/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-4 sm:gap-3 sm:px-6">
          <Brand compact />

          <nav className="hidden items-center gap-6 text-sm md:flex">
            <NavLink to="/" className={navLinkClassName}>
              Inicio
            </NavLink>
            <NavLink to="/dashboard" className={navLinkClassName}>
              Painel
            </NavLink>
            {isAdmin ? (
              <NavLink to="/admin" className={navLinkClassName}>
                Admin
              </NavLink>
            ) : null}
            {!user ? (
              <>
                <NavLink to="/login" className={navLinkClassName}>
                  Login
                </NavLink>
                <NavLink to="/signup" className={navLinkClassName}>
                  Cadastro
                </NavLink>
              </>
            ) : null}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <>
                <span className="hidden text-sm text-stone-700 md:block">{user.name}</span>
                <Button className="hidden md:inline-flex" variant="secondary" onClick={() => void signOut()}>
                  Sair
                </Button>
              </>
            ) : (
              <Link to="/login" className="hidden md:inline-flex">
                <Button variant="primary">Entrar</Button>
              </Link>
            )}
            <Button
              type="button"
              className="px-3 py-2 text-[11px] md:hidden"
              variant="secondary"
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
              onClick={() => setMobileMenuOpen((current) => !current)}
            >
              {mobileMenuOpen ? "Fechar" : "Menu"}
            </Button>
          </div>
        </div>

        {mobileMenuOpen ? (
          <div className="border-t border-stone-200/70 bg-white/88 px-4 py-4 md:hidden">
            <div className="mx-auto flex max-w-6xl flex-col gap-3">
              <NavLink to="/" className={navLinkClassName}>
                Inicio
              </NavLink>
              <NavLink to="/dashboard" className={navLinkClassName}>
                Painel
              </NavLink>
              {isAdmin ? (
                <NavLink to="/admin" className={navLinkClassName}>
                  Admin
                </NavLink>
              ) : null}
              {!user ? (
                <>
                  <NavLink to="/login" className={navLinkClassName}>
                    Login
                  </NavLink>
                  <NavLink to="/signup" className={navLinkClassName}>
                    Cadastro
                  </NavLink>
                </>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-stone-200 bg-stone-50 px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-ink">{user.name}</div>
                    <div className="text-xs text-stone-500">{user.email}</div>
                  </div>
                  <Button variant="secondary" onClick={() => void signOut()}>
                    Sair
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-[calc(14rem+env(safe-area-inset-bottom))] pt-8 sm:px-6 sm:py-10">
        <Outlet />
      </main>

      <footer className="border-t border-stone-200/70 bg-paper/70 px-4 py-6 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 text-sm text-stone-600 sm:flex-row sm:items-center sm:justify-between">
          <div>Moldify. Criacao, publicacao e compartilhamento de artes em um unico fluxo.</div>
          <div className="flex flex-wrap gap-4">
            <Link className="transition hover:text-ember" to="/privacidade">
              Privacidade
            </Link>
            <Link className="transition hover:text-ember" to="/cookies">
              Cookies
            </Link>
          </div>
        </div>
      </footer>

      <CookieNotice />
    </div>
  );
}

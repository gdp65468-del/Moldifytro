import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { COOKIE_NOTICE_STORAGE_KEY } from "@/lib/legal";

export function CookieNotice() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const accepted = window.localStorage.getItem(COOKIE_NOTICE_STORAGE_KEY);
    setOpen(!accepted);
  }, []);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-3 z-40 px-3 sm:bottom-4 sm:px-6">
      <div className="mx-auto flex max-w-4xl flex-col gap-4 rounded-[28px] border border-white/80 bg-[linear-gradient(160deg,rgba(255,249,241,0.98),rgba(255,255,255,0.96))] p-4 shadow-[0_28px_80px_-44px_rgba(17,24,39,0.48)] backdrop-blur-xl sm:flex-row sm:items-end sm:justify-between sm:p-5">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ember">Cookies e privacidade</p>
          <p className="mt-2 text-sm leading-6 text-stone-700">
            O Moldify usa cookies e armazenamento local essenciais para login, seguranca, funcionamento do editor
            e continuidade da sessao. Veja os detalhes em{" "}
            <Link to="/privacidade" className="font-semibold text-ember">
              Privacidade
            </Link>{" "}
            e{" "}
            <Link to="/cookies" className="font-semibold text-ember">
              Cookies
            </Link>
            .
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link to="/cookies">
            <Button variant="secondary">Ver politica</Button>
          </Link>
          <Button
            onClick={() => {
              window.localStorage.setItem(COOKIE_NOTICE_STORAGE_KEY, "accepted");
              setOpen(false);
            }}
          >
            Entendi
          </Button>
        </div>
      </div>
    </div>
  );
}

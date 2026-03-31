import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl">
      <Panel className="text-center">
        <h1 className="font-display text-4xl font-bold text-ink">Pagina nao encontrada</h1>
        <p className="mt-3 text-stone-600">O caminho solicitado nao existe ou ainda nao foi publicado.</p>
        <Link className="mt-6 inline-flex" to="/">
          <Button>Voltar para o inicio</Button>
        </Link>
      </Panel>
    </div>
  );
}

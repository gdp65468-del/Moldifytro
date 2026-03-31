import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AdminSectionNav } from "@/components/admin/AdminSectionNav";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { getAdminOverview } from "@/services/admin";

export function AdminOverviewPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: getAdminOverview,
    retry: 1,
  });

  if (isLoading) {
    return <Panel>Carregando visao geral admin...</Panel>;
  }

  if (isError || !data) {
    return (
      <Panel className="space-y-3">
        <h1 className="text-xl font-semibold text-ink">Nao foi possivel carregar o painel admin</h1>
        <p className="text-sm text-stone-600">
          {error instanceof Error ? error.message : "Ocorreu um erro ao buscar os dados administrativos."}
        </p>
        <Button variant="secondary" onClick={() => void refetch()}>
          Tentar novamente
        </Button>
      </Panel>
    );
  }

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <div>
        <p className="text-sm uppercase tracking-[0.18em] text-ember">Admin</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-ink">Operacao do Moldify</h1>
        <p className="mt-3 max-w-3xl text-stone-600">
          Painel executivo para acompanhar crescimento, templates publicados, receita e acessos.
        </p>
      </div>

      <AdminSectionNav />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Panel className="p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-stone-500">Usuarios</div>
          <div className="mt-2 text-3xl font-semibold text-ink">{data.totalUsers}</div>
        </Panel>
        <Panel className="p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-stone-500">Templates publicados</div>
          <div className="mt-2 text-3xl font-semibold text-ink">{data.publishedTemplates}</div>
        </Panel>
        <Panel className="p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-stone-500">Views / Downloads</div>
          <div className="mt-2 text-3xl font-semibold text-ink">
            {data.totalViews} / {data.totalDownloads}
          </div>
        </Panel>
        <Panel className="p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-stone-500">Receita total</div>
          <div className="mt-2 text-3xl font-semibold text-ink">
            {data.revenueTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Panel>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-ink">Templates recentes</h2>
            <Link to="/admin/templates">
              <Button variant="secondary">Abrir listagem</Button>
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {data.recentTemplates.map((template) => (
              <div
                key={template.id}
                className="grid gap-3 rounded-[22px] border border-stone-200 bg-stone-50/70 p-4 md:grid-cols-[1fr_auto]"
              >
                <div>
                  <div className="font-semibold text-ink">{template.title}</div>
                  <div className="mt-1 text-sm text-stone-600">
                    {template.ownerName} · {template.templateMode === "full_frame" ? "Moldura" : "Logo"} ·{" "}
                    {template.status}
                  </div>
                </div>
                <div className="text-sm text-stone-500">
                  {new Date(template.updatedAt).toLocaleDateString("pt-BR")}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="space-y-4">
          <h2 className="text-xl font-semibold text-ink">Alertas rapidos</h2>
          <div className="rounded-[22px] bg-stone-100 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-stone-500">Pagamentos pendentes ou falhos</div>
            <div className="mt-2 text-3xl font-semibold text-ink">{data.pendingOrFailedPayments}</div>
          </div>
          <div className="rounded-[22px] bg-stone-100 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-stone-500">Pagamentos aprovados</div>
            <div className="mt-2 text-3xl font-semibold text-ink">{data.approvedPayments}</div>
          </div>
          <Link to="/admin/payments" className="inline-flex">
            <Button>Conferir pagamentos</Button>
          </Link>
        </Panel>
      </div>
    </div>
  );
}

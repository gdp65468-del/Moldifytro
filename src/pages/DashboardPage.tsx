import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { StatusPanel } from "@/components/ui/StatusPanel";
import { usePlatformTemplates } from "@/hooks/usePlatformTemplates";
import { useUserTemplates } from "@/hooks/useUserTemplates";
import { useAuth } from "@/hooks/useAuth";
import { formatTemplateStatusLabel } from "@/lib/payment-flow";
import { buildAbsoluteUrl, copyTextWithFallback, getPlatformTemplatePublicPath } from "@/lib/share";
import {
  deleteTemplatePermanently,
  emptyTemplateTrash,
  moveTemplateToTrash,
  restoreTemplateFromTrash,
} from "@/services/templates";

function formatTrashTime(purgeAt?: string | null) {
  if (!purgeAt) {
    return "Exclusao programada em breve";
  }

  const remainingMs = new Date(purgeAt).getTime() - Date.now();
  if (remainingMs <= 0) {
    return "Expira a qualquer momento";
  }

  const totalHours = Math.floor(remainingMs / (1000 * 60 * 60));
  const totalMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

  if (totalHours >= 24) {
    return "Expira em cerca de 24 horas";
  }

  if (totalHours > 0) {
    return `Expira em ${totalHours}h${totalMinutes ? ` ${totalMinutes}min` : ""}`;
  }

  return `Expira em ${Math.max(totalMinutes, 1)} min`;
}

function getTrashConfirmationMessage(template: {
  title: string;
  status: string;
  shareSlug?: string;
  pricePaid?: number | null;
}) {
  if (template.status === "published" || template.shareSlug) {
    return `Este template ja esta publicado. Ao mover "${template.title}" para a lixeira, o link publico sera desativado imediatamente.\n\nVoce ainda podera recuperar o template por 24 horas.\n\nDeseja continuar?`;
  }

  if ((template.pricePaid ?? 0) > 0 || template.status === "pending_payment") {
    return `Este template ja tem pagamento relacionado. Ao mover "${template.title}" para a lixeira, ele saira da sua area principal e ficara disponivel para recuperacao por 24 horas.\n\nDeseja continuar?`;
  }

  return `Mover "${template.title}" para a lixeira?\n\nVoce podera recuperar o template nas proximas 24 horas.`;
}

export function DashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const platformTemplatesQuery = usePlatformTemplates();
  const userTemplatesQuery = useUserTemplates(user?.id);
  const trashTemplatesQuery = useUserTemplates(user?.id, "trash");
  const platformTemplates = platformTemplatesQuery.data ?? [];
  const userTemplates = userTemplatesQuery.data ?? [];
  const trashedTemplates = trashTemplatesQuery.data ?? [];
  const isDashboardLoading = platformTemplatesQuery.isLoading || userTemplatesQuery.isLoading;
  const [confirmState, setConfirmState] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    tone?: "default" | "danger";
    action: () => void;
  } | null>(null);
  const [copiedPlatformId, setCopiedPlatformId] = useState<string | null>(null);

  async function handleSharePlatformTemplate(platformTemplateId: string) {
    try {
      await copyTextWithFallback(buildAbsoluteUrl(getPlatformTemplatePublicPath(platformTemplateId)));
      setCopiedPlatformId(platformTemplateId);
      window.setTimeout(() => {
        setCopiedPlatformId((current) => (current === platformTemplateId ? null : current));
      }, 1800);
    } catch {
      setCopiedPlatformId(null);
    }
  }

  const refreshTemplateLists = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["user-templates", user?.id] }),
      queryClient.refetchQueries({ queryKey: ["user-templates", user?.id], type: "active" }),
    ]);
  };

  const trashMutation = useMutation({
    mutationFn: (templateId: string) => moveTemplateToTrash(templateId),
    onSuccess: refreshTemplateLists,
  });

  const restoreMutation = useMutation({
    mutationFn: (templateId: string) => restoreTemplateFromTrash(templateId),
    onSuccess: refreshTemplateLists,
  });

  const deleteMutation = useMutation({
    mutationFn: (templateId: string) => deleteTemplatePermanently(templateId),
    onSuccess: refreshTemplateLists,
  });

  const emptyTrashMutation = useMutation({
    mutationFn: () => emptyTemplateTrash(),
    onSuccess: refreshTemplateLists,
  });

  const isConfirmBusy = useMemo(
    () =>
      trashMutation.isPending ||
      restoreMutation.isPending ||
      deleteMutation.isPending ||
      emptyTrashMutation.isPending,
    [deleteMutation.isPending, emptyTrashMutation.isPending, restoreMutation.isPending, trashMutation.isPending],
  );

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <ConfirmModal
        open={Boolean(confirmState)}
        title={confirmState?.title ?? ""}
        description={confirmState?.description ?? ""}
        confirmLabel={confirmState?.confirmLabel ?? "Confirmar"}
        tone={confirmState?.tone ?? "default"}
        busy={isConfirmBusy}
        onClose={() => setConfirmState(null)}
        onConfirm={() => {
          confirmState?.action();
        }}
      />

      <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <Panel
          variant="hero"
          size="md"
          className="bg-[radial-gradient(circle_at_top_left,rgba(204,95,26,0.16),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(29,58,47,0.12),transparent_30%),linear-gradient(145deg,rgba(255,249,241,0.97),rgba(255,255,255,0.94))]"
        >
          <span className="inline-flex rounded-full border border-white/90 bg-white/85 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-ember">
            Sua area de criacao
          </span>
          <div className="mt-4 grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">Seu painel de criacao</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
                Crie templates com moldura completa ou logo sobreposta, salve rascunhos e publique quando
                o pagamento estiver aprovado.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link to="/editor/new/frame">
                  <Button>Criar moldura completa</Button>
                </Link>
                <Link to="/editor/new/overlay">
                  <Button variant="secondary">Criar logo sobreposta</Button>
                </Link>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <div className="rounded-[22px] border border-white/80 bg-white/80 p-3.5 shadow-[0_18px_40px_-32px_rgba(22,19,18,0.15)]">
                <div className="text-xs uppercase tracking-[0.18em] text-stone-500">Templates</div>
                <div className="mt-1.5 text-2xl font-semibold text-ink">
                  {isDashboardLoading ? "..." : userTemplates.length}
                </div>
              </div>
              <div className="rounded-[22px] border border-white/80 bg-white/80 p-3.5 shadow-[0_18px_40px_-32px_rgba(22,19,18,0.15)]">
                <div className="text-xs uppercase tracking-[0.18em] text-stone-500">Publicos</div>
                <div className="mt-1.5 text-2xl font-semibold text-ink">
                  {isDashboardLoading
                    ? "..."
                    : userTemplates.filter((template) => template.status === "published").length}
                </div>
              </div>
              <div className="rounded-[22px] border border-white/80 bg-white/80 p-3.5 shadow-[0_18px_40px_-32px_rgba(22,19,18,0.15)]">
                <div className="text-xs uppercase tracking-[0.18em] text-stone-500">Downloads</div>
                <div className="mt-1.5 text-2xl font-semibold text-ink">
                  {isDashboardLoading
                    ? "..."
                    : userTemplates.reduce((sum, template) => sum + (template.downloadsCount ?? 0), 0)}
                </div>
              </div>
            </div>
          </div>
        </Panel>

        <Panel variant="dark" size="md">
          <h2 className="font-display text-2xl font-bold">Seu plano atual</h2>
          <p className="mt-3 text-sm text-stone-200">Plano gratuito com publicacao unitara por template.</p>
          <div className="mt-4 grid gap-3">
            <div className="rounded-[22px] bg-white/10 p-3.5">
              <div className="text-xs uppercase tracking-[0.18em] text-stone-300">Publicacao</div>
              <div className="mt-1.5 text-3xl font-semibold text-white">R$ 5,90</div>
              <p className="mt-1.5 text-sm text-stone-200">Liberacao por template publicado.</p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/6 p-3.5">
              <div className="text-xs uppercase tracking-[0.18em] text-stone-300">Modelo</div>
              <p className="mt-1.5 text-sm leading-5 text-stone-200">
                Crie, aprove, publique e compartilhe sem sair da mesma experiencia.
              </p>
            </div>
          </div>
        </Panel>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-ink">Molduras da plataforma</h2>
          <span className="text-sm text-stone-500">Uso imediato sem salvar template proprio</span>
        </div>
        {platformTemplatesQuery.isLoading ? (
          <StatusPanel
            title="Carregando molduras da plataforma"
            description="Buscando as molduras ativas para voce reutilizar no editor."
            loading
            compact
          />
        ) : platformTemplatesQuery.isError ? (
          <StatusPanel
            title="Nao foi possivel abrir as molduras da plataforma"
            description={
              platformTemplatesQuery.error instanceof Error
                ? platformTemplatesQuery.error.message
                : "Tente atualizar a pagina para buscar as molduras novamente."
            }
            tone="warning"
            compact
          />
        ) : platformTemplates.length ? (
          <div className="flex gap-5 overflow-x-auto pb-2 touch-pan-x overscroll-x-contain">
            {platformTemplates.map((template) => (
              <Panel
                key={template.id}
                variant="soft"
                className="flex min-w-[280px] flex-col p-4 sm:min-w-[320px] lg:min-w-[340px]"
              >
                <div className="rounded-[26px] border border-white/90 bg-white/84 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                  <img
                    src={template.thumbnailUrl}
                    alt={template.title}
                    className="mx-auto aspect-[4/5] w-full max-w-[220px] rounded-[20px] object-contain"
                  />
                </div>
                <div className="mt-4 flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-ink">{template.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-stone-600">
                        Template pronto para usar com a moldura base.
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-700">
                      Plataforma
                    </span>
                  </div>
                  <div className="mt-4 flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-stone-500">
                    <span>Views / Downloads</span>
                    <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-stone-700">
                      {template.viewsCount} / {template.downloadsCount}
                    </span>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link className="inline-flex" to={getPlatformTemplatePublicPath(template.id)}>
                      <Button variant="secondary">Usar moldura da plataforma</Button>
                    </Link>
                    <Button
                      variant="ghost"
                      onClick={() => void handleSharePlatformTemplate(template.id)}
                    >
                      {copiedPlatformId === template.id ? "Link copiado" : "Compartilhar link"}
                    </Button>
                  </div>
                </div>
              </Panel>
            ))}
          </div>
        ) : (
          <Panel variant="soft">
            <p className="text-sm text-stone-600">
              Nenhuma moldura da plataforma ativa no momento. Publique uma no painel admin.
            </p>
          </Panel>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-ink">Meus templates</h2>
          <span className="text-sm text-stone-500">{userTemplates.length} item(ns)</span>
        </div>

        {userTemplatesQuery.isLoading ? (
          <StatusPanel
            title="Carregando seus templates"
            description="Estamos montando seus rascunhos, publicados e estatisticas recentes."
            loading
            compact
          />
        ) : userTemplatesQuery.isError ? (
          <StatusPanel
            title="Nao foi possivel carregar seus templates"
            description={
              userTemplatesQuery.error instanceof Error
                ? userTemplatesQuery.error.message
                : "Verifique sua conexao e tente novamente."
            }
            tone="danger"
            compact
          />
        ) : userTemplates.length ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {userTemplates.map((template) => (
              <Panel key={template.id} variant="soft" className="flex h-full flex-col">
                {template.thumbnailUrl ? (
                  <div className="rounded-[26px] border border-white/90 bg-white/86 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                    <img
                      src={template.thumbnailUrl}
                      alt={template.title}
                      className="aspect-[2/3] w-full rounded-[22px] object-cover"
                    />
                  </div>
                ) : null}
                <div className="mt-4 flex flex-1 flex-col">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-ink">{template.title}</h3>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-stone-700">
                      {template.templateMode === "full_frame" ? "Moldura" : "Logo"}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-[#fff4e8] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-ember">
                      {formatTemplateStatusLabel(template.status)}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-600">
                      {template.downloadsCount ?? 0} downloads
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-stone-600">
                    Continue a edicao, publique quando estiver pronto e acompanhe o desempenho do link.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link to={`/editor/${template.id}`}>
                      <Button variant="secondary">Editar</Button>
                    </Link>
                    <Link to={`/publish/${template.id}`}>
                      <Button>Publicar</Button>
                    </Link>
                    {template.shareSlug ? (
                      <Link to={`/t/${template.shareSlug}`}>
                        <Button variant="ghost">Abrir link</Button>
                      </Link>
                    ) : null}
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setConfirmState({
                          title: "Mover para a lixeira",
                          description: getTrashConfirmationMessage(template),
                          confirmLabel: "Mover template",
                          action: () => {
                            void trashMutation.mutateAsync(template.id).finally(() => setConfirmState(null));
                          },
                        });
                      }}
                    >
                      Lixeira
                    </Button>
                  </div>
                </div>
              </Panel>
            ))}
          </div>
        ) : (
          <Panel variant="soft">
            <p className="text-stone-600">
              Nenhum template salvo ainda. Crie sua primeira moldura completa ou logo sobreposta.
            </p>
          </Panel>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-ink">Lixeira</h2>
            <p className="text-sm text-stone-500">
              Templates ficam aqui por 24 horas antes da exclusao definitiva.
            </p>
          </div>
          {trashedTemplates.length ? (
            <Button
              variant="secondary"
              onClick={() => {
                setConfirmState({
                  title: "Esvaziar lixeira",
                  description:
                    "Todos os templates da lixeira serao excluidos definitivamente.\n\nDepois desta etapa nao sera mais possivel recuperar nenhum deles.",
                  confirmLabel: "Esvaziar agora",
                  tone: "danger",
                  action: () => {
                    void emptyTrashMutation.mutateAsync().finally(() => setConfirmState(null));
                  },
                });
              }}
            >
              {emptyTrashMutation.isPending ? "Limpando..." : "Esvaziar lixeira"}
            </Button>
          ) : null}
        </div>

        {trashTemplatesQuery.isLoading ? (
          <StatusPanel
            title="Carregando lixeira"
            description="Buscando os templates removidos recentemente."
            loading
            compact
          />
        ) : trashedTemplates.length ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {trashedTemplates.map((template) => (
              <Panel key={template.id} variant="compact" className="flex h-full flex-col">
                {template.thumbnailUrl ? (
                  <div className="rounded-[24px] border border-stone-200/80 bg-white/90 p-3">
                    <img
                      src={template.thumbnailUrl}
                      alt={template.title}
                      className="aspect-[2/3] w-full rounded-[20px] object-cover opacity-85"
                    />
                  </div>
                ) : null}
                <div className="mt-4 flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-semibold text-ink">{template.title}</h3>
                    <span className="rounded-full bg-[#fff4e8] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-ember">
                      Na lixeira
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-stone-600">{formatTrashTime(template.purgeAt)}</p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setConfirmState({
                          title: "Recuperar template",
                          description:
                            "O template saira da lixeira e voltara para a sua area principal imediatamente.",
                          confirmLabel: "Recuperar",
                          action: () => {
                            void restoreMutation.mutateAsync(template.id).finally(() => setConfirmState(null));
                          },
                        });
                      }}
                    >
                      {restoreMutation.isPending ? "Recuperando..." : "Recuperar"}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setConfirmState({
                          title: "Excluir definitivamente",
                          description: `O template "${template.title}" sera removido de forma permanente.\n\nDepois desta etapa nao sera mais possivel recuperar este conteudo.`,
                          confirmLabel: "Excluir agora",
                          tone: "danger",
                          action: () => {
                            void deleteMutation.mutateAsync(template.id).finally(() => setConfirmState(null));
                          },
                        });
                      }}
                    >
                      {deleteMutation.isPending ? "Excluindo..." : "Excluir agora"}
                    </Button>
                  </div>
                </div>
              </Panel>
            ))}
          </div>
        ) : (
          <Panel variant="soft">
            <p className="text-stone-600">
              Sua lixeira esta vazia. Quando voce remover um template, ele fica aqui por 24 horas.
            </p>
          </Panel>
        )}
      </section>

      <div aria-hidden="true" className="h-20 md:hidden" />
    </div>
  );
}

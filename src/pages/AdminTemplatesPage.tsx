import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AdminSectionNav } from "@/components/admin/AdminSectionNav";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Panel } from "@/components/ui/Panel";
import {
  deleteAdminTemplatePermanently,
  listAdminTemplates,
  restoreAdminTemplate,
  setUserTemplateVisibility,
  trashAdminTemplate,
} from "@/services/admin";
import { formatTemplateStatusLabel } from "@/lib/payment-flow";

function formatTrashTime(purgeAt?: string | null) {
  if (!purgeAt) {
    return "Aguardando exclusao";
  }

  const remainingMs = new Date(purgeAt).getTime() - Date.now();
  if (remainingMs <= 0) {
    return "Expira a qualquer momento";
  }

  const totalHours = Math.floor(remainingMs / (1000 * 60 * 60));
  return totalHours > 0 ? `Expira em ${totalHours}h` : "Expira em menos de 1h";
}

function getAdminTrashConfirmationMessage(template: {
  title: string;
  status: string;
  shareSlug?: string;
  isPublic: boolean;
}) {
  if (template.status === "published" || template.shareSlug || template.isPublic) {
    return `Este template ja esta publicado ou com link ativo. Ao mover "${template.title}" para a lixeira, o link publico sera desativado imediatamente.\n\nO template ainda podera ser recuperado por 24 horas.\n\nDeseja continuar?`;
  }

  return `Mover "${template.title}" para a lixeira?\n\nO template ficara recuperavel por 24 horas antes da exclusao definitiva.`;
}

export function AdminTemplatesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "draft" | "pending_payment" | "published">("all");
  const [mode, setMode] = useState<"all" | "full_frame" | "overlay_logo">("all");
  const [visibility, setVisibility] = useState<"all" | "public" | "private">("all");
  const [trash, setTrash] = useState<"active" | "trash" | "all">("active");
  const [confirmState, setConfirmState] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    tone?: "default" | "danger";
    action: () => void;
  } | null>(null);

  const filters = useMemo(
    () => ({ search, status, mode, visibility, trash }),
    [mode, search, status, trash, visibility],
  );

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-templates", filters],
    queryFn: () => listAdminTemplates(filters),
  });

  const refreshAdminTemplates = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-templates"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] }),
      queryClient.refetchQueries({ queryKey: ["admin-templates"], type: "active" }),
    ]);
  };

  const mutation = useMutation({
    mutationFn: ({ templateId, isPublic }: { templateId: string; isPublic: boolean }) =>
      setUserTemplateVisibility(templateId, isPublic),
    onSuccess: refreshAdminTemplates,
  });

  const trashMutation = useMutation({
    mutationFn: (templateId: string) => trashAdminTemplate(templateId),
    onSuccess: refreshAdminTemplates,
  });

  const restoreMutation = useMutation({
    mutationFn: (templateId: string) => restoreAdminTemplate(templateId),
    onSuccess: refreshAdminTemplates,
  });

  const deleteMutation = useMutation({
    mutationFn: (templateId: string) => deleteAdminTemplatePermanently(templateId),
    onSuccess: refreshAdminTemplates,
  });

  const isConfirmBusy =
    mutation.isPending || trashMutation.isPending || restoreMutation.isPending || deleteMutation.isPending;

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

      <div>
        <p className="text-sm uppercase tracking-[0.18em] text-ember">Admin</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-ink">Templates</h1>
      </div>

      <AdminSectionNav />

      <Panel className="grid gap-3 md:grid-cols-5">
        <input
          className="rounded-2xl border border-stone-300 bg-white px-4 py-3"
          placeholder="Buscar por titulo, slug ou autor"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select className="rounded-2xl border border-stone-300 bg-white px-4 py-3" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
          <option value="all">Todos os status</option>
          <option value="draft">Rascunho</option>
          <option value="pending_payment">Pagamento</option>
          <option value="published">Publicado</option>
        </select>
        <select className="rounded-2xl border border-stone-300 bg-white px-4 py-3" value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}>
          <option value="all">Todos os modos</option>
          <option value="full_frame">Moldura</option>
          <option value="overlay_logo">Logo</option>
        </select>
        <select className="rounded-2xl border border-stone-300 bg-white px-4 py-3" value={visibility} onChange={(event) => setVisibility(event.target.value as typeof visibility)}>
          <option value="all">Toda visibilidade</option>
          <option value="public">Publico</option>
          <option value="private">Privado</option>
        </select>
        <select className="rounded-2xl border border-stone-300 bg-white px-4 py-3" value={trash} onChange={(event) => setTrash(event.target.value as typeof trash)}>
          <option value="active">Ativos</option>
          <option value="trash">Lixeira</option>
          <option value="all">Todos</option>
        </select>
      </Panel>

      <Panel className="overflow-hidden p-0">
        <div className="space-y-3 p-4 md:hidden">
          {isLoading ? (
            <div className="rounded-[22px] border border-stone-200 bg-white/80 px-4 py-4 text-sm text-stone-500">
              Carregando templates...
            </div>
          ) : data.length ? (
            data.map((row) => (
              <div
                key={row.id}
                className="rounded-[22px] border border-stone-200 bg-white/88 p-4 shadow-[0_16px_30px_-26px_rgba(17,24,39,0.24)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-ink">{row.title}</div>
                    <div className="mt-1 text-sm text-stone-500">
                      {row.shareSlug ? `/t/${row.shareSlug}` : "Sem link publico"}
                    </div>
                  </div>
                  <div className="rounded-full bg-stone-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-600">
                    {row.templateMode === "full_frame" ? "Moldura" : "Logo"}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.16em] text-stone-500">Autor</div>
                    <div className="mt-1 text-ink">{row.ownerName}</div>
                    <div className="text-stone-500">{row.ownerEmail}</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.16em] text-stone-500">Status</div>
                    <div className="mt-1 text-ink">
                      {row.isTrashed ? (
                        <span>
                          Na lixeira
                          <span className="block text-xs text-stone-500">{formatTrashTime(row.purgeAt)}</span>
                        </span>
                      ) : (
                        formatTemplateStatusLabel(row.status)
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.16em] text-stone-500">Views</div>
                    <div className="mt-1 font-semibold text-ink">{row.viewsCount}</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.16em] text-stone-500">Downloads</div>
                    <div className="mt-1 font-semibold text-ink">{row.downloadsCount}</div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {!row.isTrashed ? (
                    <>
                      <Link to={`/editor/${row.id}`}>
                        <Button variant="secondary">Abrir</Button>
                      </Link>
                      {row.shareSlug ? (
                        <Link to={`/t/${row.shareSlug}`}>
                          <Button variant="ghost">Link</Button>
                        </Link>
                      ) : null}
                      <Button
                        variant="secondary"
                        onClick={() => void mutation.mutateAsync({ templateId: row.id, isPublic: !row.isPublic })}
                      >
                        {row.isPublic ? "Despublicar" : "Reativar"}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setConfirmState({
                            title: "Mover para a lixeira",
                            description: getAdminTrashConfirmationMessage(row),
                            confirmLabel: "Mover template",
                            action: () => {
                              void trashMutation.mutateAsync(row.id).finally(() => setConfirmState(null));
                            },
                          });
                        }}
                      >
                        Lixeira
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setConfirmState({
                            title: "Recuperar template",
                            description:
                              "O template saira da lixeira e voltara para a lista principal imediatamente.",
                            confirmLabel: "Recuperar",
                            action: () => {
                              void restoreMutation.mutateAsync(row.id).finally(() => setConfirmState(null));
                            },
                          });
                        }}
                      >
                        Recuperar
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setConfirmState({
                            title: "Excluir definitivamente",
                            description: `O template "${row.title}" sera removido de forma permanente.\n\nDepois desta etapa nao sera mais possivel recuperar este conteudo.`,
                            confirmLabel: "Excluir agora",
                            tone: "danger",
                            action: () => {
                              void deleteMutation.mutateAsync(row.id).finally(() => setConfirmState(null));
                            },
                          });
                        }}
                      >
                        Excluir agora
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[22px] border border-stone-200 bg-white/80 px-4 py-4 text-sm text-stone-500">
              Nenhum template encontrado.
            </div>
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-stone-100 text-stone-600">
              <tr>
                <th className="px-4 py-3">Template</th>
                <th className="px-4 py-3">Autor</th>
                <th className="px-4 py-3">Modo</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Views</th>
                <th className="px-4 py-3">Downloads</th>
                <th className="px-4 py-3">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-4 py-4 text-stone-500" colSpan={7}>
                    Carregando templates...
                  </td>
                </tr>
              ) : data.length ? (
                data.map((row) => (
                  <tr key={row.id} className="border-t border-stone-200">
                    <td className="px-4 py-4">
                      <div className="font-semibold text-ink">{row.title}</div>
                      <div className="text-stone-500">{row.shareSlug ? `/t/${row.shareSlug}` : "Sem link publico"}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div>{row.ownerName}</div>
                      <div className="text-stone-500">{row.ownerEmail}</div>
                    </td>
                    <td className="px-4 py-4">{row.templateMode === "full_frame" ? "Moldura" : "Logo"}</td>
                    <td className="px-4 py-4">
                      {row.isTrashed ? (
                        <div>
                          <div className="font-medium text-ink">Na lixeira</div>
                          <div className="text-xs text-stone-500">{formatTrashTime(row.purgeAt)}</div>
                        </div>
                      ) : (
                        formatTemplateStatusLabel(row.status)
                      )}
                    </td>
                    <td className="px-4 py-4">{row.viewsCount}</td>
                    <td className="px-4 py-4">{row.downloadsCount}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        {!row.isTrashed ? (
                          <>
                            <Link to={`/editor/${row.id}`}>
                              <Button variant="secondary">Abrir</Button>
                            </Link>
                            {row.shareSlug ? (
                              <Link to={`/t/${row.shareSlug}`}>
                                <Button variant="ghost">Link</Button>
                              </Link>
                            ) : null}
                            <Button
                              variant="secondary"
                              onClick={() => void mutation.mutateAsync({ templateId: row.id, isPublic: !row.isPublic })}
                            >
                              {row.isPublic ? "Despublicar" : "Reativar"}
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => {
                                setConfirmState({
                                  title: "Mover para a lixeira",
                                  description: getAdminTrashConfirmationMessage(row),
                                  confirmLabel: "Mover template",
                                  action: () => {
                                    void trashMutation.mutateAsync(row.id).finally(() => setConfirmState(null));
                                  },
                                });
                              }}
                            >
                              Lixeira
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="secondary"
                              onClick={() => {
                                setConfirmState({
                                  title: "Recuperar template",
                                  description:
                                    "O template saira da lixeira e voltara para a lista principal imediatamente.",
                                  confirmLabel: "Recuperar",
                                  action: () => {
                                    void restoreMutation.mutateAsync(row.id).finally(() => setConfirmState(null));
                                  },
                                });
                              }}
                            >
                              Recuperar
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => {
                                setConfirmState({
                                  title: "Excluir definitivamente",
                                  description: `O template "${row.title}" sera removido de forma permanente.\n\nDepois desta etapa nao sera mais possivel recuperar este conteudo.`,
                                  confirmLabel: "Excluir agora",
                                  tone: "danger",
                                  action: () => {
                                    void deleteMutation.mutateAsync(row.id).finally(() => setConfirmState(null));
                                  },
                                });
                              }}
                            >
                              Excluir agora
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-4 text-stone-500" colSpan={7}>
                    Nenhum template encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

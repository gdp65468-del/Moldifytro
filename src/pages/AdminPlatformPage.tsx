import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminSectionNav } from "@/components/admin/AdminSectionNav";
import { UploadField } from "@/components/editor/UploadField";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Panel } from "@/components/ui/Panel";
import { buildAbsoluteUrl, copyTextWithFallback, getPlatformTemplatePublicPath } from "@/lib/share";
import {
  createAdminPlatformTemplate,
  deleteAdminPlatformTemplate,
  listAdminPlatformTemplates,
  togglePlatformTemplate,
  updatePlatformTemplate,
} from "@/services/admin";
import { compressImageFile, fileToDataUrl } from "@/lib/image";
import { isAllowedFrameSize, isFrameFile } from "@/utils/validators";

export function AdminPlatformPage() {
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-platform-templates"],
    queryFn: listAdminPlatformTemplates,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newImageDataUrl, setNewImageDataUrl] = useState<string>("");
  const [newMessage, setNewMessage] = useState<string>("");
  const [copiedTemplateId, setCopiedTemplateId] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    tone?: "default" | "danger";
    action: () => void;
  } | null>(null);

  const toggleMutation = useMutation({
    mutationFn: ({ templateId, isActive }: { templateId: string; isActive: boolean }) =>
      togglePlatformTemplate(templateId, isActive),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-platform-templates"] });
      await queryClient.invalidateQueries({ queryKey: ["platform-templates"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ templateId, nextTitle, nextCategory }: { templateId: string; nextTitle: string; nextCategory: string }) =>
      updatePlatformTemplate(templateId, { title: nextTitle, category: nextCategory }),
    onSuccess: async () => {
      setEditingId(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-platform-templates"] });
      await queryClient.invalidateQueries({ queryKey: ["platform-templates"] });
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!newTitle.trim()) {
        throw new Error("Informe o titulo da moldura.");
      }

      if (!newCategory.trim()) {
        throw new Error("Informe a categoria da moldura.");
      }

      if (!newImageDataUrl) {
        throw new Error("Envie a imagem da moldura (PNG ou WebP).");
      }

      return createAdminPlatformTemplate({
        title: newTitle.trim(),
        category: newCategory.trim(),
        imageDataUrl: newImageDataUrl,
      });
    },
    onSuccess: async () => {
      setNewTitle("");
      setNewCategory("");
      setNewImageDataUrl("");
      setNewMessage("Moldura criada com sucesso e liberada para todos os usuarios.");
      await queryClient.invalidateQueries({ queryKey: ["admin-platform-templates"] });
      await queryClient.invalidateQueries({ queryKey: ["platform-templates"] });
    },
    onError: (error) => {
      setNewMessage(error instanceof Error ? error.message : "Nao foi possivel criar a moldura.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (templateId: string) => deleteAdminPlatformTemplate(templateId),
    onSuccess: async (result) => {
      if (result.detachedTemplates > 0) {
        setNewMessage(
          `Moldura excluida com sucesso. ${result.detachedTemplates} template(s) existente(s) foram preservados.`,
        );
      } else {
        setNewMessage("Moldura excluida com sucesso.");
      }
      await queryClient.invalidateQueries({ queryKey: ["admin-platform-templates"] });
      await queryClient.invalidateQueries({ queryKey: ["platform-templates"] });
    },
    onError: (error) => {
      setNewMessage(error instanceof Error ? error.message : "Nao foi possivel excluir a moldura.");
    },
  });

  async function handleSharePlatformTemplate(platformTemplateId: string) {
    try {
      await copyTextWithFallback(buildAbsoluteUrl(getPlatformTemplatePublicPath(platformTemplateId)));
      setCopiedTemplateId(platformTemplateId);
      setNewMessage("Link publico copiado com sucesso.");
      window.setTimeout(() => {
        setCopiedTemplateId((current) => (current === platformTemplateId ? null : current));
      }, 1800);
    } catch {
      setNewMessage("Nao foi possivel copiar o link publico desta moldura.");
    }
  }

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <ConfirmModal
        open={Boolean(confirmState)}
        title={confirmState?.title ?? ""}
        description={confirmState?.description ?? ""}
        confirmLabel={confirmState?.confirmLabel ?? "Confirmar"}
        tone={confirmState?.tone ?? "default"}
        busy={deleteMutation.isPending}
        onClose={() => setConfirmState(null)}
        onConfirm={() => {
          confirmState?.action();
        }}
      />

      <div>
        <p className="text-sm uppercase tracking-[0.18em] text-ember">Admin</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-ink">Molduras da plataforma</h1>
      </div>

      <AdminSectionNav />

      <Panel className="space-y-4">
        <h2 className="text-xl font-semibold text-ink">Nova moldura da plataforma</h2>
        <p className="text-sm text-stone-600">
          A moldura criada aqui fica disponivel para todos os usuarios no dashboard.
        </p>

        <div className="grid gap-3 md:grid-cols-2">
          <input
            className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3"
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
            placeholder="Titulo da moldura"
          />
          <input
            className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3"
            value={newCategory}
            onChange={(event) => setNewCategory(event.target.value)}
            placeholder="Categoria (ex.: esporte)"
          />
        </div>

        <UploadField
          title="Upload da moldura"
          subtitle="Use PNG ou WebP transparente. O arquivo e otimizado antes do envio."
          accept="image/png,image/webp"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!isFrameFile(file)) {
              setNewMessage("Envie um arquivo PNG ou WebP valido.");
              return;
            }

            if (!isAllowedFrameSize(file)) {
              setNewMessage("Arquivo grande demais. Use ate 12 MB.");
              return;
            }

            const optimized = await compressImageFile(file as File, {
              maxWidth: 1600,
              maxHeight: 1600,
              mimeType: "image/webp",
              quality: 0.88,
              skipBelowBytes: 1.5 * 1024 * 1024,
            });

            if (optimized.size < (file as File).size) {
              setNewMessage("Imagem otimizada para reduzir trafego.");
            }

            setNewImageDataUrl(await fileToDataUrl(optimized));
          }}
        />

        {newImageDataUrl ? (
          <div className="w-full max-w-[260px] rounded-[22px] border border-stone-200 bg-stone-50/80 p-4">
            <img
              src={newImageDataUrl}
              alt="Preview da nova moldura"
              className="mx-auto aspect-[4/5] w-full max-w-[180px] rounded-[18px] object-contain"
            />
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => void createMutation.mutateAsync()} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Criando..." : "Criar moldura"}
          </Button>
          {newImageDataUrl ? (
            <Button variant="secondary" onClick={() => setNewImageDataUrl("")}>
              Limpar imagem
            </Button>
          ) : null}
        </div>

        {newMessage ? (
          <p className="text-sm text-stone-700">{newMessage}</p>
        ) : null}
      </Panel>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
          <Panel>Carregando molduras da plataforma...</Panel>
        ) : (
          data.map((template) => (
            <Panel key={template.id} className="p-4">
              <div className="rounded-[24px] border border-stone-200 bg-stone-50/80 p-4">
                <img
                  src={template.thumbnailUrl}
                  alt={template.title}
                  className="mx-auto aspect-[4/5] w-full max-w-[220px] rounded-[18px] object-contain"
                />
              </div>

              {editingId === template.id ? (
                <div className="mt-4 space-y-3">
                  <input
                    className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                  <input
                    className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3"
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() =>
                        void updateMutation.mutateAsync({
                          templateId: template.id,
                          nextTitle: title,
                          nextCategory: category,
                        })
                      }
                    >
                      Salvar
                    </Button>
                    <Button variant="secondary" onClick={() => setEditingId(null)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="mt-4 text-lg font-semibold text-ink">{template.title}</h2>
                  <p className="mt-1 text-sm text-stone-600">Categoria: {template.category}</p>
                  <p className="mt-1 text-sm text-stone-600">
                    Status: {template.isActive ? "Ativa" : "Desativada"}
                  </p>
                  <p className="mt-1 text-sm text-stone-600">
                    Views / Downloads: {template.viewsCount} / {template.downloadsCount}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setEditingId(template.id);
                        setTitle(template.title);
                        setCategory(template.category);
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      onClick={() =>
                        void toggleMutation.mutateAsync({
                          templateId: template.id,
                          isActive: !template.isActive,
                        })
                      }
                    >
                      {template.isActive ? "Desativar" : "Ativar"}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => void handleSharePlatformTemplate(template.id)}
                    >
                      {copiedTemplateId === template.id ? "Link copiado" : "Compartilhar"}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setConfirmState({
                          title: "Excluir moldura da plataforma",
                          description: `A moldura "${template.title}" sera removida da plataforma.\n\nSe ela ja tiver sido usada por usuarios, os templates existentes continuarao funcionando, mas a moldura saira da vitrine para novos usos.`,
                          confirmLabel: "Excluir moldura",
                          tone: "danger",
                          action: () => {
                            void deleteMutation.mutateAsync(template.id).finally(() => setConfirmState(null));
                          },
                        });
                      }}
                    >
                      Excluir
                    </Button>
                  </div>
                </>
              )}
            </Panel>
          ))
        )}
      </div>
    </div>
  );
}

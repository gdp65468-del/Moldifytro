import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import QRCode from "qrcode";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { useAuth } from "@/hooks/useAuth";
import {
  formatPaymentStatusLabel,
  formatTemplateStatusLabel,
  getPaymentFlowState,
} from "@/lib/payment-flow";
import { createCheckout, getLatestPayment } from "@/services/payments";
import { getUserTemplate, publishTemplate } from "@/services/templates";

export function PublishPage() {
  const { templateId } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [message, setMessage] = useState<string>();
  const [messageTone, setMessageTone] = useState<"info" | "success" | "error">("info");

  const { data: template } = useQuery({
    queryKey: ["template", templateId],
    queryFn: () => getUserTemplate(templateId as string),
    enabled: Boolean(templateId),
  });

  const { data: payment } = useQuery({
    queryKey: ["payment", templateId, user?.id],
    queryFn: () => getLatestPayment(templateId as string, user?.id as string),
    enabled: Boolean(templateId && user?.id),
  });

  const checkoutMutation = useMutation({
    mutationFn: (options?: { forceNew?: boolean }) =>
      createCheckout(templateId as string, user?.id as string, options),
    onSuccess: async (nextPayment) => {
      setMessageTone("success");
      setMessage("Checkout criado. Redirecionando para o pagamento...");
      await queryClient.invalidateQueries({ queryKey: ["payment", templateId, user?.id] });
      if (nextPayment.checkoutUrl) {
        window.location.assign(nextPayment.checkoutUrl);
      }
    },
    onError: (error) => {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Nao foi possivel iniciar o pagamento.");
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => publishTemplate(templateId as string),
    onSuccess: async (published) => {
      setMessageTone("success");
      setMessage("Template publicado com sucesso.");
      await queryClient.invalidateQueries({ queryKey: ["template", templateId] });
      await queryClient.invalidateQueries({ queryKey: ["user-templates", user?.id] });
      await queryClient.invalidateQueries({ queryKey: ["public-template", published.shareSlug] });
    },
    onError: (error) => {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Nao foi possivel publicar template.");
    },
  });

  const shareUrl = useMemo(() => {
    if (!template?.shareSlug) {
      return "";
    }

    if (typeof window === "undefined") {
      return `/t/${template.shareSlug}`;
    }

    return `${window.location.origin}/t/${template.shareSlug}`;
  }, [template?.shareSlug]);

  useEffect(() => {
    if (!shareUrl) {
      setQrCodeUrl("");
      return;
    }

    void QRCode.toDataURL(shareUrl, {
      width: 220,
      margin: 1,
      color: {
        dark: "#14100f",
        light: "#f8f3ea",
      },
    }).then(setQrCodeUrl);
  }, [shareUrl]);

  if (!template) {
    return <Panel>Template nao encontrado.</Panel>;
  }

  const flow = getPaymentFlowState(template, payment);
  const templateTitle = template.title;
  const messageClassName =
    messageTone === "error"
      ? "border-red-200 bg-red-50 text-red-900"
      : messageTone === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
        : "border-orange-200 bg-orange-50 text-orange-900";
  const detailItems = [
    { label: "Modo", value: template.templateMode === "full_frame" ? "Moldura completa" : "Logo sobreposta" },
    { label: "Pagamento", value: formatPaymentStatusLabel(payment?.status) },
    { label: "Preco", value: "R$ 5,90" },
  ];
  const shareText =
    "Abra este link para criar seu proprio filtro, ajustar sua foto e baixar a arte pronta em segundos no Moldify.";

  async function handleCopyLink() {
    if (!shareUrl) {
      return;
    }

    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function handleShareLink() {
    if (!shareUrl) {
      return;
    }

    if (navigator.share) {
      await navigator.share({
        title: templateTitle,
        text: shareText,
        url: shareUrl,
      });
      return;
    }

    await handleCopyLink();
  }

  function handlePrimaryAction() {
    if (flow.primaryAction === "create_checkout") {
      setMessageTone("info");
      setMessage("Criando checkout e preparando pagamento...");
      void checkoutMutation.mutateAsync({ forceNew: false });
      return;
    }

    if (flow.primaryAction === "continue_checkout" && payment?.checkoutUrl) {
      window.location.assign(payment.checkoutUrl);
      return;
    }

    if (flow.primaryAction === "publish_template") {
      setMessageTone("info");
      setMessage("Publicando template...");
      void publishMutation.mutateAsync();
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Panel
        variant="hero"
        size="md"
        className="bg-[radial-gradient(circle_at_top_left,rgba(204,95,26,0.16),transparent_34%),linear-gradient(145deg,rgba(255,249,241,0.98),rgba(255,255,255,0.94))]"
      >
        <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          {template.thumbnailUrl ? (
            <div className="rounded-[26px] border border-white/90 bg-white/84 p-3 shadow-[0_24px_52px_-34px_rgba(22,19,18,0.22)]">
              <img
                src={template.thumbnailUrl}
                alt={templateTitle}
                className="mx-auto aspect-[3/4] w-full max-w-[220px] rounded-[20px] object-contain"
              />
            </div>
          ) : null}

          <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-ember">Publicacao</p>
                <h1 className="mt-1.5 font-display text-3xl font-bold text-ink sm:text-4xl">{templateTitle}</h1>
              </div>
              <span className="rounded-full bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-700">
                {formatTemplateStatusLabel(template.status)}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {detailItems.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[20px] border border-white/90 bg-white/82 px-3.5 py-3 shadow-[0_18px_42px_-34px_rgba(22,19,18,0.16)]"
                >
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                    {item.label}
                  </div>
                  <div className="mt-1.5 text-sm font-medium text-ink">{item.value}</div>
                </div>
              ))}
            </div>

            <div className="rounded-[20px] border border-white/90 bg-white/78 px-4 py-3 text-sm leading-5 text-stone-600">
              Organize o pagamento, acompanhe o status e libere o link publico sem sair desta etapa.
            </div>
          </div>
        </div>
      </Panel>

      {message ? (
        <Panel variant="compact" className={`p-4 text-sm ${messageClassName}`}>
          {message}
        </Panel>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Panel variant="compact" className="p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-stone-500">Visualizacoes</div>
          <div className="mt-2 text-3xl font-semibold text-ink">{template.viewsCount ?? 0}</div>
        </Panel>
        <Panel variant="compact" className="p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-stone-500">Downloads</div>
          <div className="mt-2 text-3xl font-semibold text-ink">{template.downloadsCount ?? 0}</div>
        </Panel>
        <Panel variant="compact" className="p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-stone-500">Publicado em</div>
          <div className="mt-2 text-base font-semibold text-ink">
            {template.publishedAt ? new Date(template.publishedAt).toLocaleDateString("pt-BR") : "Ainda nao"}
          </div>
        </Panel>
      </div>

      <Panel variant="soft" className="space-y-5">
        {flow.kind === "published" ? (
          <>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-ink">{flow.heading}</h2>
                <p className="mt-2 text-stone-600">{flow.body}</p>
              </div>
              <div className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-700">
                Link liberado
              </div>
            </div>
            <div className="rounded-[24px] border border-white/90 bg-white/86 p-4 text-sm text-stone-700 break-all">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                Envie este link para outras pessoas criarem o proprio filtro
              </div>
              {shareUrl}
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to={`/t/${template.shareSlug}`}>
                <Button>Abrir pagina publica</Button>
              </Link>
              <Button variant="secondary" onClick={() => void handleCopyLink()}>
                {copied ? "Link copiado" : "Copiar link"}
              </Button>
              <Button variant="secondary" onClick={() => void handleShareLink()}>
                Compartilhar link
              </Button>
            </div>

            <div className="grid gap-6 rounded-[28px] border border-white/90 bg-white/84 p-5 md:grid-cols-[220px_1fr]">
              <div className="mx-auto w-full max-w-[220px] rounded-[24px] bg-paper p-3 shadow-[0_18px_40px_-32px_rgba(22,19,18,0.16)]">
                {qrCodeUrl ? (
                  <img src={qrCodeUrl} alt={`QR code para ${templateTitle}`} className="w-full rounded-2xl" />
                ) : (
                  <div className="aspect-square w-full animate-pulse rounded-2xl bg-stone-200" />
                )}
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-ink">QR code pronto para divulgar</h3>
                <p className="text-sm text-stone-600">
                  Ideal para story, banner, cartaz ou bio. Ao escanear, o visitante abre direto o editor do
                  template no celular.
                </p>
                <p className="text-sm text-stone-600">
                  Estatisticas basicas vao subindo conforme as pessoas abrem o link e baixam a arte final.
                </p>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-ink">{flow.heading}</h2>
              <p className="text-stone-600">{flow.body}</p>
            </div>
            {flow.primaryLabel ? (
              <Button
                onClick={handlePrimaryAction}
                disabled={checkoutMutation.isPending || publishMutation.isPending}
              >
                {checkoutMutation.isPending && flow.primaryAction !== "publish_template"
                  ? "Preparando pagamento..."
                  : publishMutation.isPending && flow.primaryAction === "publish_template"
                    ? "Publicando..."
                    : flow.primaryLabel}
              </Button>
            ) : null}
          </>
        )}
      </Panel>
    </div>
  );
}

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { useAuth } from "@/hooks/useAuth";
import { formatPaymentStatusLabel, getPaymentFlowState } from "@/lib/payment-flow";
import { createCheckout, getLatestPayment } from "@/services/payments";
import { getUserTemplate } from "@/services/templates";

type FeedbackTone = "info" | "success" | "error";

function getMessageClassName(tone: FeedbackTone) {
  if (tone === "error") {
    return "border-red-200 bg-red-50 text-red-900";
  }

  if (tone === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  }

  return "border-orange-200 bg-orange-50 text-orange-900";
}

export function CheckoutPage() {
  const { templateId } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string>();
  const [messageTone, setMessageTone] = useState<FeedbackTone>("info");

  const { data: template } = useQuery({
    queryKey: ["template", templateId],
    queryFn: () => getUserTemplate(templateId as string),
    enabled: Boolean(templateId),
  });

  const { data: payment, refetch: refetchPayment, isFetching: paymentRefreshing } = useQuery({
    queryKey: ["payment", templateId, user?.id],
    queryFn: () => getLatestPayment(templateId as string, user?.id as string),
    enabled: Boolean(templateId && user?.id),
  });

  const checkoutMutation = useMutation({
    mutationFn: (options?: { forceNew?: boolean }) =>
      createCheckout(templateId as string, user?.id as string, options),
    onSuccess: async (nextPayment) => {
      setMessageTone("success");
      setMessage("Checkout pronto. Voce pode seguir para o Asaas agora.");
      await queryClient.invalidateQueries({ queryKey: ["payment", templateId, user?.id] });
      if (nextPayment.checkoutUrl) {
        window.location.assign(nextPayment.checkoutUrl);
      }
    },
    onError: (error) => {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Nao foi possivel criar checkout.");
    },
  });

  if (!template) {
    return <Panel>Template nao encontrado.</Panel>;
  }

  const flow = getPaymentFlowState(template, payment);

  function handlePrimaryAction() {
    if (flow.primaryAction === "create_checkout") {
      setMessageTone("info");
      setMessage("Criando checkout...");
      void checkoutMutation.mutateAsync({ forceNew: false });
      return;
    }

    if (flow.primaryAction === "continue_checkout" && payment?.checkoutUrl) {
      window.location.assign(payment.checkoutUrl);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Panel
        variant="hero"
        size="md"
        className="bg-[radial-gradient(circle_at_top_left,rgba(204,95,26,0.16),transparent_34%),linear-gradient(145deg,rgba(255,249,241,0.98),rgba(255,255,255,0.94))]"
      >
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-ember">Checkout</p>
            <h1 className="mt-1.5 font-display text-3xl font-bold text-ink sm:text-4xl">Pagamento de apoio</h1>
            <p className="mt-2 max-w-xl text-sm leading-5 text-stone-600">
              Esta tela existe como apoio. O fluxo principal continua na publicacao, mas voce ainda pode
              acompanhar o status daqui.
            </p>
          </div>
          <div className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink shadow-[0_14px_32px_-24px_rgba(22,19,18,0.25)]">
            R$ 5,90
          </div>
        </div>

        <div className="mt-4 rounded-[20px] border border-white/90 bg-white/82 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-medium text-ink">{template.title}</span>
            <span className="rounded-full bg-[#f8efe2] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-stone-700">
              {formatPaymentStatusLabel(payment?.status)}
            </span>
          </div>
        </div>
      </Panel>

      {message ? (
        <Panel variant="compact" className={`p-4 text-sm ${getMessageClassName(messageTone)}`}>
          {message}
        </Panel>
      ) : null}

      <Panel variant="soft" className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-ink">{flow.heading}</h2>
          <p className="mt-2 text-stone-600">{flow.body}</p>
        </div>

        {flow.kind === "approved" ? (
          <Link to={`/publish/${template.id}`}>
            <Button>Ir para publicacao</Button>
          </Link>
        ) : flow.primaryLabel ? (
          <Button onClick={handlePrimaryAction} disabled={checkoutMutation.isPending}>
            {checkoutMutation.isPending ? "Preparando..." : flow.primaryLabel}
          </Button>
        ) : null}

        {flow.kind === "pending" ? (
          <div className="space-y-3 pt-2 text-sm">
            <button
              type="button"
              className="text-sm font-medium text-stone-500 underline underline-offset-4 transition hover:text-ember"
              onClick={() => {
                setMessageTone("info");
                setMessage("Gerando novo checkout...");
                void checkoutMutation.mutateAsync({ forceNew: true });
              }}
              disabled={checkoutMutation.isPending}
            >
              {flow.recoveryLabel}
            </button>
            <button
              type="button"
              className="block text-sm font-medium text-stone-500 underline underline-offset-4 transition hover:text-ember"
              onClick={() => {
                setMessageTone("info");
                setMessage("Atualizando status do pagamento...");
                void refetchPayment().then(() => {
                  setMessageTone("success");
                  setMessage("Status atualizado.");
                });
              }}
              disabled={paymentRefreshing}
            >
              {paymentRefreshing ? "Atualizando..." : "Atualizar status"}
            </button>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}

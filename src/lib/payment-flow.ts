import type { PaymentRecord } from "@/types/payment";
import type { UserTemplate } from "@/types/template";

export type PaymentFlowKind = "pay" | "pending" | "approved" | "published";
export type PaymentFlowAction = "create_checkout" | "continue_checkout" | "publish_template" | "none";

export interface PaymentFlowState {
  kind: PaymentFlowKind;
  heading: string;
  body: string;
  primaryLabel?: string;
  primaryAction: PaymentFlowAction;
  recoveryLabel?: string;
}

export function getPaymentFlowState(
  template: Pick<UserTemplate, "status" | "shareSlug">,
  payment: PaymentRecord | null | undefined,
): PaymentFlowState {
  if (template.status === "published" && template.shareSlug) {
    return {
      kind: "published",
      heading: "Template publicado",
      body: "Seu link publico ja esta ativo. Agora voce pode divulgar e acompanhar os resultados.",
      primaryAction: "none",
    };
  }

  if (payment?.status === "approved") {
    return {
      kind: "approved",
      heading: "Pagamento aprovado",
      body: "O template esta pronto para ser liberado e receber um link compartilhavel.",
      primaryLabel: "Publicar agora",
      primaryAction: "publish_template",
    };
  }

  if (payment?.status === "pending" && payment.checkoutUrl) {
    return {
      kind: "pending",
      heading: "Pagamento pendente",
      body: "Seu checkout ja foi criado. Continue o pagamento direto no Asaas.",
      primaryLabel: "Continuar pagamento",
      primaryAction: "continue_checkout",
      recoveryLabel: "Problemas com este link? Gerar novo checkout",
    };
  }

  return {
    kind: "pay",
    heading: "Liberar pagamento",
    body: "Conclua o pagamento para publicar o template e gerar o link compartilhavel.",
    primaryLabel: "Pagar agora",
    primaryAction: "create_checkout",
  };
}

export function formatPaymentStatusLabel(status?: PaymentRecord["status"] | null) {
  switch (status) {
    case "approved":
      return "Aprovado";
    case "pending":
      return "Pendente";
    case "rejected":
      return "Recusado";
    default:
      return "Nao iniciado";
  }
}

export function formatTemplateStatusLabel(status: UserTemplate["status"]) {
  switch (status) {
    case "published":
      return "Publicado";
    case "pending_payment":
      return "Pagamento pendente";
    default:
      return "Rascunho";
  }
}

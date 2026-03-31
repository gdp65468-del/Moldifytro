import { onRequest } from "firebase-functions/v2/https";
import { adminDb } from "./admin";
import { asaasApiKey } from "./config";

type AsaasWebhookPayload = {
  event?: string;
  payment?: {
    id?: string;
    status?: string;
    externalReference?: string;
    checkoutSession?: string;
  };
  checkout?: {
    id?: string;
    externalReference?: string;
    status?: string;
  };
};

function mapAsaasStatusToLocal(status?: string) {
  const normalized = (status ?? "").toUpperCase();
  if (["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH", "OVERDUE_RECEIVED", "REFUNDED_PARTIALLY"].includes(normalized)) {
    return "approved" as const;
  }

  if (["REFUNDED", "CHARGEBACK_REQUESTED", "CHARGEBACK_DISPUTE", "CHARGEBACK_REVERSED", "DELETED", "CANCELED"].includes(normalized)) {
    return "rejected" as const;
  }

  return "pending" as const;
}

async function findLatestAsaasPaymentDoc(payload: AsaasWebhookPayload) {
  const paymentId = payload.payment?.id;
  const checkoutId = payload.checkout?.id ?? payload.payment?.checkoutSession;
  const templateId = payload.payment?.externalReference ?? payload.checkout?.externalReference;

  if (paymentId) {
    const byPaymentId = await adminDb
      .collection("payments")
      .where("provider", "==", "asaas")
      .where("asaasPaymentId", "==", paymentId)
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();
    if (!byPaymentId.empty) {
      return byPaymentId.docs[0];
    }
  }

  if (checkoutId) {
    const byCheckoutId = await adminDb
      .collection("payments")
      .where("provider", "==", "asaas")
      .where("asaasCheckoutId", "==", checkoutId)
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();
    if (!byCheckoutId.empty) {
      return byCheckoutId.docs[0];
    }
  }

  if (templateId) {
    const byTemplate = await adminDb
      .collection("payments")
      .where("provider", "==", "asaas")
      .where("templateId", "==", templateId)
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();
    if (!byTemplate.empty) {
      return byTemplate.docs[0];
    }
  }

  return undefined;
}

export const asaasWebhook = onRequest(
  { secrets: [asaasApiKey] },
  async (request, response) => {
    try {
      const payload = (request.body ?? {}) as AsaasWebhookPayload;
      const latest = await findLatestAsaasPaymentDoc(payload);
      if (!latest) {
        response.status(200).send("ignored");
        return;
      }

      const nextStatus = mapAsaasStatusToLocal(payload.payment?.status ?? payload.checkout?.status);
      await latest.ref.set(
        {
          status: nextStatus,
          updatedAt: new Date().toISOString(),
          asaasPaymentId: payload.payment?.id,
          asaasEvent: payload.event,
        },
        { merge: true },
      );

      response.status(200).send("ok");
    } catch (error) {
      console.error(error);
      response.status(500).send("error");
    }
  },
);

// Alias para evitar quebrar webhooks antigos que ainda apontam para o endpoint legado.
export const mercadopagoWebhook = asaasWebhook;

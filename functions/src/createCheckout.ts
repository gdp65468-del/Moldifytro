import { HttpsError, onCall } from "firebase-functions/v2/https";
import { adminDb } from "./admin";
import { appBaseUrl, asaasApiBaseUrl, asaasApiKey } from "./config";

type AsaasCheckoutItem = {
  name: string;
  quantity: number;
  value: number;
  description?: string;
};

type AsaasCheckoutRequest = {
  billingTypes: Array<"PIX" | "CREDIT_CARD">;
  chargeTypes: Array<"DETACHED">;
  items: AsaasCheckoutItem[];
  callback: {
    successUrl: string;
    autoRedirect?: boolean;
  };
  customerData?: {
    name?: string;
    email?: string;
  };
  externalReference: string;
  expiresAt?: string;
};

type AsaasCheckoutResponse = {
  id?: string;
  url?: string;
};

async function createAsaasCheckout(body: AsaasCheckoutRequest): Promise<AsaasCheckoutResponse> {
  const response = await fetch(`${asaasApiBaseUrl.value()}/checkouts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      access_token: asaasApiKey.value(),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new HttpsError("internal", `Asaas checkout falhou: ${errorBody.slice(0, 220)}`);
  }

  return (await response.json()) as AsaasCheckoutResponse;
}

export const createCheckout = onCall(
  { secrets: [asaasApiKey, appBaseUrl] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Login necessario.");
    }

    const templateId = String(request.data?.templateId ?? "");
    if (!templateId) {
      throw new HttpsError("invalid-argument", "templateId obrigatorio.");
    }

    const templateRef = adminDb.collection("user_templates").doc(templateId);
    const templateSnapshot = await templateRef.get();

    if (!templateSnapshot.exists) {
      throw new HttpsError("not-found", "Template nao encontrado.");
    }

    const template = templateSnapshot.data();
    if (template?.ownerId !== request.auth.uid) {
      throw new HttpsError("permission-denied", "Voce nao pode iniciar checkout para este template.");
    }

    const userSnapshot = await adminDb.collection("users").doc(request.auth.uid).get();
    const userData = userSnapshot.data() as { name?: string; email?: string } | undefined;
    const baseUrl = appBaseUrl.value();

    const checkout = await createAsaasCheckout({
      billingTypes: ["PIX", "CREDIT_CARD"],
      chargeTypes: ["DETACHED"],
      externalReference: templateId,
      items: [
        {
          name: `Publicacao do template ${template?.title ?? templateId}`,
          quantity: 1,
          value: 5.9,
        },
      ],
      callback: {
        successUrl: `${baseUrl}/publish/${templateId}`,
        autoRedirect: true,
      },
      customerData: {
        name: userData?.name,
        email: userData?.email,
      },
    });

    const paymentRecord = {
      userId: request.auth.uid,
      templateId,
      provider: "asaas",
      amount: 5.9,
      status: "pending",
      checkoutUrl: checkout.url ?? (checkout.id ? `${asaasApiBaseUrl.value()}/checkout/${checkout.id}` : undefined),
      asaasCheckoutId: checkout.id,
      createdAt: new Date().toISOString(),
    };

    const paymentRef = await adminDb.collection("payments").add(paymentRecord);

    return {
      payment: {
        id: paymentRef.id,
        ...paymentRecord,
      },
    };
  },
);

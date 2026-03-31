import "../_shared/edge-runtime.d.ts";
import { handleCors } from "../_shared/cors.ts";
import { getAdminClient, json, requireUser } from "../_shared/supabase.ts";

type AsaasCheckoutResponse = {
  id?: string;
  url?: string;
};

function normalizeAppBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

function toCheckoutItemName(templateTitle: string) {
  const base = `Template ${templateTitle}`.trim();
  return base.length <= 30 ? base : `${base.slice(0, 27).trim()}...`;
}

function buildHostedCheckoutBase(apiBase: string) {
  return apiBase.includes("sandbox") ? "https://sandbox.asaas.com" : "https://www.asaas.com";
}

function buildCheckoutUrl(apiBase: string, checkoutId?: string, providedUrl?: string | null) {
  if (providedUrl && /\?id=/.test(providedUrl)) {
    return providedUrl;
  }

  if (providedUrl && checkoutId && /checkoutSession\/show/.test(providedUrl)) {
    return `${providedUrl.replace(/\?id=.*$/, "")}?id=${checkoutId}`;
  }

  if (!checkoutId) {
    return providedUrl ?? null;
  }

  return `${buildHostedCheckoutBase(apiBase)}/checkoutSession/show?id=${checkoutId}`;
}

async function createAsaasCheckout(templateId: string, templateTitle: string) {
  const apiBase = Deno.env.get("ASAAS_API_BASE_URL") ?? "https://api.asaas.com/v3";
  const apiKey = Deno.env.get("ASAAS_API_KEY");
  const appBaseUrl = Deno.env.get("APP_BASE_URL");
  if (!apiKey || !appBaseUrl) {
    throw new Error("Secrets Asaas/APP_BASE_URL nao configurados.");
  }

  const baseUrl = normalizeAppBaseUrl(appBaseUrl);
  const response = await fetch(`${apiBase}/checkouts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      access_token: apiKey,
    },
    body: JSON.stringify({
      billingTypes: ["PIX", "CREDIT_CARD"],
      chargeTypes: ["DETACHED"],
      externalReference: templateId,
      items: [{ name: toCheckoutItemName(templateTitle), quantity: 1, value: 5.9 }],
      callback: {
        successUrl: `${baseUrl}/publish/${templateId}`,
        cancelUrl: `${baseUrl}/publish/${templateId}`,
        expiredUrl: `${baseUrl}/publish/${templateId}`,
        autoRedirect: true,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Asaas checkout falhou: ${(await response.text()).slice(0, 240)}`);
  }

  const checkout = (await response.json()) as AsaasCheckoutResponse;
  return {
    id: checkout.id,
    checkoutUrl: buildCheckoutUrl(apiBase, checkout.id, checkout.url ?? null),
  };
}

Deno.serve(async (request: Request) => {
  const cors = handleCors(request);
  if (cors) return cors;

  try {
    const { user } = await requireUser(request);
    const { templateId, forceNew } = await request.json().catch(() => ({ templateId: undefined, forceNew: false }));
    const admin = getAdminClient();

    const { data: template, error: templateError } = await admin
      .from("user_templates")
      .select("*")
      .eq("id", String(templateId))
      .maybeSingle();

    if (templateError || !template) {
      throw new Error("Template nao encontrado.");
    }

    if (template.owner_id !== user.id) {
      throw new Error("Template pertence a outro usuario.");
    }

    if (template.deleted_at) {
      throw new Error("Template esta na lixeira. Recupere antes de gerar o checkout.");
    }

    if (!forceNew) {
      const { data: existingPayment } = await admin
        .from("payments")
        .select("*")
        .eq("template_id", template.id)
        .eq("user_id", user.id)
        .eq("status", "pending")
        .not("checkout_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingPayment) {
        return json({
          payment: {
            id: existingPayment.id,
            userId: existingPayment.user_id,
            templateId: existingPayment.template_id,
            provider: existingPayment.provider,
            amount: Number(existingPayment.amount),
            status: existingPayment.status,
            checkoutUrl: existingPayment.checkout_url ?? undefined,
            createdAt: existingPayment.created_at,
            updatedAt: existingPayment.updated_at ?? undefined,
          },
        });
      }
    }

    const checkout = await createAsaasCheckout(String(template.id), String(template.title ?? template.id));

    const paymentInsert = {
      user_id: user.id,
      template_id: template.id,
      provider: "asaas",
      amount: 5.9,
      status: "pending",
      checkout_url: checkout.checkoutUrl,
      asaas_checkout_id: checkout.id ?? null,
    };

    const { data: payment, error: paymentError } = await admin
      .from("payments")
      .insert(paymentInsert)
      .select("*")
      .single();

    if (paymentError || !payment) {
      throw new Error("Nao foi possivel registrar pagamento.");
    }

    await admin
      .from("user_templates")
      .update({
        status: "pending_payment",
        updated_at: new Date().toISOString(),
      })
      .eq("id", template.id);

    return json({
      payment: {
        id: payment.id,
        userId: payment.user_id,
        templateId: payment.template_id,
        provider: payment.provider,
        amount: Number(payment.amount),
        status: payment.status,
        checkoutUrl: payment.checkout_url ?? undefined,
        createdAt: payment.created_at,
        updatedAt: payment.updated_at ?? undefined,
      },
    });
  } catch (error) {
    return json({ error: (error as Error).message }, 401);
  }
});

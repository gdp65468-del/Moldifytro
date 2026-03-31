import { handleCors } from "../_shared/cors.ts";
import { getAdminClient, json } from "../_shared/supabase.ts";

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
  if (["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH", "OVERDUE_RECEIVED", "PAID"].includes(normalized)) {
    return "approved";
  }

  if (["REFUNDED", "CHARGEBACK_REQUESTED", "CHARGEBACK_DISPUTE", "DELETED", "CANCELED"].includes(normalized)) {
    return "rejected";
  }

  return "pending";
}

Deno.serve(async (request) => {
  const cors = handleCors(request);
  if (cors) return cors;

  try {
    const expectedToken = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
    if (expectedToken) {
      const provided = request.headers.get("asaas-access-token");
      if (provided !== expectedToken) {
        return json({ error: "forbidden" }, 403);
      }
    }

    const payload = (await request.json().catch(() => ({}))) as AsaasWebhookPayload;
    const admin = getAdminClient();
    const paymentId = payload.payment?.id;
    const checkoutId = payload.checkout?.id ?? payload.payment?.checkoutSession;
    const templateId = payload.payment?.externalReference ?? payload.checkout?.externalReference;

    let target: { id: string; template_id?: string } | null = null;

    if (paymentId) {
      const { data } = await admin
        .from("payments")
        .select("id, template_id")
        .eq("asaas_payment_id", paymentId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      target = data;
    }

    if (!target && checkoutId) {
      const { data } = await admin
        .from("payments")
        .select("id, template_id")
        .eq("asaas_checkout_id", checkoutId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      target = data;
    }

    if (!target && templateId) {
      const { data } = await admin
        .from("payments")
        .select("id, template_id")
        .eq("template_id", templateId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      target = data;
    }

    if (!target) {
      return json({ status: "ignored" });
    }

    const localStatus = mapAsaasStatusToLocal(payload.payment?.status ?? payload.checkout?.status);

    await admin
      .from("payments")
      .update({
        status: localStatus,
        updated_at: new Date().toISOString(),
        asaas_payment_id: paymentId ?? null,
        asaas_event: payload.event ?? null,
      })
      .eq("id", target.id);

    if (target.template_id) {
      await admin
        .from("user_templates")
        .update({
          status: localStatus === "rejected" ? "draft" : "pending_payment",
          updated_at: new Date().toISOString(),
        })
        .eq("id", target.template_id);
    }

    return json({ status: "ok" });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});

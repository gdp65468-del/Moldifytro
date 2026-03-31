import { invokeSupabaseFunction } from "@/services/functions";
import { mapPaymentRow } from "@/services/mappers";
import { supabase, assertSupabaseEnabled } from "@/services/supabase";

export async function getLatestPayment(templateId: string, userId: string) {
  assertSupabaseEnabled();

  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("template_id", templateId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error("Nao foi possivel carregar pagamento.");
  }

  return data ? mapPaymentRow(data as Record<string, unknown>) : null;
}

export async function createCheckout(templateId: string, _userId: string, options?: { forceNew?: boolean }) {
  assertSupabaseEnabled();
  void _userId;

  const data = await invokeSupabaseFunction<{ payment?: Record<string, unknown> }>("create-checkout", {
    templateId,
    forceNew: options?.forceNew ?? false,
  });

  const payment = data?.payment;
  if (!payment) {
    throw new Error("Resposta invalida do checkout.");
  }

  return mapPaymentRow(payment);
}

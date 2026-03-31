import { handleCors } from "../_shared/cors.ts";
import { assertAdmin, getAdminClient, json, requireUser } from "../_shared/supabase.ts";

Deno.serve(async (request) => {
  const cors = handleCors(request);
  if (cors) return cors;

  try {
    const { user } = await requireUser(request);
    await assertAdmin(user.id);
    const admin = getAdminClient();
    const filters = (await request.json().catch(() => ({}))) as {
      search?: string;
      status?: string;
    };

    const [paymentsRes, usersRes, templatesRes] = await Promise.all([
      admin.from("payments").select("*"),
      admin.from("users").select("id,name,email"),
      admin.from("user_templates").select("id,title"),
    ]);

    const users = usersRes.data ?? [];
    const templates = templatesRes.data ?? [];

    let rows = (paymentsRes.data ?? []).map((item) => {
      const template = templates.find((t) => t.id === item.template_id);
      const paymentUser = users.find((u) => u.id === item.user_id);
      return {
        id: item.id,
        userId: item.user_id,
        userName: paymentUser?.name ?? "Criador",
        userEmail: paymentUser?.email ?? "-",
        templateId: item.template_id,
        templateTitle: template?.title ?? "Template",
        amount: Number(item.amount ?? 0),
        status: item.status,
        provider: item.provider,
        createdAt: String(item.created_at ?? ""),
      };
    });

    if (filters.status && filters.status !== "all") {
      rows = rows.filter((item) => item.status === filters.status);
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      rows = rows.filter((item) => {
        const haystack = `${item.userName} ${item.userEmail} ${item.templateTitle}`.toLowerCase();
        return haystack.includes(search);
      });
    }

    rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return json(rows);
  } catch (error) {
    return json({ error: (error as Error).message }, 401);
  }
});


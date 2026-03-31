import { handleCors } from "../_shared/cors.ts";
import { assertAdmin, getAdminClient, json, requireUser } from "../_shared/supabase.ts";

Deno.serve(async (request) => {
  const cors = handleCors(request);
  if (cors) return cors;

  try {
    const { user } = await requireUser(request);
    await assertAdmin(user.id);
    const admin = getAdminClient();

    const [usersRes, templatesRes, paymentsRes] = await Promise.all([
      admin.from("users").select("*"),
      admin.from("user_templates").select("*"),
      admin.from("payments").select("*"),
    ]);

    const users = usersRes.data ?? [];
    const templates = templatesRes.data ?? [];
    const payments = paymentsRes.data ?? [];

    const totalViews = templates.reduce((sum, item) => sum + Number(item.views_count ?? 0), 0);
    const totalDownloads = templates.reduce((sum, item) => sum + Number(item.downloads_count ?? 0), 0);
    const approvedPayments = payments.filter((item) => item.status === "approved");

    const recentTemplates = templates
      .sort((a, b) => String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? "")))
      .slice(0, 6)
      .map((item) => {
        const owner = users.find((u) => u.id === item.owner_id);
        return {
          id: item.id,
          ownerId: item.owner_id,
          ownerName: owner?.name ?? "Criador",
          ownerEmail: owner?.email ?? "-",
          title: item.title,
          templateMode: item.template_mode,
          status: item.status,
          isPublic: Boolean(item.is_public),
          shareSlug: item.share_slug ?? undefined,
          thumbnailUrl: item.thumbnail_url ?? undefined,
          viewsCount: Number(item.views_count ?? 0),
          downloadsCount: Number(item.downloads_count ?? 0),
          updatedAt: String(item.updated_at ?? ""),
        };
      });

    return json({
      totalUsers: users.length,
      totalTemplates: templates.length,
      publishedTemplates: templates.filter((item) => item.status === "published").length,
      totalViews,
      totalDownloads,
      approvedPayments: approvedPayments.length,
      pendingOrFailedPayments: payments.filter((item) => item.status !== "approved").length,
      revenueTotal: approvedPayments.reduce((sum, item) => sum + Number(item.amount ?? 0), 0),
      recentTemplates,
    });
  } catch (error) {
    return json({ error: (error as Error).message }, 401);
  }
});


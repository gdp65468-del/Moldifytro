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
      mode?: string;
      visibility?: string;
      trash?: string;
    };

    await admin.rpc("purge_expired_user_templates").catch(() => null);

    const [templatesRes, usersRes] = await Promise.all([
      admin.from("user_templates").select("*"),
      admin.from("users").select("id,name,email"),
    ]);

    const users = usersRes.data ?? [];
    let rows = (templatesRes.data ?? []).map((item) => {
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
        deletedAt: item.deleted_at ?? null,
        purgeAt: item.purge_at ?? null,
        isTrashed: Boolean(item.deleted_at),
      };
    });

    if (filters.trash === "active") {
      rows = rows.filter((item) => !item.isTrashed);
    }

    if (filters.trash === "trash") {
      rows = rows.filter((item) => item.isTrashed);
    }

    if (filters.status && filters.status !== "all") {
      rows = rows.filter((item) => item.status === filters.status);
    }

    if (filters.mode && filters.mode !== "all") {
      rows = rows.filter((item) => item.templateMode === filters.mode);
    }

    if (filters.visibility === "public") {
      rows = rows.filter((item) => item.isPublic);
    }

    if (filters.visibility === "private") {
      rows = rows.filter((item) => !item.isPublic);
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      rows = rows.filter((item) => {
        const haystack = `${item.title} ${item.ownerName} ${item.ownerEmail} ${item.shareSlug ?? ""}`.toLowerCase();
        return haystack.includes(search);
      });
    }

    rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return json(rows);
  } catch (error) {
    return json({ error: (error as Error).message }, 401);
  }
});

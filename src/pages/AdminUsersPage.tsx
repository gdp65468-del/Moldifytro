import { useQuery } from "@tanstack/react-query";
import { AdminSectionNav } from "@/components/admin/AdminSectionNav";
import { Panel } from "@/components/ui/Panel";
import { listAdminUsers } from "@/services/admin";

export function AdminUsersPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: listAdminUsers,
  });

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <div>
        <p className="text-sm uppercase tracking-[0.18em] text-ember">Admin</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-ink">Usuarios</h1>
      </div>

      <AdminSectionNav />

      <Panel className="overflow-hidden p-0">
        <div className="space-y-3 p-4 md:hidden">
          {isLoading ? (
            <div className="rounded-[22px] border border-stone-200 bg-white/80 px-4 py-4 text-sm text-stone-500">
              Carregando usuarios...
            </div>
          ) : data.length ? (
            data.map((row) => (
              <div key={row.id} className="rounded-[22px] border border-stone-200 bg-white/88 p-4 shadow-[0_16px_30px_-26px_rgba(17,24,39,0.24)]">
                <div className="font-semibold text-ink">{row.name}</div>
                <div className="mt-1 text-sm text-stone-500">{row.email}</div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-[18px] bg-stone-50 px-3 py-3">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-stone-500">Templates</div>
                    <div className="mt-1 text-lg font-semibold text-ink">{row.templatesCount}</div>
                  </div>
                  <div className="rounded-[18px] bg-stone-50 px-3 py-3">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-stone-500">Publicados</div>
                    <div className="mt-1 text-lg font-semibold text-ink">{row.publishedTemplatesCount}</div>
                  </div>
                  <div className="rounded-[18px] bg-stone-50 px-3 py-3">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-stone-500">Downloads</div>
                    <div className="mt-1 text-lg font-semibold text-ink">{row.totalDownloads}</div>
                  </div>
                  <div className="rounded-[18px] bg-stone-50 px-3 py-3">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-stone-500">Criado em</div>
                    <div className="mt-1 text-sm font-medium text-ink">
                      {new Date(row.createdAt).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[22px] border border-stone-200 bg-white/80 px-4 py-4 text-sm text-stone-500">
              Nenhum usuario encontrado.
            </div>
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-stone-100 text-stone-600">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Templates</th>
                <th className="px-4 py-3">Publicados</th>
                <th className="px-4 py-3">Downloads</th>
                <th className="px-4 py-3">Criado em</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-4 py-4 text-stone-500" colSpan={6}>
                    Carregando usuarios...
                  </td>
                </tr>
              ) : data.length ? (
                data.map((row) => (
                  <tr key={row.id} className="border-t border-stone-200">
                    <td className="px-4 py-4 font-semibold text-ink">{row.name}</td>
                    <td className="px-4 py-4">{row.email}</td>
                    <td className="px-4 py-4">{row.templatesCount}</td>
                    <td className="px-4 py-4">{row.publishedTemplatesCount}</td>
                    <td className="px-4 py-4">{row.totalDownloads}</td>
                    <td className="px-4 py-4">{new Date(row.createdAt).toLocaleDateString("pt-BR")}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-4 text-stone-500" colSpan={6}>
                    Nenhum usuario encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

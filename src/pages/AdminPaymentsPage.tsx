import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminSectionNav } from "@/components/admin/AdminSectionNav";
import { Panel } from "@/components/ui/Panel";
import { listAdminPayments } from "@/services/admin";

export function AdminPaymentsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const filters = useMemo(() => ({ search, status }), [search, status]);

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-payments", filters],
    queryFn: () => listAdminPayments(filters),
  });

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <div>
        <p className="text-sm uppercase tracking-[0.18em] text-ember">Admin</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-ink">Pagamentos</h1>
      </div>

      <AdminSectionNav />

      <Panel className="grid gap-3 md:grid-cols-2">
        <input
          className="rounded-2xl border border-stone-300 bg-white px-4 py-3"
          placeholder="Buscar por usuario ou template"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select className="rounded-2xl border border-stone-300 bg-white px-4 py-3" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
          <option value="all">Todos os status</option>
          <option value="approved">Aprovado</option>
          <option value="pending">Pendente</option>
          <option value="rejected">Rejeitado</option>
        </select>
      </Panel>

      <Panel className="overflow-hidden p-0">
        <div className="space-y-3 p-4 md:hidden">
          {isLoading ? (
            <div className="rounded-[22px] border border-stone-200 bg-white/80 px-4 py-4 text-sm text-stone-500">
              Carregando pagamentos...
            </div>
          ) : data.length ? (
            data.map((row) => (
              <div key={row.id} className="rounded-[22px] border border-stone-200 bg-white/88 p-4 shadow-[0_16px_30px_-26px_rgba(17,24,39,0.24)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-ink">{row.userName}</div>
                    <div className="text-sm text-stone-500">{row.userEmail}</div>
                  </div>
                  <div className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-stone-600">
                    {row.status}
                  </div>
                </div>
                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.16em] text-stone-500">Template</div>
                    <div className="mt-1 text-ink">{row.templateTitle}</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.16em] text-stone-500">Valor</div>
                    <div className="mt-1 font-semibold text-ink">
                      {row.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.16em] text-stone-500">Provider</div>
                    <div className="mt-1 text-ink">{row.provider}</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.16em] text-stone-500">Data</div>
                    <div className="mt-1 text-ink">{new Date(row.createdAt).toLocaleString("pt-BR")}</div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[22px] border border-stone-200 bg-white/80 px-4 py-4 text-sm text-stone-500">
              Nenhum pagamento encontrado.
            </div>
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-stone-100 text-stone-600">
              <tr>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Template</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Data</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-4 py-4 text-stone-500" colSpan={6}>
                    Carregando pagamentos...
                  </td>
                </tr>
              ) : data.length ? (
                data.map((row) => (
                  <tr key={row.id} className="border-t border-stone-200">
                    <td className="px-4 py-4">
                      <div>{row.userName}</div>
                      <div className="text-stone-500">{row.userEmail}</div>
                    </td>
                    <td className="px-4 py-4">{row.templateTitle}</td>
                    <td className="px-4 py-4">
                      {row.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </td>
                    <td className="px-4 py-4">{row.status}</td>
                    <td className="px-4 py-4">{row.provider}</td>
                    <td className="px-4 py-4">{new Date(row.createdAt).toLocaleString("pt-BR")}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-4 text-stone-500" colSpan={6}>
                    Nenhum pagamento encontrado.
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

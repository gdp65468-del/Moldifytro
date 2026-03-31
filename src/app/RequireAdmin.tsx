import { Navigate, Outlet, useLocation } from "react-router-dom";
import { StatusPanel } from "@/components/ui/StatusPanel";
import { useAuth } from "@/hooks/useAuth";

export function RequireAdmin() {
  const { user, loading, adminLoading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading || adminLoading) {
    return (
      <div className="mx-auto max-w-2xl py-8">
        <StatusPanel
          title="Conferindo acesso administrativo"
          description="Validando permissoes da sua conta antes de liberar a area admin."
          loading
        />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ redirectTo: location.pathname }} />;
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-2xl">
        <StatusPanel
          title="Acesso administrativo necessario"
          description="Sua conta ainda nao esta liberada para a area admin. Entre com um usuario autorizado para continuar."
          tone="warning"
        />
      </div>
    );
  }

  return <Outlet />;
}

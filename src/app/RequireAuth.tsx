import { Navigate, Outlet, useLocation } from "react-router-dom";
import { StatusPanel } from "@/components/ui/StatusPanel";
import { useAuth } from "@/hooks/useAuth";

export function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl py-8">
        <StatusPanel
          title="Preparando seu acesso"
          description="Estamos confirmando sua sessao para abrir o painel com seguranca."
          loading
        />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ redirectTo: location.pathname }} />;
  }

  return <Outlet />;
}

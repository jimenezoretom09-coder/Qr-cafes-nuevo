import { PropsWithChildren } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../lib/auth-store";

export default function ProtectedRoute({
  permission,
  children,
}: PropsWithChildren<{ permission: string | string[] }>) {
  const user = useAuthStore((s) => s.user);
  const required = Array.isArray(permission) ? permission : [permission];

  if (!user) return <Navigate to="/" replace />;
  if (!required.some((p) => user.permissions.includes(p))) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100 text-center p-6">
        <div>
          <p className="text-xl font-semibold text-slate-700">No tienes acceso a esta sección</p>
          <p className="text-slate-500 mt-2">Tu rol ({user.roleName}) no tiene este permiso.</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

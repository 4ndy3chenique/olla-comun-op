import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { NombreRol } from "../types";

/** Sin sesión → /login; rol no permitido → /sin-acceso. */
export function RutaProtegida({ roles }: { roles: NombreRol[] }) {
  const { usuario } = useAuth();
  const ubicacion = useLocation();
  if (!usuario) return <Navigate to="/login" replace state={{ from: ubicacion.pathname }} />;
  if (!roles.includes(usuario.rol_nombre)) return <Navigate to="/sin-acceso" replace />;
  return <Outlet />;
}

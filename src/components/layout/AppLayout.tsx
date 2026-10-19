import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useConectividad } from "../../context/ConectividadContext";
import { OfflineSyncBadge } from "../offline/OfflineSyncBadge";
import { BannerDemo } from "../ui/BannerDemo";
import { Icono } from "../ui/Icono";
import { MODO_DEMO } from "../../services/operativo";
import { BottomNav } from "./BottomNav";
import { SideNav } from "./SideNav";

export function AppLayout() {
  const { usuario, sesionVencida, logout, rol } = useAuth();
  const { enLinea, pendientes } = useConectividad();
  const navegar = useNavigate();
  const { pathname } = useLocation();

  if (!usuario || !rol) return <Navigate to="/login" replace state={{ from: pathname }} />;

  return (
    <div className="min-h-screen bg-bg">
      <a href="#contenido-app" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-surface focus:px-4 focus:py-2">
        Saltar al contenido
      </a>
      <SideNav />

      <div className="lg:pl-64">
        {!enLinea && (
          <div role="status" className="flex items-center justify-center gap-2 border-b border-accent-light bg-accent-light px-4 py-2 text-center text-sm text-accent-dark">
            <Icono nombre="wifiOff" />
            Modo desconectado. Tus registros se guardan en el dispositivo y se envían al reconectar.
          </div>
        )}
        {sesionVencida && (
          <div role="alert" className="flex flex-wrap items-center justify-center gap-3 border-b border-danger bg-danger-light px-4 py-2 text-center text-sm text-danger">
            <Icono nombre="alerta" />
            Tu sesión venció.{pendientes > 0 ? ` Inicia sesión para sincronizar ${pendientes} pendiente${pendientes === 1 ? "" : "s"}.` : " Inicia sesión para continuar."}
            <button className="toque font-semibold underline" onClick={() => { logout(); navegar("/login", { state: { from: pathname } }); }}>
              Iniciar sesión
            </button>
          </div>
        )}
        <main id="contenido-app" className="mx-auto w-full max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-10">
          {MODO_DEMO && <div className="mb-4"><BannerDemo /></div>}
          <Outlet />
        </main>
      </div>

      <BottomNav />
      <OfflineSyncBadge />
    </div>
  );
}

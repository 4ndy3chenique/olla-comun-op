import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { CargandoVista } from "../components/ui/Estados";
import { useAuth } from "../context/AuthContext";
import { RutaProtegida } from "./RutaProtegida";
import { rutaPorRol } from "./redireccionPorRol";

const LoginPage = lazy(() => import("../features/auth/LoginPage"));
const SinAcceso = lazy(() => import("../features/auth/SinAccesoPage"));
const TableroFsmPage = lazy(() => import("../features/almacen/TableroFsmPage"));
const GuiaFormPage = lazy(() => import("../features/almacen/GuiaFormPage"));
const GuiaDetallePage = lazy(() => import("../features/almacen/GuiaDetallePage"));
const MenuSemanalPage = lazy(() => import("../features/almacen/MenuSemanalPage"));
const RutaPage = lazy(() => import("../features/transporte/RutaPage"));
const RecepcionPage = lazy(() => import("../features/transporte/RecepcionPage"));
const PadronPage = lazy(() => import("../features/padron/PadronPage"));
const BitacoraPage = lazy(() => import("../features/auditoria/BitacoraPage"));
const LiquidacionPage = lazy(() => import("../features/auditoria/LiquidacionPage"));
const ReportesPage = lazy(() => import("../features/auditoria/ReportesPage"));
const ColaPage = lazy(() => import("../features/cola/ColaSincronizacionPage"));

function Inicio() {
  const { usuario } = useAuth();
  return <Navigate to={usuario ? rutaPorRol(usuario.rol_nombre) : "/login"} replace />;
}

export function Rutas() {
  return (
    <Suspense fallback={<div className="p-6"><CargandoVista /></div>}>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/login" element={<LoginPage />} />

        <Route element={<AppLayout />}>
          <Route path="/sin-acceso" element={<SinAcceso />} />

          <Route element={<RutaProtegida roles={["ALMACENERO"]} />}>
            <Route path="/almacen" element={<TableroFsmPage />} />
            <Route path="/almacen/guias/nueva" element={<GuiaFormPage />} />
            <Route path="/almacen/guias/:id" element={<GuiaDetallePage />} />
            <Route path="/almacen/menu" element={<MenuSemanalPage />} />
            <Route path="/almacen/padron" element={<PadronPage />} />
          </Route>

          <Route element={<RutaProtegida roles={["TRANSPORTISTA"]} />}>
            <Route path="/transporte" element={<RutaPage />} />
            <Route path="/transporte/recepcion" element={<RecepcionPage />} />
          </Route>

          <Route element={<RutaProtegida roles={["AUDITOR", "ADMINISTRADOR"]} />}>
            <Route path="/auditoria" element={<BitacoraPage />} />
            <Route path="/auditoria/liquidacion" element={<LiquidacionPage />} />
            <Route path="/auditoria/reportes" element={<ReportesPage />} />
            <Route path="/auditoria/menu" element={<MenuSemanalPage />} />
            <Route path="/auditoria/padron" element={<PadronPage />} />
          </Route>

          <Route element={<RutaProtegida roles={["ALMACENERO", "TRANSPORTISTA", "AUDITOR", "ADMINISTRADOR"]} />}>
            <Route path="/cola" element={<ColaPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Inicio />} />
      </Routes>
    </Suspense>
  );
}

import { Link } from "react-router-dom";
import { Icono, type NombreIcono } from "../ui/Icono";
import { useCola } from "../../hooks/useCola";
import { useOnline } from "../../hooks/useOnline";

/** Badge persistente de red: texto + icono + color (nunca solo color). Enlaza a la cola de sincronización. */
export function OfflineSyncBadge() {
  const enLinea = useOnline();
  const { pendientes, conError, sincronizando } = useCola();

  let icono: NombreIcono = "wifi";
  let texto = "En línea";
  let color = "bg-success-light text-success border-success";

  if (conError > 0) {
    icono = "alerta";
    texto = `${conError} con error`;
    color = "bg-danger-light text-danger border-danger";
  } else if (!enLinea) {
    icono = "wifiOff";
    texto = pendientes > 0 ? `Modo desconectado · ${pendientes} pendiente${pendientes === 1 ? "" : "s"}` : "Modo desconectado";
    color = "bg-accent-light text-accent-dark border-accent";
  } else if (sincronizando) {
    icono = "reloj";
    texto = "Sincronizando…";
    color = "bg-info-light text-info border-info";
  } else if (pendientes > 0) {
    icono = "bandeja";
    texto = `${pendientes} pendiente${pendientes === 1 ? "" : "s"}`;
    color = "bg-info-light text-info border-info";
  }

  return (
    <Link
      to="/cola"
      role="status"
      aria-live="polite"
      aria-label={`Estado de conexión: ${texto}. Abrir cola de sincronización`}
      className={`toque fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium shadow-sm lg:bottom-6 ${color}`}
    >
      <Icono nombre={icono} className="h-4 w-4" />
      {texto}
    </Link>
  );
}

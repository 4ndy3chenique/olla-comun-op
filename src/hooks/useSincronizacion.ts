import { useEffect } from "react";
import { EVENTO_SYNC_TERMINADA } from "../context/ConectividadContext";

/** Ejecuta `alTerminar` cada vez que una sincronización envió operaciones (para refrescar datos de la vista). */
export function useSincronizacion(alTerminar: () => void) {
  useEffect(() => {
    window.addEventListener(EVENTO_SYNC_TERMINADA, alTerminar);
    return () => window.removeEventListener(EVENTO_SYNC_TERMINADA, alTerminar);
  }, [alTerminar]);
}

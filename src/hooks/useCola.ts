import { useCallback, useEffect, useState } from "react";
import { EVENTO_COLA, listarCola, type OperacionCola } from "../lib/offline/cola";
import { useConectividad } from "../context/ConectividadContext";

/** Resumen en vivo de la cola (pendientes, errores, sincronizando). */
export function useCola() {
  const { pendientes, conError, sincronizando, total } = useConectividad();
  return { pendientes, conError, sincronizando, total };
}

/** Lista completa de operaciones locales (sin payload descifrado). */
export function useOperacionesCola() {
  const [ops, setOps] = useState<OperacionCola[]>([]);
  const cargar = useCallback(() => {
    listarCola().then(setOps).catch(() => setOps([]));
  }, []);
  useEffect(() => {
    cargar();
    window.addEventListener(EVENTO_COLA, cargar);
    return () => window.removeEventListener(EVENTO_COLA, cargar);
  }, [cargar]);
  return ops;
}

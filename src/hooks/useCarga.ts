import { useCallback, useEffect, useRef, useState } from "react";
import { guardarCache, leerCache } from "../lib/offline/cacheLectura";
import { ApiError, mensajeDeError } from "../services/http";
import { useSincronizacion } from "./useSincronizacion";

interface Estado<T> {
  datos: T | null;
  cargando: boolean;
  error: string | null;
  /** Fecha de los datos si provienen de la caché sin conexión. */
  deCache: Date | null;
}

/**
 * Carga de datos con lectura cifrada de respaldo: si no hay red y existe caché vigente (clave + ttl),
 * se muestran esos datos con la etiqueta "Datos al <fecha>". Se recarga al terminar una sincronización.
 */
export function useCarga<T>(clave: string | null, cargar: () => Promise<T>, ttl: number, deps: unknown[]) {
  const [estado, setEstado] = useState<Estado<T>>({ datos: null, cargando: true, error: null, deCache: null });
  const cargarRef = useRef(cargar);
  cargarRef.current = cargar;
  const [version, setVersion] = useState(0);

  const recargar = useCallback(() => setVersion((v) => v + 1), []);
  useSincronizacion(recargar);

  const clavesDeps = JSON.stringify(deps);
  useEffect(() => {
    let vigente = true;
    setEstado((e) => ({ ...e, cargando: true, error: null }));
    cargarRef.current()
      .then((datos) => {
        if (!vigente) return;
        setEstado({ datos, cargando: false, error: null, deCache: null });
        if (clave) void guardarCache(clave, datos, ttl);
      })
      .catch(async (e) => {
        if (!vigente) return;
        if (clave && e instanceof ApiError && e.esRed) {
          const c = await leerCache<T>(clave);
          if (c && vigente) return setEstado({ datos: c.datos, cargando: false, error: null, deCache: c.guardadoEn });
        }
        if (vigente) setEstado({ datos: null, cargando: false, error: mensajeDeError(e, "No pudimos cargar los datos."), deCache: null });
      });
    return () => { vigente = false; };
  }, [clave, ttl, clavesDeps, version]);

  return { ...estado, recargar };
}

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { EVENTO_COLA, resumenCola, type ResumenCola } from "../lib/offline/cola";
import { sincronizarCola } from "../lib/offline/sincronizador";
import { useAuth } from "./AuthContext";

interface Valor extends ResumenCola {
  enLinea: boolean;
  sincronizarAhora: () => Promise<void>;
}

const VACIO: ResumenCola = { total: 0, pendientes: 0, conError: 0, sincronizando: false };
const Ctx = createContext<Valor | undefined>(undefined);
export const EVENTO_SYNC_TERMINADA = "sincronizacion-terminada";

export function ConectividadProvider({ children }: { children: ReactNode }) {
  const { usuario, marcarSesionVencida } = useAuth();
  const [enLinea, setEnLinea] = useState(navigator.onLine);
  const [resumen, setResumen] = useState<ResumenCola>(VACIO);
  const usuarioId = usuario?.id ?? null;
  const usuarioRef = useRef(usuarioId);
  usuarioRef.current = usuarioId;

  const refrescar = useCallback(async () => {
    try {
      setResumen(await resumenCola());
    } catch {
      setResumen(VACIO); // IndexedDB no disponible
    }
  }, []);

  const sincronizarAhora = useCallback(async () => {
    const id = usuarioRef.current;
    if (id === null) return;
    try {
      const r = await sincronizarCola(id);
      if (r?.sesionVencida) marcarSesionVencida();
      if (r && r.enviadas > 0) window.dispatchEvent(new Event(EVENTO_SYNC_TERMINADA));
    } catch {
      /* el sincronizador ya deja el error en la operación */
    }
    await refrescar();
  }, [marcarSesionVencida, refrescar]);

  useEffect(() => {
    const online = () => { setEnLinea(true); void sincronizarAhora(); };
    const offline = () => setEnLinea(false);
    const foco = () => { if (document.visibilityState === "visible") void sincronizarAhora(); };
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    window.addEventListener(EVENTO_COLA, refrescar);
    document.addEventListener("visibilitychange", foco);
    const timer = setInterval(() => { if (navigator.onLine) void sincronizarAhora(); }, 30_000);
    void refrescar();
    void sincronizarAhora(); // al abrir la app / iniciar sesión
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
      window.removeEventListener(EVENTO_COLA, refrescar);
      document.removeEventListener("visibilitychange", foco);
      clearInterval(timer);
    };
  }, [usuarioId, sincronizarAhora, refrescar]);

  const valor = useMemo(() => ({ ...resumen, enLinea, sincronizarAhora }), [resumen, enLinea, sincronizarAhora]);
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react/only-export-components
export function useConectividad(): Valor {
  const c = useContext(Ctx);
  if (!c) throw new Error("useConectividad debe usarse dentro de <ConectividadProvider>");
  return c;
}

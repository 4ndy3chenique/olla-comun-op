import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  actualizarUsuarioGuardado, guardarSesion, leerExpiracion, leerUsuario, limpiarSesion,
} from "../lib/sesion";
import { loginReal } from "../services/auth";
import { USUARIOS_DEMO } from "../services/operativo/apiDemo";
import type { LoginInput, NombreRol, Usuario } from "../types";

interface AuthContextValue {
  usuario: Usuario | null;
  rol: NombreRol | null;
  tieneRol: (...roles: NombreRol[]) => boolean;
  /** true cuando el token venció o el servidor respondió 401. La cola offline se conserva. */
  sesionVencida: boolean;
  marcarSesionVencida: () => void;
  login: (input: LoginInput, recordarme?: boolean) => Promise<void>;
  loginDemo: (rol: keyof typeof USUARIOS_DEMO) => void;
  actualizarUsuario: (u: Usuario) => void;
  logout: () => void;
}

const Ctx = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(leerUsuario);
  const [sesionVencida, setSesionVencida] = useState(false);

  const logout = useCallback(() => {
    limpiarSesion(); // NO toca la cola ni el caché cifrado
    setUsuario(null);
    setSesionVencida(false);
  }, []);

  const marcarSesionVencida = useCallback(() => setSesionVencida(true), []);

  // El cliente HTTP emite este evento ante 401. Se conservan datos locales: solo se pide reautenticar.
  useEffect(() => {
    window.addEventListener("sesion-expirada", marcarSesionVencida);
    return () => window.removeEventListener("sesion-expirada", marcarSesionVencida);
  }, [marcarSesionVencida]);

  // Aviso al llegar la hora de expiración (hoy 12 h; objetivo 15 min).
  useEffect(() => {
    if (!usuario) return;
    const exp = leerExpiracion();
    if (!exp) return;
    const restante = new Date(exp).getTime() - Date.now();
    if (restante <= 0) { setSesionVencida(true); return; }
    const t = setTimeout(() => setSesionVencida(true), Math.min(restante, 2 ** 31 - 1));
    return () => clearTimeout(t);
  }, [usuario]);

  const login = useCallback(async (input: LoginInput, recordarme = true) => {
    const sesion = await loginReal(input);
    if (sesion.usuario.rol_nombre === "SOLICITANTE_DIRIGENTE") {
      throw new Error("Esta cuenta pertenece a la plataforma del solicitante, no a la operativa.");
    }
    guardarSesion(sesion, recordarme);
    setUsuario(sesion.usuario);
    setSesionVencida(false);
  }, []);

  const loginDemo = useCallback((rol: keyof typeof USUARIOS_DEMO) => {
    const u = { ...USUARIOS_DEMO[rol], olla_id: null, estado: "ACTIVO", created_at: null } as Usuario;
    guardarSesion({ usuario: u, access_token: "demo-" + rol, refresh_token: "demo-" + rol, expira_en: new Date(Date.now() + 12 * 3_600_000).toISOString() }, true);
    setUsuario(u);
    setSesionVencida(false);
  }, []);

  const actualizarUsuario = useCallback((u: Usuario) => {
    actualizarUsuarioGuardado(u);
    setUsuario(u);
  }, []);

  const valor = useMemo<AuthContextValue>(() => ({
    usuario, rol: usuario?.rol_nombre ?? null,
    tieneRol: (...roles) => !!usuario && roles.includes(usuario.rol_nombre),
    sesionVencida, marcarSesionVencida, login, loginDemo, actualizarUsuario, logout,
  }), [usuario, sesionVencida, marcarSesionVencida, login, loginDemo, actualizarUsuario, logout]);

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react/only-export-components
export function useAuth(): AuthContextValue {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return c;
}

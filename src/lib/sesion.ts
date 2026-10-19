/**
 * Persistencia de la sesión. Único lugar que toca localStorage/sessionStorage para el token.
 * "Recordar este dispositivo" → localStorage; si no, sessionStorage.
 */
import type { SesionAutenticada, Usuario } from "../types";

/** Hoy la API no tiene POST /auth/refresh (token opaco de 12 h). Si algún día existe, ponerlo en true. */
export const SOPORTA_REFRESH = false;

const KEY_USUARIO = "op_sesion_usuario";
const KEY_ACCESS = "op_access_token";
const KEY_REFRESH = "op_refresh_token";
const KEY_EXPIRA = "op_expira_en";
const CLAVES = [KEY_USUARIO, KEY_ACCESS, KEY_REFRESH, KEY_EXPIRA];

function leer(clave: string): string | null {
  try {
    return localStorage.getItem(clave) ?? sessionStorage.getItem(clave);
  } catch {
    return null;
  }
}

export function guardarSesion(s: SesionAutenticada, recordar: boolean) {
  const [destino, otro] = recordar ? [localStorage, sessionStorage] : [sessionStorage, localStorage];
  for (const k of CLAVES) otro.removeItem(k);
  destino.setItem(KEY_USUARIO, JSON.stringify(s.usuario));
  destino.setItem(KEY_ACCESS, s.access_token);
  destino.setItem(KEY_REFRESH, s.refresh_token);
  destino.setItem(KEY_EXPIRA, s.expira_en);
}

export function limpiarSesion() {
  for (const a of [localStorage, sessionStorage]) for (const k of CLAVES) a.removeItem(k);
}

export const leerToken = () => leer(KEY_ACCESS);
export const leerRefresh = () => leer(KEY_REFRESH);
export const leerExpiracion = () => leer(KEY_EXPIRA);

export function leerUsuario(): Usuario | null {
  const g = leer(KEY_USUARIO);
  if (!g) return null;
  try {
    return JSON.parse(g) as Usuario;
  } catch {
    limpiarSesion();
    return null;
  }
}

export function actualizarUsuarioGuardado(u: Usuario) {
  const almacen = localStorage.getItem(KEY_ACCESS) ? localStorage : sessionStorage;
  almacen.setItem(KEY_USUARIO, JSON.stringify(u));
}

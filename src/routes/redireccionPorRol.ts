import type { NombreRol } from "../types";

/** Prefijos de ruta permitidos por rol. */
export const PERMISOS: Record<NombreRol, string[]> = {
  ALMACENERO: ["/almacen", "/cola"],
  TRANSPORTISTA: ["/transporte", "/cola"],
  AUDITOR: ["/auditoria", "/cola"],
  ADMINISTRADOR: ["/auditoria", "/cola"],
  SOLICITANTE_DIRIGENTE: [],
};

export function rutaPorRol(rol: NombreRol): string {
  switch (rol) {
    case "ALMACENERO": return "/almacen";
    case "TRANSPORTISTA": return "/transporte";
    case "AUDITOR":
    case "ADMINISTRADOR": return "/auditoria";
    default: return "/sin-acceso";
  }
}

export const rutaPermitida = (rol: NombreRol, ruta: string) => PERMISOS[rol].some((p) => ruta === p || ruta.startsWith(p + "/"));

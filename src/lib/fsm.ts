import type { NombreRol } from "../types";

export type EstadoFsm = "PROGRAMADO" | "DESPACHADO" | "EN_TRANSITO" | "RECEPCIONADO";
export const ORDEN_FSM: EstadoFsm[] = ["PROGRAMADO", "DESPACHADO", "EN_TRANSITO", "RECEPCIONADO"];

export const ETIQUETA_FSM: Record<EstadoFsm, string> = {
  PROGRAMADO: "Programado",
  DESPACHADO: "Despachado",
  EN_TRANSITO: "En tránsito",
  RECEPCIONADO: "Recepcionado",
};

/** Solo se avanza un paso; no hay retrocesos ni saltos. */
export const TRANSICIONES: Record<EstadoFsm, EstadoFsm | null> = {
  PROGRAMADO: "DESPACHADO",
  DESPACHADO: "EN_TRANSITO",
  EN_TRANSITO: "RECEPCIONADO",
  RECEPCIONADO: null,
};

export const esTransicionValida = (de: EstadoFsm, a: EstadoFsm) => TRANSICIONES[de] === a;

/** Quién puede ejecutar cada transición. */
export const ROL_POR_TRANSICION: Record<string, NombreRol> = {
  "PROGRAMADO>DESPACHADO": "ALMACENERO",
  "DESPACHADO>EN_TRANSITO": "TRANSPORTISTA",
  "EN_TRANSITO>RECEPCIONADO": "TRANSPORTISTA",
};

export const puedeTransicionar = (rol: NombreRol, de: EstadoFsm, a: EstadoFsm) =>
  esTransicionValida(de, a) && ROL_POR_TRANSICION[`${de}>${a}`] === rol;

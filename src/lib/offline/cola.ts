/**
 * Cola de operaciones offline. Replica los campos lógicos de bd_operativa_central.cola_sincronizacion
 * (uuid_transaccion, tipo_transaccion, payload_json, estado, fecha_creacion_local, fecha_deteccion_reconexion).
 * El payload va cifrado (AES-GCM); los campos de índice quedan en claro.
 */
import type { TipoOperacion } from "../../types/operativo";
import { bdDelete, bdGet, bdGetAll, bdPut } from "./db";
import { cifrarJson, descifrarJson } from "./cifrado";

export type EstadoCola = "PENDIENTE" | "SINCRONIZANDO" | "ERROR" | "CONFLICTO";
export const MAX_INTENTOS = 5;
export const EVENTO_COLA = "cola-actualizada";

export interface OperacionCola {
  uuid: string; // UUIDv4 = uuid_transaccion (idempotencia)
  usuarioId: number;
  tipo: TipoOperacion;
  payloadCifrado: ArrayBuffer;
  iv: Uint8Array<ArrayBuffer>;
  creadoEn: string;
  reconexionDetectadaEn?: string;
  intentos: number;
  estado: EstadoCola;
  proximoIntento: number;
  ultimoError?: string;
}

const avisar = () => window.dispatchEvent(new Event(EVENTO_COLA));

export async function encolar(usuarioId: number, tipo: TipoOperacion, payload: unknown, uuid: string = crypto.randomUUID()) {
  const { iv, datos } = await cifrarJson(payload);
  const op: OperacionCola = {
    uuid, usuarioId, tipo, iv, payloadCifrado: datos,
    creadoEn: new Date().toISOString(), intentos: 0, estado: "PENDIENTE", proximoIntento: 0,
  };
  await bdPut("cola", op);
  avisar();
  return op;
}

export const listarCola = async () =>
  (await bdGetAll<OperacionCola>("cola")).sort((a, b) => a.creadoEn.localeCompare(b.creadoEn));

export const leerPayload = <T = unknown>(op: OperacionCola) => descifrarJson<T>({ iv: op.iv, datos: op.payloadCifrado });

export async function actualizarOperacion(uuid: string, cambios: Partial<OperacionCola>) {
  const op = await bdGet<OperacionCola>("cola", uuid);
  if (!op) return;
  await bdPut("cola", { ...op, ...cambios });
  avisar();
}

export async function eliminarOperacion(uuid: string) {
  await bdDelete("cola", uuid);
  avisar();
}

/** Devuelve a PENDIENTE las operaciones en ERROR (o la indicada). */
export async function reintentar(uuid?: string) {
  for (const op of await listarCola()) {
    if ((uuid ? op.uuid === uuid : op.estado === "ERROR")) {
      await bdPut("cola", { ...op, estado: "PENDIENTE", intentos: 0, proximoIntento: 0, ultimoError: undefined });
    }
  }
  avisar();
}

export interface ResumenCola { total: number; pendientes: number; conError: number; sincronizando: boolean }
export async function resumenCola(): Promise<ResumenCola> {
  const todas = await listarCola();
  return {
    total: todas.length,
    pendientes: todas.filter((o) => o.estado === "PENDIENTE" || o.estado === "SINCRONIZANDO").length,
    conError: todas.filter((o) => o.estado === "ERROR" || o.estado === "CONFLICTO").length,
    sincronizando: todas.some((o) => o.estado === "SINCRONIZANDO"),
  };
}

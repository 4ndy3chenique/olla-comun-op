/**
 * Escrituras con respaldo offline: se intenta la API; si no hay red (ApiError status 0 o navigator.onLine = false)
 * la operación se guarda cifrada en la cola con su UUIDv4 y se sincroniza al reconectar (idempotente por uuid).
 */
import { ApiError } from "../http";
import { encolar } from "../../lib/offline/cola";
import type { EstadoFsm } from "../../lib/fsm";
import type { EmitirGuiaInput, GuiaDetalle, RegistroEscaneoEnvio, ResultadoValidacion, TipoOperacion } from "../../types/operativo";
import { operativoApi } from ".";
import type { PayloadTransicion } from "./tipos";

export type ResultadoEscritura<T> = { encolada: false; resultado: T } | { encolada: true; uuid: string };

const sinRed = (e: unknown) => !navigator.onLine || (e instanceof ApiError && e.esRed);

async function conRespaldo<T>(
  usuarioId: number, tipo: TipoOperacion, uuid: string, payload: unknown, enviar: () => Promise<T>,
): Promise<ResultadoEscritura<T>> {
  if (navigator.onLine) {
    try {
      return { encolada: false, resultado: await enviar() };
    } catch (e) {
      if (!sinRed(e)) throw e;
    }
  }
  await encolar(usuarioId, tipo, payload, uuid);
  return { encolada: true, uuid };
}

export function emitirGuiaConCola(usuarioId: number, input: Omit<EmitirGuiaInput, "uuid">) {
  const uuid = crypto.randomUUID();
  const b: EmitirGuiaInput = { ...input, uuid };
  return conRespaldo<GuiaDetalle>(usuarioId, "EMISION_GUIA", uuid, b, () => operativoApi.emitirGuia(b));
}

export function transicionarConCola(usuarioId: number, guiaId: number, estado_destino: EstadoFsm) {
  const uuid = crypto.randomUUID();
  const p: PayloadTransicion = { guia_id: guiaId, uuid, estado_destino };
  return conRespaldo<GuiaDetalle>(usuarioId, "TRANSICION_FSM", uuid, p, () => operativoApi.transicionarGuia(guiaId, { uuid, estado_destino }));
}

export function registrarEscaneoConCola(usuarioId: number, tipo: Extract<TipoOperacion, "ESCANEO_QR" | "RECEPCION">, envio: RegistroEscaneoEnvio) {
  return conRespaldo<{ resultado: ResultadoValidacion }>(usuarioId, tipo, envio.uuid, envio, () => operativoApi.registrarEscaneo(envio));
}

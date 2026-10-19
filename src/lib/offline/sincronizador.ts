/**
 * Sincronizador de la cola. FIFO por creadoEn, un solo sincronizador activo, envío por lote a
 * POST /operativo/sincronizacion (idempotente por uuid). Reintenta solo ante red/5xx/429 con backoff
 * exponencial + jitter (tope 5 min); tras MAX_INTENTOS la operación queda en ERROR visible.
 * Ante 401 NO se pierde nada: la cola se conserva y la UI pide volver a iniciar sesión.
 */
import { ApiError } from "../../services/http";
import { operativoApi } from "../../services/operativo";
import type { OperacionEnvio } from "../../types/operativo";
import { actualizarOperacion, eliminarOperacion, leerPayload, listarCola, MAX_INTENTOS, type OperacionCola } from "./cola";

let corriendo = false;

export interface ResultadoSync { enviadas: number; fallidas: number; sesionVencida: boolean }

const backoff = (intentos: number) => Math.min(2 ** intentos * 1000, 300_000) + Math.random() * 500;

async function conCandado<T>(fn: () => Promise<T>): Promise<T | null> {
  if (corriendo) return null;
  corriendo = true;
  try {
    if (navigator.locks) return await navigator.locks.request("ollas-sync", { ifAvailable: true }, async (l) => (l ? fn() : null));
    return await fn();
  } finally {
    corriendo = false;
  }
}

export function sincronizarCola(usuarioId: number): Promise<ResultadoSync | null> {
  return conCandado(async () => {
    const ahora = Date.now();
    const elegibles = (await listarCola()).filter(
      (o) => o.usuarioId === usuarioId && o.estado === "PENDIENTE" && o.proximoIntento <= ahora,
    );
    if (elegibles.length === 0 || !navigator.onLine) return { enviadas: 0, fallidas: 0, sesionVencida: false };

    const marca = new Date().toISOString();
    for (const o of elegibles) await actualizarOperacion(o.uuid, { estado: "SINCRONIZANDO", reconexionDetectadaEn: o.reconexionDetectadaEn ?? marca });

    const lote: OperacionEnvio[] = [];
    for (const o of elegibles) lote.push({ uuid: o.uuid, tipo: o.tipo, payload: await leerPayload(o), creado_en: o.creadoEn });

    let enviadas = 0;
    let fallidas = 0;
    try {
      const resultados = await operativoApi.sincronizar(lote);
      for (const o of elegibles) {
        const r = resultados.find((x) => x.uuid === o.uuid);
        if (!r) { await reprogramar(o, "El servidor no respondió por esta operación."); fallidas++; continue; }
        if (r.estado === "OK" || r.estado === "DUPLICADO") { await eliminarOperacion(o.uuid); enviadas++; }
        else if (r.estado === "CONFLICTO") { await actualizarOperacion(o.uuid, { estado: "CONFLICTO", ultimoError: r.detalle }); fallidas++; }
        else { await actualizarOperacion(o.uuid, { estado: "ERROR", ultimoError: r.detalle ?? "Validación rechazada." }); fallidas++; }
      }
      return { enviadas, fallidas, sesionVencida: false };
    } catch (e) {
      const err = e instanceof ApiError ? e : null;
      if (err?.status === 401) {
        for (const o of elegibles) await actualizarOperacion(o.uuid, { estado: "PENDIENTE" });
        return { enviadas: 0, fallidas: 0, sesionVencida: true };
      }
      const reintentable = !err || err.esRed || err.status >= 500 || err.status === 429;
      for (const o of elegibles) {
        if (reintentable) await reprogramar(o, err?.message ?? "Error de red.");
        else await actualizarOperacion(o.uuid, { estado: err!.status === 409 ? "CONFLICTO" : "ERROR", ultimoError: err!.message });
      }
      return { enviadas: 0, fallidas: elegibles.length, sesionVencida: false };
    }
  });
}

async function reprogramar(o: OperacionCola, motivo: string) {
  const intentos = o.intentos + 1;
  await actualizarOperacion(o.uuid, {
    intentos,
    estado: intentos >= MAX_INTENTOS ? "ERROR" : "PENDIENTE",
    proximoIntento: Date.now() + backoff(intentos),
    ultimoError: motivo,
  });
}

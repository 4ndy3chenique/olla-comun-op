/**
 * Cliente HTTP centralizado (fetch) para la API REST PHP. Basado en ollas-comunes-pwa/src/lib/api.ts.
 * Inyecta el Bearer token, aplica timeout de 35 s (arranque en frío de Azure) y soporta Idempotency-Key.
 */
import { leerToken } from "../lib/sesion";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "");

if (!API_BASE_URL) {
  throw new Error("Falta la variable VITE_API_BASE_URL. Copia .env.example a .env y configúrala.");
}

const TIMEOUT_MS = 35_000;

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
  /** true = no hubo respuesta del servidor (sin red, timeout). */
  get esRed() {
    return this.status === 0;
  }
}

interface Opciones extends RequestInit {
  idempotencyKey?: string;
}

async function request<T>(path: string, { idempotencyKey, ...options }: Opciones = {}): Promise<T> {
  const token = leerToken();
  const control = new AbortController();
  const timer = setTimeout(() => control.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      signal: control.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
        ...options.headers,
      },
    });
  } catch (e) {
    const agotado = e instanceof DOMException && e.name === "AbortError";
    throw new ApiError(
      agotado
        ? "El servidor tardó demasiado en responder (puede estar despertando). Intenta de nuevo."
        : "No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.",
      0,
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    let mensaje = `Error ${response.status}`;
    try {
      const cuerpo = await response.json();
      mensaje = cuerpo.mensaje ?? cuerpo.message ?? mensaje;
      const detalles = cuerpo.errores ? Object.values<string>(cuerpo.errores) : [];
      if (detalles.length > 0 && !detalles.includes(mensaje)) mensaje = `${mensaje} ${detalles.join(" ")}`;
    } catch {
      /* respuesta sin cuerpo JSON */
    }
    if (response.status === 401 && token) window.dispatchEvent(new Event("sesion-expirada"));
    throw new ApiError(mensaje, response.status);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

const cuerpo = (b?: unknown) => (b === undefined ? undefined : JSON.stringify(b));

export const http = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown, idempotencyKey?: string) =>
    request<T>(path, { method: "POST", body: cuerpo(body), idempotencyKey }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body: cuerpo(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

export function mensajeDeError(err: unknown, porDefecto: string): string {
  return err instanceof ApiError ? err.message : porDefecto;
}

/** Arma query string omitiendo valores vacíos. */
export function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") u.set(k, String(v));
  const s = u.toString();
  return s ? `?${s}` : "";
}

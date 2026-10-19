/**
 * Contrafirma en campo. El cliente no puede verificar el HMAC del QR (el secreto vive en el servidor), por lo que:
 *  1. Offline: estructura + expiración + antirrepetición de nonce + contrafirma ECDSA P-256 del dispositivo.
 *  2. Al sincronizar: el servidor verifica el HMAC del token_qr (autoridad) y la contrafirma, y responde
 *     VALIDO | INVALIDO_FIRMA | EXPIRADO | NONCE_REPETIDO.
 * El par de claves es por dispositivo; la privada es NO extraíble y vive en IndexedDB (almacén `meta`).
 * El registro de la clave pública (POST /operativo/dispositivos) es parte del contrato propuesto.
 */
import { bdGet, bdPut } from "../offline/db";
import { cifradoDisponible, CifradoNoDisponible } from "../offline/cifrado";
import { datosABase64Url } from "./token";
import type { TipoEscaneo } from "../../types/operativo";

export interface RegistroEscaneo {
  uuid: string;
  guiaId: number;
  nonce: string;
  tipo: TipoEscaneo;
  token: string;
  usuarioId: number;
  escaneadoEn: string;
  tiempoEscaneoMs: number;
  items?: { insumo: string; cantidadRecepcionada: number }[];
}

const CLAVE_META = "par-ecdsa";

async function obtenerParDispositivo(): Promise<{ privada: CryptoKey; publicaJwk: JsonWebKey }> {
  if (!cifradoDisponible()) throw new CifradoNoDisponible();
  const g = await bdGet<{ clave: string; privada: CryptoKey; publicaJwk: JsonWebKey }>("meta", CLAVE_META);
  if (g) return { privada: g.privada, publicaJwk: g.publicaJwk };
  const par = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, false, ["sign", "verify"]);
  // la pública siempre es exportable aunque el par se haya creado con extractable=false
  const publicaJwk = await crypto.subtle.exportKey("jwk", par.publicKey);
  await bdPut("meta", { clave: CLAVE_META, privada: par.privateKey, publicaJwk });
  return { privada: par.privateKey, publicaJwk };
}

/** JSON con claves ordenadas recursivamente: misma entrada → mismos bytes. */
function canonico(v: unknown): string {
  if (Array.isArray(v)) return "[" + v.map(canonico).join(",") + "]";
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return "{" + Object.keys(o).sort().filter((k) => o[k] !== undefined).map((k) => JSON.stringify(k) + ":" + canonico(o[k])).join(",") + "}";
  }
  return JSON.stringify(v);
}

export async function contrafirmar(r: RegistroEscaneo): Promise<{ firma: string; clavePublicaJwk: JsonWebKey }> {
  const { privada, publicaJwk } = await obtenerParDispositivo();
  const datos = new TextEncoder().encode(canonico(r));
  const firma = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, privada, datos);
  return { firma: datosABase64Url(new Uint8Array(firma)), clavePublicaJwk: publicaJwk };
}

/**
 * Cifrado AES-256-GCM con Web Crypto. La clave se genera NO extraíble y se guarda como CryptoKey en
 * IndexedDB (almacén `meta`), así su material nunca pasa por JavaScript.
 *
 * LIMITACIÓN: protege contra inspección casual del perfil del navegador y extracción de archivos; NO protege
 * contra código malicioso en esta misma página ni contra quien use el navegador ya desbloqueado.
 * Si crypto.subtle no existe (contexto no seguro) se bloquea el modo offline: nunca se cae a texto plano.
 */
import { bdGet, bdPut } from "./db";

export class CifradoNoDisponible extends Error {
  constructor() {
    super("Este navegador o contexto no permite cifrado seguro; el modo sin conexión está desactivado.");
    this.name = "CifradoNoDisponible";
  }
}

export const cifradoDisponible = () => typeof crypto !== "undefined" && !!crypto.subtle && typeof indexedDB !== "undefined";

const CLAVE_META = "clave-aes";

async function obtenerClave(): Promise<CryptoKey> {
  if (!cifradoDisponible()) throw new CifradoNoDisponible();
  const g = await bdGet<{ clave: string; key: CryptoKey }>("meta", CLAVE_META);
  if (g) return g.key;
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  await bdPut("meta", { clave: CLAVE_META, key });
  return key;
}

export interface Cifrado {
  iv: Uint8Array<ArrayBuffer>;
  datos: ArrayBuffer;
}

export async function cifrarJson(valor: unknown): Promise<Cifrado> {
  const key = await obtenerClave();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // único por cifrado
  const datos = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(valor)));
  return { iv, datos };
}

export async function descifrarJson<T>(c: Cifrado): Promise<T> {
  const key = await obtenerClave();
  const claro = await crypto.subtle.decrypt({ name: "AES-GCM", iv: c.iv }, key, c.datos);
  return JSON.parse(new TextDecoder().decode(claro)) as T;
}

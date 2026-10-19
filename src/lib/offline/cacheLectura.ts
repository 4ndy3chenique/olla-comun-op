/** Caché de lectura cifrada para uso sin conexión. Se muestra siempre con "Datos al <fecha>". */
import { bdDelete, bdGet, bdGetAll, bdPut } from "./db";
import { cifrarJson, descifrarJson, cifradoDisponible, type Cifrado } from "./cifrado";

export const TTL_HORA = 3_600_000;
export const TTL_CORTO = 24 * TTL_HORA; // ruta y guías
export const TTL_LARGO = 7 * 24 * TTL_HORA; // padrón y menú
const LIMITE_BYTES = 20 * 1024 * 1024;

interface Registro { clave: string; iv: Uint8Array<ArrayBuffer>; datos: ArrayBuffer; guardadoEn: number; venceEn: number }

export async function guardarCache(clave: string, valor: unknown, ttl: number) {
  if (!cifradoDisponible()) return;
  try {
    const { iv, datos } = await cifrarJson(valor);
    const ahora = Date.now();
    await bdPut<Registro>("cache", { clave, iv, datos, guardadoEn: ahora, venceEn: ahora + ttl });
    await podar();
  } catch {
    /* la caché es accesoria: un fallo no debe romper la vista */
  }
}

export async function leerCache<T>(clave: string): Promise<{ datos: T; guardadoEn: Date } | null> {
  if (!cifradoDisponible()) return null;
  try {
    const r = await bdGet<Registro>("cache", clave);
    if (!r) return null;
    if (r.venceEn < Date.now()) {
      await bdDelete("cache", clave);
      return null;
    }
    const c: Cifrado = { iv: r.iv, datos: r.datos };
    return { datos: await descifrarJson<T>(c), guardadoEn: new Date(r.guardadoEn) };
  } catch {
    return null;
  }
}

/** Descarta lo más antiguo si se supera el límite (20 MB). */
async function podar() {
  const todos = await bdGetAll<Registro>("cache");
  let total = todos.reduce((s, r) => s + r.datos.byteLength, 0);
  for (const r of todos.sort((a, b) => a.guardadoEn - b.guardadoEn)) {
    if (total <= LIMITE_BYTES) break;
    await bdDelete("cache", r.clave);
    total -= r.datos.byteLength;
  }
}

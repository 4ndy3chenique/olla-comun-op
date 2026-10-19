/**
 * IndexedDB nativa (sin librerías). Base "ollas-operativo", v1.
 *  - cola:   operaciones pendientes de sincronizar (payload cifrado).
 *  - cache:  respuestas de lectura cifradas (ruta, guías, padrón, menú).
 *  - nonces: nonces de QR ya escaneados (antirrepetición local).
 *  - meta:   claves del dispositivo (AES-GCM y par ECDSA, no extraíbles) y preferencias.
 */
export type Almacen = "cola" | "cache" | "nonces" | "meta";

const NOMBRE_BD = "ollas-operativo";
let abierta: Promise<IDBDatabase> | null = null;

function abrir(): Promise<IDBDatabase> {
  abierta ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(NOMBRE_BD, 1);
    req.onupgradeneeded = () => {
      const bd = req.result;
      const cola = bd.createObjectStore("cola", { keyPath: "uuid" });
      cola.createIndex("estado", "estado");
      cola.createIndex("usuarioId", "usuarioId");
      bd.createObjectStore("cache", { keyPath: "clave" });
      bd.createObjectStore("nonces", { keyPath: "nonce" });
      bd.createObjectStore("meta", { keyPath: "clave" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      abierta = null;
      reject(req.error);
    };
  });
  return abierta;
}

async function pedir<T>(almacen: Almacen, modo: IDBTransactionMode, fn: (a: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const bd = await abrir();
  return new Promise((resolve, reject) => {
    const req = fn(bd.transaction(almacen, modo).objectStore(almacen));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const bdPut = <T>(a: Almacen, v: T) => pedir(a, "readwrite", (s) => s.put(v));
export const bdGet = <T>(a: Almacen, k: IDBValidKey) => pedir<T | undefined>(a, "readonly", (s) => s.get(k));
export const bdGetAll = <T>(a: Almacen) => pedir<T[]>(a, "readonly", (s) => s.getAll());
export const bdDelete = (a: Almacen, k: IDBValidKey) => pedir(a, "readwrite", (s) => s.delete(k));
export const bdClear = (a: Almacen) => pedir(a, "readwrite", (s) => s.clear());

/** Borra todo el contenido del dispositivo (acción explícita del usuario). */
export async function borrarTodo() {
  for (const a of ["cola", "cache", "nonces", "meta"] as Almacen[]) await bdClear(a);
}

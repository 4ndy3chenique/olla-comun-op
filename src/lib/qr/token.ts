/**
 * Token QR emitido por el SERVIDOR: `v1.<payloadBase64Url>.<firmaBase64Url>`.
 * Payload JSON: { g: guiaId, o: ollaId, n: nonce, e: expiraEpochSeg, t: tipo }.
 * El cliente NO conoce HMAC_SECRET: aquí solo se valida estructura, versión y expiración.
 * La firma HMAC la verifica el servidor al sincronizar.
 */
export interface TokenDecodificado {
  guiaId: number;
  ollaId: number;
  nonce: string;
  expira: number; // epoch en segundos
  tipo?: string;
}

export type ErrorToken = "FORMATO" | "EXPIRADO";
export type ResultadoToken = { ok: true; token: TokenDecodificado } | { ok: false; error: ErrorToken };

export function base64UrlADatos(s: string): Uint8Array<ArrayBuffer> {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function datosABase64Url(b: Uint8Array): string {
  let bin = "";
  for (const x of b) bin += String.fromCharCode(x);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodificarToken(valor: string, ahoraSeg = Math.floor(Date.now() / 1000)): ResultadoToken {
  const partes = valor.trim().split(".");
  if (partes.length !== 3 || partes[0] !== "v1" || !partes[1] || !partes[2]) return { ok: false, error: "FORMATO" };
  try {
    const p = JSON.parse(new TextDecoder().decode(base64UrlADatos(partes[1]))) as Record<string, unknown>;
    if (typeof p.g !== "number" || typeof p.o !== "number" || typeof p.n !== "string" || typeof p.e !== "number") {
      return { ok: false, error: "FORMATO" };
    }
    if (p.e < ahoraSeg) return { ok: false, error: "EXPIRADO" };
    return { ok: true, token: { guiaId: p.g, ollaId: p.o, nonce: p.n, expira: p.e, tipo: typeof p.t === "string" ? p.t : undefined } };
  } catch {
    return { ok: false, error: "FORMATO" };
  }
}

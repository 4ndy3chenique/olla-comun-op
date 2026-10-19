/**
 * Implementación DEMO: datos simulados en memoria, sin red. Falla con ApiError(status 0) cuando
 * navigator.onLine === false para ejercitar de verdad la cola offline.
 * El estado se reinicia al recargar la página (la cola de IndexedDB sí persiste).
 */
import { ApiError } from "../http";
import { leerUsuario } from "../../lib/sesion";
import { datosABase64Url, decodificarToken } from "../../lib/qr/token";
import { esTransicionValida, type EstadoFsm } from "../../lib/fsm";
import { calcularDfis } from "../../lib/nutricion";
import type { OperativoApi, PayloadTransicion } from "./tipos";
import type {
  BeneficiarioMascarado, EmitirGuiaInput, EventoBitacora, GuiaDetalle, GuiaResumen, Liquidacion, MenuSemanal, OllaResumen,
  OperacionEnvio, Pagina, ParadaRuta, RegistroEscaneoEnvio, ResultadoSincronizacion, ResultadoValidacion, TransicionFsm, UsuarioResumen,
} from "../../types/operativo";

export const USUARIOS_DEMO = {
  ALMACENERO: { id: 1, dni: "10000001", nombres: "Alma", apellidos: "Cenero Demo", email: "almacen@demo.pe", rol_nombre: "ALMACENERO", rol_id: 2 },
  TRANSPORTISTA: { id: 2, dni: "10000002", nombres: "Tomás", apellidos: "Portista Demo", email: "transporte@demo.pe", rol_nombre: "TRANSPORTISTA", rol_id: 3 },
  AUDITOR: { id: 3, dni: "10000003", nombres: "Aurora", apellidos: "Ditora Demo", email: "auditoria@demo.pe", rol_nombre: "AUDITOR", rol_id: 4 },
} as const;

const espera = (ms = 250) => new Promise((r) => setTimeout(r, ms));
async function red() {
  if (!navigator.onLine) throw new ApiError("No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.", 0);
  await espera();
}

const hace = (horas: number) => new Date(Date.now() - horas * 3_600_000).toISOString();
const OLLAS: OllaResumen[] = [
  { id: 1, nombre: "Olla Santa Rosa", direccion: "Jr. Los Pinos 123", distrito: "San Juan de Lurigancho" },
  { id: 2, nombre: "Olla Virgen del Carmen", direccion: "Av. Las Flores 456", distrito: "Villa El Salvador" },
  { id: 3, nombre: "Olla Manos Unidas", direccion: "Calle Sol 78", distrito: "Comas" },
];
const TRANSPORTISTAS: UsuarioResumen[] = [
  { id: 2, nombre: "Tomás Portista Demo" },
  { id: 20, nombre: "Rosa Chofer Demo" },
];

let sigId = 100;
const nonces = new Set<string>();
const uuidsVistos = new Map<string, number>(); // uuid de operación → guía creada

function tokenQr(guiaId: number, ollaId: number, minutos = 30): string {
  const payload = { g: guiaId, o: ollaId, n: crypto.randomUUID().slice(0, 12), e: Math.floor(Date.now() / 1000) + minutos * 60, t: "despacho" };
  const b = datosABase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  return `v1.${b}.${datosABase64Url(crypto.getRandomValues(new Uint8Array(24)))}`; // firma ficticia (demo)
}

function trans(id: number, o: EstadoFsm | null, d: EstadoFsm, uid: number, nom: string, h: number, valida = true): TransicionFsm {
  return { id, estado_origen: o, estado_destino: d, usuario_id: uid, usuario_nombre: nom, es_transicion_valida: valida, timestamp: hace(h) };
}

function nuevaGuia(id: number, ollaId: number, estado: EstadoFsm, transp: number | null, h: number, items: [string, string, number, number | null][]): GuiaDetalle {
  const olla = OLLAS.find((o) => o.id === ollaId)!;
  const orden: EstadoFsm[] = ["PROGRAMADO", "DESPACHADO", "EN_TRANSITO", "RECEPCIONADO"];
  const hasta = orden.indexOf(estado);
  const transiciones: TransicionFsm[] = [trans(id * 10, null, "PROGRAMADO", 1, "Alma Cenero Demo", h)];
  for (let i = 1; i <= hasta; i++) {
    transiciones.push(trans(id * 10 + i, orden[i - 1], orden[i], i === 1 ? 1 : 2, i === 1 ? "Alma Cenero Demo" : "Tomás Portista Demo", h - i));
  }
  const t = TRANSPORTISTAS.find((x) => x.id === transp);
  return {
    id, olla_id: ollaId, olla_nombre: olla.nombre, transportista_id: transp, transportista_nombre: t?.nombre ?? null,
    estado_fsm: estado, num_items: items.length, fecha_generacion: hace(h), almacenero_id: 1,
    token_qr: tokenQr(id, ollaId, 60 * 24),
    fecha_despacho: hasta >= 1 ? hace(h - 1) : null,
    fecha_recepcion: hasta >= 3 ? hace(h - 3) : null,
    fecha_liquidacion: hasta >= 3 ? hace(h - 6) : null,
    items: items.map(([insumo, unidad, d, r]) => ({ insumo, unidad, cantidad_despachada: d, cantidad_recepcionada: hasta >= 3 ? r : null })),
    transiciones,
  };
}

const guias: GuiaDetalle[] = [
  nuevaGuia(1, 1, "PROGRAMADO", 2, 3, [["Arroz", "kg", 50, null], ["Lenteja", "kg", 20, null]]),
  nuevaGuia(2, 2, "PROGRAMADO", null, 5, [["Aceite", "L", 10, null]]),
  nuevaGuia(3, 3, "DESPACHADO", 2, 20, [["Arroz", "kg", 40, null], ["Fideos", "kg", 15, null], ["Atún", "unidad", 60, null]]),
  nuevaGuia(4, 1, "EN_TRANSITO", 2, 30, [["Menestras", "kg", 25, null], ["Harina", "kg", 30, null]]),
  nuevaGuia(5, 2, "RECEPCIONADO", 2, 80, [["Arroz", "kg", 100, 94], ["Aceite", "L", 20, 20]]),
  nuevaGuia(6, 3, "RECEPCIONADO", 20, 120, [["Lenteja", "kg", 40, 39], ["Fideos", "kg", 30, 30]]),
];

const resumen = (g: GuiaDetalle): GuiaResumen => ({
  id: g.id, olla_id: g.olla_id, olla_nombre: g.olla_nombre, transportista_id: g.transportista_id,
  transportista_nombre: g.transportista_nombre, estado_fsm: g.estado_fsm, num_items: g.items.length, fecha_generacion: g.fecha_generacion,
});

function paginar<T>(todos: T[], page: number, per_page: number): Pagina<T> {
  return { items: todos.slice((page - 1) * per_page, page * per_page), total: todos.length, page, per_page };
}

function aplicarTransicion(g: GuiaDetalle, destino: EstadoFsm) {
  if (!esTransicionValida(g.estado_fsm, destino)) throw new ApiError(`Transición no válida: ${g.estado_fsm} → ${destino}.`, 409);
  const u = leerUsuario();
  g.transiciones.push({
    id: Date.now(), estado_origen: g.estado_fsm, estado_destino: destino, usuario_id: u?.id ?? 0,
    usuario_nombre: u ? `${u.nombres} ${u.apellidos}` : undefined, es_transicion_valida: true, timestamp: new Date().toISOString(),
  });
  g.estado_fsm = destino;
  const ahora = new Date().toISOString();
  if (destino === "DESPACHADO") g.fecha_despacho = ahora;
  if (destino === "RECEPCIONADO") {
    g.fecha_recepcion = ahora;
    g.fecha_liquidacion = ahora;
  }
}

function emitir(b: EmitirGuiaInput): GuiaDetalle {
  const previa = uuidsVistos.get(b.uuid);
  if (previa) return guias.find((g) => g.id === previa)!; // idempotente
  const id = ++sigId;
  const g = nuevaGuia(id, b.olla_id, "PROGRAMADO", b.transportista_id ?? null, 0, b.items.map((i) => [i.insumo, i.unidad, i.cantidad_despachada, null]));
  guias.unshift(g);
  uuidsVistos.set(b.uuid, id);
  return g;
}

function escanear(b: RegistroEscaneoEnvio): ResultadoValidacion {
  const t = decodificarToken(b.token_qr, Math.floor(new Date(b.escaneado_en).getTime() / 1000));
  if (!t.ok) return t.error === "EXPIRADO" ? "EXPIRADO" : "INVALIDO_FIRMA";
  const claveNonce = t.token.nonce + ":" + b.tipo_escaneo; // un mismo QR sirve una vez por tipo de escaneo
  if (nonces.has(claveNonce)) return "NONCE_REPETIDO";
  nonces.add(claveNonce);
  const g = guias.find((x) => x.id === b.guia_id);
  if (!g) return "INVALIDO_FIRMA";
  if (b.tipo_escaneo === "RECEPCION") {
    for (const r of b.items_recepcionados ?? []) {
      const it = g.items.find((i) => i.insumo === r.insumo);
      if (it) it.cantidad_recepcionada = r.cantidad_recepcionada;
    }
    if (g.estado_fsm === "EN_TRANSITO") aplicarTransicion(g, "RECEPCIONADO");
  } else if (g.estado_fsm === "PROGRAMADO") {
    aplicarTransicion(g, "DESPACHADO");
  } else if (g.estado_fsm === "DESPACHADO") {
    aplicarTransicion(g, "EN_TRANSITO"); // el transportista escanea la salida y la guía entra en tránsito
  }
  return "VALIDO";
}

// ---- Padrón, bitácora, menú ----
const NOMBRES = ["María", "José", "Rosa", "Luis", "Carmen", "Pedro", "Ana", "Juan", "Elena", "Carlos"];
const APELLIDOS = ["Quispe Ramos", "Huamán Pérez", "Torres Díaz", "Mendoza Salas", "Flores Rojas", "Vargas Cruz"];
const BENEFICIARIOS: BeneficiarioMascarado[] = Array.from({ length: 64 }, (_, i) => {
  const olla = OLLAS[i % 3];
  return {
    id: i + 1,
    dni_enmascarado: "****" + String(1000 + ((i * 7919) % 9000)).padStart(4, "0"),
    nombres: NOMBRES[i % NOMBRES.length],
    apellidos: APELLIDOS[(i * 3) % APELLIDOS.length],
    fecha_nacimiento: `${1960 + ((i * 7) % 55)}-0${(i % 9) + 1}-1${i % 9}`,
    integrantes_hogar: (i % 6) + 1,
    condicion_nutricional: i % 7 === 0 ? "Riesgo de desnutrición" : null,
    estado_padron: i % 17 === 0 ? "DUPLICADO" : i % 23 === 0 ? "INACTIVO" : "ACTIVO",
    olla_id: olla.id,
    olla_nombre: olla.nombre,
  };
});

const TIPOS_EVENTO = ["GUIA_EMITIDA", "TRANSICION_FSM", "ESCANEO_QR", "LOGIN", "RECEPCION_CONFIRMADA"];
const BITACORA: EventoBitacora[] = Array.from({ length: 80 }, (_, i) => ({
  id: 1000 - i,
  timestamp: hace(i * 2.3),
  usuario_nombre: i % 11 === 0 ? null : ["Alma Cenero Demo", "Tomás Portista Demo", "Aurora Ditora Demo"][i % 3],
  tipo_evento: TIPOS_EVENTO[i % TIPOS_EVENTO.length],
  entidad_afectada: i % 5 === 3 ? "usuarios" : "guias_despacho",
  entidad_id: (i % 6) + 1,
  ip_origen: `190.12.${i % 200}.${(i * 13) % 250}`,
  firma_hmac: Array.from({ length: 64 }, (_, k) => "0123456789abcdef"[(i * 31 + k * 17) % 16]).join(""),
  firma_valida: !(i === 17 || i === 52),
}));

function menuDe(ollaId: number, semana: string): MenuSemanal {
  const lunes = new Date(semana + "T00:00:00");
  const programaciones = Array.from({ length: 7 }, (_, d) => {
    const f = new Date(lunes);
    f.setDate(lunes.getDate() + d);
    const kcal = 1750 + ((d * 137 + ollaId * 61) % 500);
    return { id: ollaId * 100 + d, fecha: f.toISOString().slice(0, 10), tipo_racion: d % 2 ? "Almuerzo familiar" : "Almuerzo escolar", kcal_total_calculada: kcal, cumple_rango_optimo: kcal >= 1900 && kcal <= 2200 };
  });
  const base: [string, number, number | null][] = [["Arroz", 42, 44.1], ["Lenteja", 18, 17.2], ["Aceite", 6, 6.9], ["Fideos", 12, null], ["Menestras", 15, 13.4]];
  return { olla_id: ollaId, semana, programaciones, gramajes: base.map(([insumo, kg, real], i) => ({ id: i + 1, insumo, kg_calculado: kg, kg_real_usado: real })) };
}

function rutaDeUsuario(): ParadaRuta[] {
  const u = leerUsuario();
  return guias
    .filter((g) => g.transportista_id === (u?.id ?? 2) && g.estado_fsm !== "PROGRAMADO")
    .map((g, i) => ({
      ruta_id: i + 1,
      estado_ruta: g.estado_fsm === "RECEPCIONADO" ? "COMPLETADA" : g.estado_fsm === "EN_TRANSITO" ? "EN_CURSO" : "ASIGNADA",
      guia: g,
      olla: OLLAS.find((o) => o.id === g.olla_id)!,
    }));
}

export const apiDemo: OperativoApi = {
  async listarOllas() { await red(); return OLLAS; },
  async listarTransportistas() { await red(); return TRANSPORTISTAS; },
  async listarGuias(p) {
    await red();
    const f = guias.filter((g) =>
      (!p.estado || g.estado_fsm === p.estado) && (!p.olla_id || g.olla_id === p.olla_id) &&
      (!p.transportista_id || g.transportista_id === p.transportista_id) &&
      (!p.desde || g.fecha_generacion >= p.desde) && (!p.hasta || g.fecha_generacion <= p.hasta + "T23:59:59"));
    return paginar(f.map(resumen), p.page, p.per_page);
  },
  async obtenerGuia(id) {
    await red();
    const g = guias.find((x) => x.id === id);
    if (!g) throw new ApiError("La guía no existe.", 404);
    return structuredClone(g);
  },
  async emitirGuia(b) { await red(); return structuredClone(emitir(b)); },
  async transicionarGuia(id, b) {
    await red();
    const g = guias.find((x) => x.id === id);
    if (!g) throw new ApiError("La guía no existe.", 404);
    if (g.estado_fsm !== b.estado_destino) aplicarTransicion(g, b.estado_destino); // reenvío con mismo uuid = no-op
    return structuredClone(g);
  },
  async regenerarQr(id) {
    await red();
    const g = guias.find((x) => x.id === id);
    if (!g) throw new ApiError("La guía no existe.", 404);
    g.token_qr = tokenQr(g.id, g.olla_id, 5);
    return { token_qr: g.token_qr, expira_en: new Date(Date.now() + 5 * 60_000).toISOString() };
  },
  async obtenerMenuSemanal(p) { await red(); return menuDe(p.olla_id, p.semana); },
  async obtenerMiRuta() { await red(); return structuredClone(rutaDeUsuario()); },
  async registrarEscaneo(b) { await red(); return { resultado: escanear(b) }; },
  async listarBeneficiarios(p) {
    await red();
    const q = p.q?.trim().toLowerCase();
    const f = BENEFICIARIOS.filter((b) =>
      (!p.olla_id || b.olla_id === p.olla_id) && (!p.estado || b.estado_padron === p.estado) &&
      (!q || `${b.nombres} ${b.apellidos}`.toLowerCase().includes(q) || b.dni_enmascarado.endsWith(q)));
    return paginar(f, p.page, p.per_page);
  },
  async listarBitacora(p) {
    await red();
    const f = BITACORA.filter((e) =>
      (!p.tipo_evento || e.tipo_evento === p.tipo_evento) && (!p.entidad || e.entidad_afectada === p.entidad) &&
      (!p.solo_invalidas || !e.firma_valida) && (!p.desde || e.timestamp >= p.desde) && (!p.hasta || e.timestamp <= p.hasta + "T23:59:59"));
    return paginar(f, p.page, p.per_page);
  },
  async listarLiquidaciones(p) {
    await red();
    const f: Liquidacion[] = guias
      .filter((g) => g.fecha_liquidacion && (!p.olla_id || g.olla_id === p.olla_id))
      .map((g) => {
        const dfis = g.items.map((i) => calcularDfis(i.cantidad_despachada, i.cantidad_recepcionada)).filter((x): x is number => x !== null);
        return {
          guia_id: g.id, olla_nombre: g.olla_nombre, fecha_despacho: g.fecha_despacho, fecha_recepcion: g.fecha_recepcion,
          fecha_liquidacion: g.fecha_liquidacion!, d_fis_pct: dfis.length ? dfis.reduce((a, b) => a + b, 0) / dfis.length : 0,
        };
      });
    return paginar(f, p.page, p.per_page);
  },
  async sincronizar(ops: OperacionEnvio[]) {
    await red();
    const out: ResultadoSincronizacion[] = [];
    for (const op of ops) {
      try {
        if (op.tipo === "EMISION_GUIA") {
          const b = op.payload as EmitirGuiaInput;
          out.push({ uuid: op.uuid, estado: uuidsVistos.has(b.uuid) ? "DUPLICADO" : "OK" });
          emitir(b);
        } else if (op.tipo === "TRANSICION_FSM") {
          const b = op.payload as PayloadTransicion;
          const g = guias.find((x) => x.id === b.guia_id);
          if (!g) out.push({ uuid: op.uuid, estado: "ERROR_VALIDACION", detalle: "La guía no existe." });
          else if (g.estado_fsm === b.estado_destino) out.push({ uuid: op.uuid, estado: "DUPLICADO" });
          else { aplicarTransicion(g, b.estado_destino); out.push({ uuid: op.uuid, estado: "OK" }); }
        } else {
          const r = escanear(op.payload as RegistroEscaneoEnvio);
          out.push(r === "VALIDO" ? { uuid: op.uuid, estado: "OK" } : r === "NONCE_REPETIDO"
            ? { uuid: op.uuid, estado: "DUPLICADO", detalle: "Nonce ya registrado." }
            : { uuid: op.uuid, estado: "CONFLICTO", detalle: `El servidor rechazó el QR: ${r}.` });
        }
      } catch (e) {
        out.push({ uuid: op.uuid, estado: "CONFLICTO", detalle: e instanceof Error ? e.message : "Conflicto." });
      }
    }
    return out;
  },
};

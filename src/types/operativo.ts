import type { EstadoFsm } from "../lib/fsm";

export type ResultadoValidacion = "VALIDO" | "INVALIDO_FIRMA" | "EXPIRADO" | "NONCE_REPETIDO";
export type TipoEscaneo = "SALIDA_ALMACEN" | "RECEPCION";
export type EstadoRuta = "ASIGNADA" | "EN_CURSO" | "COMPLETADA";

export interface Paginacion { page: number; per_page: number }
export interface Pagina<T> { items: T[]; total: number; page: number; per_page: number }

export interface OllaResumen { id: number; nombre: string; direccion: string; distrito: string }
export interface UsuarioResumen { id: number; nombre: string }

export interface ItemGuia {
  id?: number;
  insumo: string;
  unidad: string;
  cantidad_despachada: number;
  cantidad_recepcionada: number | null;
}

export interface TransicionFsm {
  id: number;
  estado_origen: EstadoFsm | null;
  estado_destino: EstadoFsm;
  usuario_id: number;
  usuario_nombre?: string;
  es_transicion_valida: boolean;
  timestamp: string;
}

export interface GuiaResumen {
  id: number;
  olla_id: number;
  olla_nombre: string;
  transportista_id: number | null;
  transportista_nombre: string | null;
  estado_fsm: EstadoFsm;
  num_items: number;
  fecha_generacion: string;
  fecha_liquidacion?: string | null;
  pendiente_sincronizar?: boolean;
}

export interface GuiaDetalle extends GuiaResumen {
  almacenero_id: number;
  token_qr: string | null; // null mientras la guía está solo en cola local
  fecha_despacho: string | null;
  fecha_recepcion: string | null;
  fecha_liquidacion: string | null;
  items: ItemGuia[];
  transiciones: TransicionFsm[];
}

export interface FiltroGuias { sin_liquidar?: boolean; estado?: EstadoFsm; olla_id?: number; transportista_id?: number; desde?: string; hasta?: string }

export interface EmitirGuiaInput {
  uuid: string;
  olla_id: number;
  transportista_id?: number | null;
  items: { insumo: string; unidad: string; cantidad_despachada: number }[];
  observaciones?: string;
}

export interface Programacion {
  id: number;
  fecha: string;
  tipo_racion: string;
  kcal_total_calculada: number;
  cumple_rango_optimo: boolean;
}
export interface Gramaje { id: number; insumo: string; kg_calculado: number; kg_real_usado: number | null }
export interface MenuSemanal { olla_id: number; semana: string; programaciones: Programacion[]; gramajes: Gramaje[] }

export interface ParadaRuta {
  ruta_id: number;
  estado_ruta: EstadoRuta;
  guia: GuiaDetalle;
  olla: OllaResumen;
}

export interface RegistroEscaneoEnvio {
  uuid: string;
  guia_id: number;
  token_qr: string;
  tipo_escaneo: TipoEscaneo;
  escaneado_en: string;
  tiempo_escaneo_ms: number;
  items_recepcionados?: { insumo: string; cantidad_recepcionada: number }[];
  contrafirma: string;
  clave_publica: JsonWebKey;
}

export interface BeneficiarioMascarado {
  id: number;
  dni_enmascarado: string;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string;
  integrantes_hogar: number;
  condicion_nutricional: string | null;
  estado_padron: "ACTIVO" | "DUPLICADO" | "INACTIVO";
  olla_id: number;
  olla_nombre: string;
}
export interface FiltroPadron { q?: string; olla_id?: number; estado?: string }

export interface EventoBitacora {
  id: number;
  timestamp: string;
  usuario_nombre: string | null;
  tipo_evento: string;
  entidad_afectada: string;
  entidad_id: number;
  ip_origen: string | null;
  firma_hmac: string;
  firma_valida: boolean;
}
export interface FiltroBitacora { desde?: string; hasta?: string; tipo_evento?: string; entidad?: string; solo_invalidas?: boolean }

export interface Liquidacion {
  guia_id: number;
  olla_nombre: string;
  fecha_despacho: string | null;
  fecha_recepcion: string | null;
  fecha_liquidacion: string;
  d_fis_pct: number;
}
export interface FiltroLiquidacion { desde?: string; hasta?: string; olla_id?: number }

export type TipoOperacion = "EMISION_GUIA" | "TRANSICION_FSM" | "ESCANEO_QR" | "RECEPCION";
export interface OperacionEnvio { uuid: string; tipo: TipoOperacion; payload: unknown; creado_en: string }
export interface ResultadoSincronizacion {
  uuid: string;
  estado: "OK" | "DUPLICADO" | "CONFLICTO" | "ERROR_VALIDACION";
  detalle?: string;
}

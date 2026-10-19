import type { EstadoFsm } from "../../lib/fsm";
import type {
  BeneficiarioMascarado, EmitirGuiaInput, EventoBitacora, FiltroBitacora, FiltroGuias, FiltroLiquidacion, FiltroPadron,
  GuiaDetalle, GuiaResumen, Liquidacion, MenuSemanal, OllaResumen, OperacionEnvio, Pagina, Paginacion, ParadaRuta,
  RegistroEscaneoEnvio, ResultadoSincronizacion, ResultadoValidacion, UsuarioResumen,
} from "../../types/operativo";

/** Payload de una TRANSICION_FSM encolada. */
export interface PayloadTransicion {
  guia_id: number;
  uuid: string;
  estado_destino: EstadoFsm;
}

/** Contrato que implementan apiReal (Anexo A, NO desplegado) y apiDemo. */
export interface OperativoApi {
  // Almacén
  listarOllas(p: { apta?: boolean }): Promise<OllaResumen[]>;
  listarTransportistas(): Promise<UsuarioResumen[]>;
  listarGuias(p: FiltroGuias & Paginacion): Promise<Pagina<GuiaResumen>>;
  obtenerGuia(id: number): Promise<GuiaDetalle>;
  emitirGuia(b: EmitirGuiaInput): Promise<GuiaDetalle>; // idempotente por b.uuid
  transicionarGuia(id: number, b: { uuid: string; estado_destino: EstadoFsm }): Promise<GuiaDetalle>;
  regenerarQr(id: number): Promise<{ token_qr: string; expira_en: string }>;
  // Menú y nutrición
  obtenerMenuSemanal(p: { olla_id: number; semana: string }): Promise<MenuSemanal>;
  // Transporte
  obtenerMiRuta(): Promise<ParadaRuta[]>;
  registrarEscaneo(b: RegistroEscaneoEnvio): Promise<{ resultado: ResultadoValidacion }>; // idempotente por uuid
  // Padrón
  listarBeneficiarios(p: FiltroPadron & Paginacion): Promise<Pagina<BeneficiarioMascarado>>;
  // Auditoría
  listarBitacora(p: FiltroBitacora & Paginacion): Promise<Pagina<EventoBitacora>>;
  listarLiquidaciones(p: FiltroLiquidacion & Paginacion): Promise<Pagina<Liquidacion>>;
  // Sincronización
  sincronizar(ops: OperacionEnvio[]): Promise<ResultadoSincronizacion[]>;
}

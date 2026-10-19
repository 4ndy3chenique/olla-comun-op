/**
 * Implementación contra el CONTRATO OBJETIVO (Anexo A): PROPUESTO — NO DESPLEGADO.
 * Hoy la API no expone ninguna de estas rutas; solo debe usarse con VITE_OPERATIVO_MODO=real cuando el
 * backend las implemente.
 */
import { http, qs } from "../http";
import type { OperativoApi } from "./tipos";
import type {
  BeneficiarioMascarado, EventoBitacora, GuiaDetalle, GuiaResumen, Liquidacion, MenuSemanal, OllaResumen, Pagina,
  ParadaRuta, ResultadoSincronizacion, ResultadoValidacion, UsuarioResumen,
} from "../../types/operativo";

export const apiReal: OperativoApi = {
  listarOllas: (p) => http.get<OllaResumen[]>(`/operativo/ollas${qs({ apta: p.apta })}`),
  listarTransportistas: () => http.get<UsuarioResumen[]>("/operativo/transportistas"),
  listarGuias: (p) => http.get<Pagina<GuiaResumen>>(`/operativo/guias${qs({ ...p })}`),
  obtenerGuia: (id) => http.get<GuiaDetalle>(`/operativo/guias/${id}`),
  emitirGuia: (b) => http.post<GuiaDetalle>("/operativo/guias", b, b.uuid),
  transicionarGuia: (id, b) => http.post<GuiaDetalle>(`/operativo/guias/${id}/transiciones`, b, b.uuid),
  regenerarQr: (id) => http.post<{ token_qr: string; expira_en: string }>(`/operativo/guias/${id}/qr`),
  obtenerMenuSemanal: (p) => http.get<MenuSemanal>(`/operativo/menu${qs({ ...p })}`),
  obtenerMiRuta: () => http.get<ParadaRuta[]>("/operativo/rutas/mias"),
  registrarEscaneo: (b) => http.post<{ resultado: ResultadoValidacion }>("/operativo/escaneos", b, b.uuid),
  listarBeneficiarios: (p) => http.get<Pagina<BeneficiarioMascarado>>(`/operativo/padron${qs({ ...p })}`),
  listarBitacora: (p) => http.get<Pagina<EventoBitacora>>(`/operativo/auditoria/bitacora${qs({ ...p })}`),
  listarLiquidaciones: (p) => http.get<Pagina<Liquidacion>>(`/operativo/auditoria/liquidacion${qs({ ...p })}`),
  sincronizar: (operaciones) => http.post<ResultadoSincronizacion[]>("/operativo/sincronizacion", { operaciones }),
};

/** Arma las tablas de cada reporte recorriendo TODAS las páginas del servidor (máx. 5000 filas). */
import { operativoApi } from "../operativo";
import { fechaHora, horasEntre, numero } from "../../lib/formatos";
import { calcularEins } from "../../lib/nutricion";
import type { Pagina } from "../../types/operativo";
import type { TablaReporte } from "./pdf";

export type TipoReporte = "bitacora" | "liquidacion" | "padron" | "menu";
export const MAX_FILAS = 5000;
const POR_PAGINA = 100;

export interface FiltrosReporte { desde?: string; hasta?: string; olla_id?: number; semana?: string }

async function traerTodo<T>(pagina: (page: number, per_page: number) => Promise<Pagina<T>>): Promise<{ items: T[]; truncado: boolean }> {
  const items: T[] = [];
  for (let page = 1; ; page++) {
    const r = await pagina(page, POR_PAGINA);
    items.push(...r.items);
    if (items.length >= MAX_FILAS) return { items: items.slice(0, MAX_FILAS), truncado: items.length > MAX_FILAS || r.total > MAX_FILAS };
    if (items.length >= r.total || r.items.length === 0) return { items, truncado: false };
  }
}

export async function construirReporte(tipo: TipoReporte, f: FiltrosReporte): Promise<{ tabla: TablaReporte; truncado: boolean }> {
  switch (tipo) {
    case "bitacora": {
      const { items, truncado } = await traerTodo((page, per_page) => operativoApi.listarBitacora({ desde: f.desde, hasta: f.hasta, page, per_page }));
      return { truncado, tabla: {
        titulo: "Bitácora de auditoría",
        columnas: ["Fecha", "Usuario", "Evento", "Entidad", "ID", "IP", "Firma", "Firma válida"],
        filas: items.map((e) => [fechaHora(e.timestamp), e.usuario_nombre ?? "—", e.tipo_evento, e.entidad_afectada, e.entidad_id, e.ip_origen ?? "—", e.firma_hmac.slice(0, 8) + "…" + e.firma_hmac.slice(-4), e.firma_valida ? "Sí" : "No"]),
      } };
    }
    case "liquidacion": {
      const { items, truncado } = await traerTodo((page, per_page) => operativoApi.listarLiquidaciones({ desde: f.desde, hasta: f.hasta, olla_id: f.olla_id, page, per_page }));
      return { truncado, tabla: {
        titulo: "Liquidación de guías",
        columnas: ["Guía", "Olla", "Despacho", "Recepción", "Liquidación", "t_liq (h)", "D_fis (%)"],
        filas: items.map((l) => [l.guia_id, l.olla_nombre, fechaHora(l.fecha_despacho), fechaHora(l.fecha_recepcion), fechaHora(l.fecha_liquidacion),
          l.fecha_recepcion ? numero(horasEntre(l.fecha_recepcion, l.fecha_liquidacion)) : "—", numero(l.d_fis_pct)]),
      } };
    }
    case "padron": {
      const { items, truncado } = await traerTodo((page, per_page) => operativoApi.listarBeneficiarios({ olla_id: f.olla_id, page, per_page }));
      return { truncado, tabla: {
        titulo: "Padrón enmascarado",
        columnas: ["DNI", "Nombres", "Apellidos", "Hogar", "Condición nutricional", "Olla", "Estado"],
        filas: items.map((b) => [b.dni_enmascarado, b.nombres, b.apellidos, b.integrantes_hogar, b.condicion_nutricional ?? "—", b.olla_nombre, b.estado_padron]),
      } };
    }
    case "menu": {
      if (!f.olla_id || !f.semana) throw new Error("Elige una olla y una semana para el reporte de menú.");
      const m = await operativoApi.obtenerMenuSemanal({ olla_id: f.olla_id, semana: f.semana });
      return { truncado: false, tabla: {
        titulo: "Menú y balance",
        columnas: ["Insumo", "kg calculado", "kg real usado", "E_ins (%)"],
        filas: m.gramajes.map((g) => { const e = calcularEins(g); return [g.insumo, g.kg_calculado, g.kg_real_usado ?? "—", e === null ? "—" : numero(e)]; }),
      } };
    }
  }
}

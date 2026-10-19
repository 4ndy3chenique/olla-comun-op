import type { NombreIcono } from "../ui/Icono";
import type { NombreRol } from "../../types";

export interface DestinoNav {
  to: string;
  etiqueta: string;
  icono: NombreIcono;
  /** Solo en la barra lateral: en móvil se limita a 5 destinos. */
  soloLateral?: boolean;
  /** Coincidencia exacta del enlace activo (para rutas raíz de panel). */
  exacto?: boolean;
}

const COLA: DestinoNav = { to: "/cola", etiqueta: "Cola de sincronización", icono: "bandeja", soloLateral: true };

export const DESTINOS_POR_ROL: Record<NombreRol, DestinoNav[]> = {
  ALMACENERO: [
    { to: "/almacen", etiqueta: "Tablero", icono: "tablero", exacto: true },
    { to: "/almacen/guias/nueva", etiqueta: "Nueva guía", icono: "caja" },
    { to: "/almacen/menu", etiqueta: "Menú", icono: "menuSemana" },
    { to: "/almacen/padron", etiqueta: "Padrón", icono: "familia" },
    { to: "/cola", etiqueta: "Cola", icono: "bandeja" },
  ],
  TRANSPORTISTA: [
    { to: "/transporte", etiqueta: "Mi ruta", icono: "camion", exacto: true },
    { to: "/transporte/recepcion", etiqueta: "Escanear", icono: "qr" },
    { to: "/cola", etiqueta: "Cola", icono: "bandeja" },
  ],
  AUDITOR: [
    { to: "/auditoria", etiqueta: "Bitácora", icono: "bitacora", exacto: true },
    { to: "/auditoria/liquidacion", etiqueta: "Liquidación", icono: "planilla" },
    { to: "/auditoria/reportes", etiqueta: "Reportes", icono: "descarga" },
    { to: "/auditoria/menu", etiqueta: "Menú", icono: "menuSemana" },
    { to: "/auditoria/padron", etiqueta: "Padrón", icono: "familia" },
    COLA,
  ],
  ADMINISTRADOR: [],
  SOLICITANTE_DIRIGENTE: [],
};
DESTINOS_POR_ROL.ADMINISTRADOR = DESTINOS_POR_ROL.AUDITOR;

export const TITULO_PANEL: Record<NombreRol, string> = {
  ALMACENERO: "Almacén",
  TRANSPORTISTA: "Transporte",
  AUDITOR: "Auditoría",
  ADMINISTRADOR: "Auditoría",
  SOLICITANTE_DIRIGENTE: "",
};

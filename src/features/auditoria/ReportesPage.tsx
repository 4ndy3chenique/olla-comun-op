import { useState } from "react";
import { Icono } from "../../components/ui/Icono";
import { useAuth } from "../../context/AuthContext";
import { useCarga } from "../../hooks/useCarga";
import { useOnline } from "../../hooks/useOnline";
import { TTL_LARGO } from "../../lib/offline/cacheLectura";
import { mensajeDeError } from "../../services/http";
import { operativoApi } from "../../services/operativo";
import { construirReporte, MAX_FILAS, type TipoReporte } from "../../services/reportes/construir";

const TIPOS: { valor: TipoReporte; etiqueta: string }[] = [
  { valor: "bitacora", etiqueta: "Bitácora de auditoría" },
  { valor: "liquidacion", etiqueta: "Liquidación de guías" },
  { valor: "padron", etiqueta: "Padrón enmascarado" },
  { valor: "menu", etiqueta: "Menú y balance" },
];

function lunes(): string {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

export default function ReportesPage() {
  const { usuario, rol } = useAuth();
  const enLinea = useOnline();
  const ollas = useCarga("ollas:todas", () => operativoApi.listarOllas({}), TTL_LARGO, []);
  const [tipo, setTipo] = useState<TipoReporte>("bitacora");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [olla, setOlla] = useState("");
  const [semana, setSemana] = useState(lunes());
  const [trabajando, setTrabajando] = useState<"pdf" | "xlsx" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  async function generar(formato: "pdf" | "xlsx") {
    setError(null);
    setAviso(null);
    setTrabajando(formato);
    try {
      const ollaId = olla ? Number(olla) : (tipo === "menu" ? ollas.datos?.[0]?.id : undefined);
      const { tabla, truncado } = await construirReporte(tipo, { desde: desde || undefined, hasta: hasta || undefined, olla_id: ollaId, semana });
      if (formato === "pdf") {
        const { descargarPdf } = await import("../../services/reportes/pdf");
        const nombreOlla = ollas.datos?.find((o) => o.id === ollaId)?.nombre;
        await descargarPdf(tabla, {
          usuario: `${usuario?.nombres} ${usuario?.apellidos}`, rol: rol ?? "",
          filtros: [desde && `desde ${desde}`, hasta && `hasta ${hasta}`, nombreOlla && `olla ${nombreOlla}`, tipo === "menu" && `semana ${semana}`].filter(Boolean).join(", "), truncado,
        });
      } else {
        const { descargarExcel } = await import("../../services/reportes/excel");
        await descargarExcel(tabla);
      }
      setAviso(`Reporte generado (${tabla.filas.length} fila${tabla.filas.length === 1 ? "" : "s"})${truncado ? `; se truncó en ${MAX_FILAS} filas` : ""}.`);
    } catch (e) {
      setError(mensajeDeError(e, e instanceof Error ? e.message : "No pudimos generar el reporte."));
    } finally {
      setTrabajando(null);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Reportes operativos</h1>
        <p className="text-sm text-muted">Exporta a PDF o Excel para rendición de cuentas. Respeta los filtros elegidos; el DNI sale siempre enmascarado.</p>
      </div>

      <form className="card grid gap-3 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
        <div className="sm:col-span-2">
          <label className="label-field" htmlFor="r-tipo">Tipo de reporte</label>
          <select id="r-tipo" className="input-field" value={tipo} onChange={(e) => setTipo(e.target.value as TipoReporte)}>
            {TIPOS.map((t) => <option key={t.valor} value={t.valor}>{t.etiqueta}</option>)}
          </select>
        </div>
        {(tipo === "bitacora" || tipo === "liquidacion") && (
          <>
            <div><label className="label-field" htmlFor="r-desde">Desde</label><input id="r-desde" type="date" className="input-field" value={desde} onChange={(e) => setDesde(e.target.value)} /></div>
            <div><label className="label-field" htmlFor="r-hasta">Hasta</label><input id="r-hasta" type="date" className="input-field" value={hasta} onChange={(e) => setHasta(e.target.value)} /></div>
          </>
        )}
        {tipo !== "bitacora" && (
          <div>
            <label className="label-field" htmlFor="r-olla">Olla</label>
            <select id="r-olla" className="input-field" value={olla} onChange={(e) => setOlla(e.target.value)}>
              {tipo !== "menu" && <option value="">Todas</option>}
              {ollas.datos?.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
            </select>
          </div>
        )}
        {tipo === "menu" && (
          <div><label className="label-field" htmlFor="r-semana">Semana (lunes)</label><input id="r-semana" type="date" className="input-field" value={semana} onChange={(e) => setSemana(e.target.value)} /></div>
        )}
      </form>

      {!enLinea && <p role="status" className="flex items-center gap-2 text-sm text-accent-dark"><Icono nombre="wifiOff" /> Requiere conexión: los reportes salen de datos completos del servidor.</p>}
      {error && <p role="alert" className="rounded border border-danger bg-danger-light p-3 text-sm text-danger">{error}</p>}
      {aviso && <p role="status" className="rounded border border-success bg-success-light p-3 text-sm text-success">{aviso}</p>}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button className="btn-primary flex-1 gap-2" disabled={!enLinea || trabajando !== null} onClick={() => generar("pdf")}>
          <Icono nombre="descarga" /> {trabajando === "pdf" ? "Generando PDF…" : enLinea ? "Descargar PDF" : "PDF: requiere conexión"}
        </button>
        <button className="btn-secondary flex-1 gap-2" disabled={!enLinea || trabajando !== null} onClick={() => generar("xlsx")}>
          <Icono nombre="descarga" /> {trabajando === "xlsx" ? "Generando Excel…" : enLinea ? "Descargar Excel" : "Excel: requiere conexión"}
        </button>
      </div>
    </div>
  );
}

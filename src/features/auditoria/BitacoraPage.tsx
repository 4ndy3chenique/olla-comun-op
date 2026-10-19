import { useState } from "react";
import { CargandoVista, ErrorConReintento } from "../../components/ui/Estados";
import { DatosAl } from "../../components/ui/DatosAl";
import { EmptyState } from "../../components/ui/EmptyState";
import { Paginador } from "../../components/ui/Paginador";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Tabla } from "../../components/ui/Tabla";
import { useCarga } from "../../hooks/useCarga";
import { useFiltrosUrl } from "../../hooks/usePaginacion";
import { fechaHora, numero } from "../../lib/formatos";
import { TTL_CORTO } from "../../lib/offline/cacheLectura";
import { operativoApi } from "../../services/operativo";
import type { EventoBitacora } from "../../types/operativo";

const EVENTOS = ["GUIA_EMITIDA", "TRANSICION_FSM", "ESCANEO_QR", "LOGIN", "RECEPCION_CONFIRMADA"];

function Firma({ e }: { e: EventoBitacora }) {
  const [copiado, setCopiado] = useState(false);
  const corta = e.firma_hmac.slice(0, 4) + "…" + e.firma_hmac.slice(-4);
  return (
    <div className="flex flex-col items-start gap-1">
      <span className="font-mono text-xs">{corta}</span>
      <StatusBadge estado="firma" tono={e.firma_valida ? "exito" : "peligro"} icono={e.firma_valida ? "escudo" : "equis"} etiqueta={e.firma_valida ? "Firma válida" : "Firma inválida"} />
      <button className="toque text-xs font-medium text-primary underline"
        onClick={() => navigator.clipboard?.writeText(e.firma_hmac).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 2000); })}>
        {copiado ? "Copiada" : "Ver completa (copiar)"}
      </button>
    </div>
  );
}

/** Bitácora inmutable: solo lectura, sin acciones de editar/borrar. `firma_valida` lo informa el servidor. */
export default function BitacoraPage() {
  const f = useFiltrosUrl(25);
  const desde = f.get("desde") || undefined;
  const hasta = f.get("hasta") || undefined;
  const tipo = f.get("tipo") || undefined;
  const entidad = f.get("entidad") || undefined;
  const soloInvalidas = f.get("invalidas") === "1";

  const lista = useCarga(`bitacora:${desde}:${hasta}:${tipo}:${entidad}:${soloInvalidas}:${f.page}`,
    () => operativoApi.listarBitacora({ desde, hasta, tipo_evento: tipo, entidad, solo_invalidas: soloInvalidas, page: f.page, per_page: f.per_page }),
    TTL_CORTO, [desde, hasta, tipo, entidad, soloInvalidas, f.page]);

  const validas = lista.datos?.items.filter((e) => e.firma_valida).length ?? 0;
  const tFirma = lista.datos && lista.datos.items.length > 0 ? (validas / lista.datos.items.length) * 100 : null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Bitácora de auditoría</h1>
        <p className="text-sm text-muted">Registro inmutable de eventos con firma HMAC. El cliente refleja la validez que informa el servidor; no verifica la firma.</p>
      </div>

      <div className="card">
        <p className="text-sm text-muted">T_firma (eventos con firma válida, página actual)</p>
        <p className="text-2xl font-semibold">{tFirma === null ? "—" : `${numero(tFirma)} %`}</p>
      </div>

      <form className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="Filtros" onSubmit={(e) => e.preventDefault()}>
        <div><label className="label-field" htmlFor="b-desde">Desde</label><input id="b-desde" type="date" className="input-field" value={f.get("desde")} onChange={(e) => f.set({ desde: e.target.value })} /></div>
        <div><label className="label-field" htmlFor="b-hasta">Hasta</label><input id="b-hasta" type="date" className="input-field" value={f.get("hasta")} onChange={(e) => f.set({ hasta: e.target.value })} /></div>
        <div>
          <label className="label-field" htmlFor="b-tipo">Tipo de evento</label>
          <select id="b-tipo" className="input-field" value={f.get("tipo")} onChange={(e) => f.set({ tipo: e.target.value })}>
            <option value="">Todos</option>{EVENTOS.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="label-field" htmlFor="b-ent">Entidad</label>
          <select id="b-ent" className="input-field" value={f.get("entidad")} onChange={(e) => f.set({ entidad: e.target.value })}>
            <option value="">Todas</option><option>guias_despacho</option><option>usuarios</option>
          </select>
        </div>
        <label className="toque flex items-end gap-3 pb-3 text-sm">
          <input type="checkbox" className="h-5 w-5 accent-primary" checked={soloInvalidas} onChange={(e) => f.set({ invalidas: e.target.checked ? "1" : undefined })} />
          Solo firmas inválidas
        </label>
      </form>

      <DatosAl fecha={lista.deCache} />
      {lista.cargando && !lista.datos && <CargandoVista />}
      {lista.error && !lista.datos && <ErrorConReintento mensaje={lista.error} onReintentar={lista.recargar} />}
      {lista.datos && lista.datos.items.length === 0 && <EmptyState titulo="Sin eventos" descripcion="Ningún evento coincide con los filtros." />}
      {lista.datos && lista.datos.items.length > 0 && (
        <>
          <Tabla<EventoBitacora>
            caption="Bitácora de eventos"
            filas={lista.datos.items}
            clave={(e) => e.id}
            columnas={[
              { clave: "t", titulo: "Fecha", render: (e) => fechaHora(e.timestamp) },
              { clave: "u", titulo: "Usuario", render: (e) => e.usuario_nombre ?? "Sistema" },
              { clave: "e", titulo: "Evento", render: (e) => e.tipo_evento },
              { clave: "en", titulo: "Entidad", render: (e) => `${e.entidad_afectada} #${e.entidad_id}` },
              { clave: "ip", titulo: "IP", render: (e) => e.ip_origen ?? "—" },
              { clave: "f", titulo: "Firma", render: (e) => <Firma e={e} /> },
            ]}
            tarjeta={(e) => (
              <div className="flex flex-col gap-1 text-sm">
                <p className="text-base font-medium">{e.tipo_evento}</p>
                <p>{fechaHora(e.timestamp)} · {e.usuario_nombre ?? "Sistema"}</p>
                <p>{e.entidad_afectada} #{e.entidad_id} · {e.ip_origen ?? "—"}</p>
                <Firma e={e} />
              </div>
            )}
          />
          <Paginador page={f.page} perPage={f.per_page} total={lista.datos.total} onCambiar={f.setPage} />
        </>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { BadgeFsm } from "../../components/ui/StatusBadge";
import { CargandoVista, ErrorConReintento } from "../../components/ui/Estados";
import { DatosAl } from "../../components/ui/DatosAl";
import { Icono } from "../../components/ui/Icono";
import { Modal } from "../../components/ui/Modal";
import { useAuth } from "../../context/AuthContext";
import { useCarga } from "../../hooks/useCarga";
import { useOperacionesCola } from "../../hooks/useCola";
import { useFiltrosUrl } from "../../hooks/usePaginacion";
import { ETIQUETA_FSM, ORDEN_FSM, TRANSICIONES, type EstadoFsm } from "../../lib/fsm";
import { fecha } from "../../lib/formatos";
import { leerPayload } from "../../lib/offline/cola";
import { TTL_CORTO } from "../../lib/offline/cacheLectura";
import { mensajeDeError } from "../../services/http";
import { operativoApi } from "../../services/operativo";
import { transicionarConCola } from "../../services/operativo/acciones";
import type { EmitirGuiaInput, GuiaResumen } from "../../types/operativo";

/** Guías emitidas sin conexión que aún esperan sincronizar (ids negativos = locales). */
function useGuiasLocales(nombreOlla: (id: number) => string): GuiaResumen[] {
  const ops = useOperacionesCola();
  const [locales, setLocales] = useState<GuiaResumen[]>([]);
  useEffect(() => {
    let vigente = true;
    (async () => {
      const out: GuiaResumen[] = [];
      for (const [i, op] of ops.filter((o) => o.tipo === "EMISION_GUIA").entries()) {
        try {
          const p = await leerPayload<EmitirGuiaInput>(op);
          out.push({
            id: -(i + 1), olla_id: p.olla_id, olla_nombre: nombreOlla(p.olla_id), transportista_id: p.transportista_id ?? null,
            transportista_nombre: null, estado_fsm: "PROGRAMADO", num_items: p.items.length, fecha_generacion: op.creadoEn, pendiente_sincronizar: true,
          });
        } catch { /* payload ilegible: se omite */ }
      }
      if (vigente) setLocales(out);
    })();
    return () => { vigente = false; };
  }, [ops, nombreOlla]);
  return locales;
}

export default function TableroFsmPage() {
  const { usuario } = useAuth();
  const navegar = useNavigate();
  const f = useFiltrosUrl(100);
  const ollaId = Number(f.get("olla")) || undefined;
  const transportistaId = Number(f.get("transportista")) || undefined;
  const desde = f.get("desde") || undefined;
  const hasta = f.get("hasta") || undefined;
  const [pestana, setPestana] = useState<EstadoFsm>("PROGRAMADO");
  const [confirmar, setConfirmar] = useState<GuiaResumen | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>((useLocation().state as { aviso?: string } | null)?.aviso ?? null);

  const ollas = useCarga("ollas:todas", () => operativoApi.listarOllas({}), TTL_CORTO, []);
  const transportistas = useCarga("transportistas", () => operativoApi.listarTransportistas(), TTL_CORTO, []);
  const guias = useCarga(
    `guias:${ollaId}:${transportistaId}:${desde}:${hasta}`,
    () => operativoApi.listarGuias({ page: 1, per_page: 100, olla_id: ollaId, transportista_id: transportistaId, desde, hasta }),
    TTL_CORTO, [ollaId, transportistaId, desde, hasta],
  );

  const nombreOlla = useMemo(() => (id: number) => ollas.datos?.find((o) => o.id === id)?.nombre ?? `Olla #${id}`, [ollas.datos]);
  const locales = useGuiasLocales(nombreOlla);
  const todas = useMemo(() => [...locales, ...(guias.datos?.items ?? [])], [locales, guias.datos]);
  const porEstado = (e: EstadoFsm) => todas.filter((g) => g.estado_fsm === e);

  async function despachar(g: GuiaResumen) {
    if (!usuario) return;
    setErrorAccion(null);
    try {
      const r = await transicionarConCola(usuario.id, g.id, "DESPACHADO");
      setAviso(r.encolada ? "Sin conexión: el despacho se guardó en el dispositivo y se enviará al reconectar." : `Guía #${g.id} marcada como despachada.`);
      setConfirmar(null);
      guias.recargar();
    } catch (e) {
      setErrorAccion(mensajeDeError(e, "No pudimos registrar el despacho."));
    }
  }

  if (guias.cargando && !guias.datos) return <CargandoVista filas={4} />;
  if (guias.error && !guias.datos) return <ErrorConReintento mensaje={guias.error} onReintentar={guias.recargar} />;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Tablero de custodia (FSM)</h1>
          <p className="text-sm text-muted">Programado → Despachado → En tránsito → Recepcionado</p>
        </div>
        <Link to="/almacen/guias/nueva" className="btn-primary gap-2"><Icono nombre="caja" /> Nueva guía</Link>
      </div>

      <DatosAl fecha={guias.deCache} />
      {aviso && <p role="status" className="mb-3 rounded border border-success bg-success-light p-3 text-sm text-success">{aviso}</p>}

      <form className="card mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Filtros" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label className="label-field" htmlFor="f-olla">Olla</label>
          <select id="f-olla" className="input-field" value={f.get("olla")} onChange={(e) => f.set({ olla: e.target.value })}>
            <option value="">Todas</option>
            {ollas.datos?.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="label-field" htmlFor="f-transp">Transportista</label>
          <select id="f-transp" className="input-field" value={f.get("transportista")} onChange={(e) => f.set({ transportista: e.target.value })}>
            <option value="">Todos</option>
            {transportistas.datos?.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="label-field" htmlFor="f-desde">Desde</label>
          <input id="f-desde" type="date" className="input-field" value={f.get("desde")} onChange={(e) => f.set({ desde: e.target.value })} />
        </div>
        <div>
          <label className="label-field" htmlFor="f-hasta">Hasta</label>
          <input id="f-hasta" type="date" className="input-field" value={f.get("hasta")} onChange={(e) => f.set({ hasta: e.target.value })} />
        </div>
      </form>

      {/* Móvil: pestañas por estado */}
      <div role="tablist" aria-label="Estados" className="mb-3 flex gap-1 overflow-x-auto lg:hidden">
        {ORDEN_FSM.map((e) => (
          <button key={e} role="tab" aria-selected={pestana === e} onClick={() => setPestana(e)}
            className={`toque shrink-0 rounded border px-3 text-sm font-medium ${pestana === e ? "border-primary bg-primary-light text-primary-dark" : "border-border bg-surface text-muted"}`}>
            {ETIQUETA_FSM[e]} ({porEstado(e).length})
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {ORDEN_FSM.map((e) => (
          <section key={e} aria-label={ETIQUETA_FSM[e]} className={`${pestana === e ? "" : "hidden"} lg:block`}>
            <h2 className="mb-2 hidden items-center justify-between lg:flex">
              <BadgeFsm estado={e} /> <span className="text-sm text-muted">{porEstado(e).length}</span>
            </h2>
            <ul className="flex flex-col gap-3">
              {porEstado(e).length === 0 && <li className="card text-sm text-muted">Sin guías en este estado.</li>}
              {porEstado(e).map((g) => (
                <li key={g.id} className="card flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{g.pendiente_sincronizar ? "Guía local" : `Guía #${g.id}`}</p>
                    {g.pendiente_sincronizar && (
                      <span className="inline-flex items-center gap-1 rounded-sm bg-info-light px-2 py-0.5 text-xs font-medium text-info">
                        <Icono nombre="bandeja" className="h-3.5 w-3.5" /> Pendiente de sincronizar
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-ink">{g.olla_nombre}</p>
                  <p className="text-sm text-muted">{g.num_items} ítem{g.num_items === 1 ? "" : "s"} · {g.transportista_nombre ?? "Sin transportista"} · {fecha(g.fecha_generacion)}</p>
                  <div className="flex flex-wrap gap-2">
                    {!g.pendiente_sincronizar && <button className="btn-secondary h-11" onClick={() => navegar(`/almacen/guias/${g.id}`)}>Ver detalle</button>}
                    {!g.pendiente_sincronizar && g.estado_fsm === "PROGRAMADO" && TRANSICIONES[g.estado_fsm] === "DESPACHADO" && (
                      <button className="btn-primary h-11" onClick={() => setConfirmar(g)}>Marcar DESPACHADO</button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <Modal abierto={!!confirmar} tituloId="titulo-despacho" onCerrar={() => setConfirmar(null)}>
        <h2 id="titulo-despacho" className="text-lg font-semibold">Confirmar despacho</h2>
        <p className="mt-2 text-sm">La guía #{confirmar?.id} de {confirmar?.olla_nombre} pasará a DESPACHADO. Esta acción no se puede deshacer.</p>
        {errorAccion && <p role="alert" className="mt-2 text-sm text-danger">{errorAccion}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => setConfirmar(null)}>Cancelar</button>
          <button className="btn-primary" onClick={() => confirmar && despachar(confirmar)}>Confirmar</button>
        </div>
      </Modal>
    </div>
  );
}

import { useState } from "react";
import { CargandoVista, ErrorConReintento } from "../../components/ui/Estados";
import { DatosAl } from "../../components/ui/DatosAl";
import { EmptyState } from "../../components/ui/EmptyState";
import { Paginador } from "../../components/ui/Paginador";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Tabla } from "../../components/ui/Tabla";
import { useCarga } from "../../hooks/useCarga";
import { useFiltrosUrl } from "../../hooks/usePaginacion";
import { fechaHora, horasEntre, numero } from "../../lib/formatos";
import { TTL_CORTO, TTL_LARGO } from "../../lib/offline/cacheLectura";
import { operativoApi } from "../../services/operativo";
import { ApiError } from "../../services/http";
import type { GuiaResumen, Liquidacion } from "../../types/operativo";

function Dfis({ pct }: { pct: number }) {
  const tono = pct > 10 ? "peligro" : pct > 5 ? "alerta" : "exito";
  const t = pct > 10 ? "Diferencia alta" : pct > 5 ? "Diferencia" : "Conforme";
  return <StatusBadge estado={t} tono={tono} etiqueta={`${numero(pct)} % · ${t}`} />;
}

const tLiq = (l: Liquidacion) => (l.fecha_recepcion ? horasEntre(l.fecha_recepcion, l.fecha_liquidacion) : null);

function PorLiquidar({ alLiquidar }: { alLiquidar: () => void }) {
  const pend = useCarga("liq:pendientes", () => operativoApi.listarGuias({ sin_liquidar: true, page: 1, per_page: 50 }), TTL_CORTO, []);
  const [liquidando, setLiquidando] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const items = pend.datos?.items ?? [];

  async function liquidar(g: GuiaResumen) {
    setLiquidando(g.id);
    setError(null);
    try {
      await operativoApi.liquidarGuia(g.id);
      pend.recargar();
      alLiquidar();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos liquidar la guía.");
    } finally {
      setLiquidando(null);
    }
  }

  if (pend.datos && items.length === 0) return null;
  return (
    <section className="card flex flex-col gap-3" aria-label="Guías por liquidar">
      <div>
        <h2 className="text-lg font-semibold">Por liquidar</h2>
        <p className="text-sm text-muted">Guías ya recepcionadas. Al liquidar se cierra la guía y se registra t_liq en la bitácora.</p>
      </div>
      {pend.cargando && !pend.datos && <CargandoVista filas={2} />}
      {pend.error && !pend.datos && <ErrorConReintento mensaje={pend.error} onReintentar={pend.recargar} />}
      {error && <p role="alert" className="text-sm font-medium text-danger">{error}</p>}
      <ul className="flex flex-col gap-2">
        {items.map((g) => (
          <li key={g.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
            <span className="text-sm"><strong>Guía #{g.id}</strong> · {g.olla_nombre} · {g.num_items} ítems · emitida {fechaHora(g.fecha_generacion)}</span>
            <button type="button" className="btn-primary" disabled={liquidando !== null || !navigator.onLine} onClick={() => liquidar(g)}>
              {liquidando === g.id ? "Liquidando…" : "Liquidar"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function LiquidacionPage() {
  const f = useFiltrosUrl(25);
  const desde = f.get("desde") || undefined;
  const hasta = f.get("hasta") || undefined;
  const olla = Number(f.get("olla")) || undefined;
  const ollas = useCarga("ollas:todas", () => operativoApi.listarOllas({}), TTL_LARGO, []);
  const lista = useCarga(`liq:${desde}:${hasta}:${olla}:${f.page}`,
    () => operativoApi.listarLiquidaciones({ desde, hasta, olla_id: olla, page: f.page, per_page: f.per_page }),
    TTL_CORTO, [desde, hasta, olla, f.page]);

  const items = lista.datos?.items ?? [];
  const promedio = items.length ? items.reduce((s, l) => s + l.d_fis_pct, 0) / items.length : null;
  const conDiferencia = items.filter((l) => l.d_fis_pct > 5).length;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Liquidación de guías</h1>
        <p className="text-sm text-muted">Guías cerradas: tiempo de liquidación (t_liq) y diferencia física (D_fis).</p>
      </div>

      <PorLiquidar alLiquidar={lista.recargar} />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card"><p className="text-sm text-muted">Guías liquidadas</p><p className="text-2xl font-semibold">{lista.datos?.total ?? "—"}</p></div>
        <div className="card"><p className="text-sm text-muted">D_fis promedio (página)</p><p className="text-2xl font-semibold">{promedio === null ? "—" : `${numero(promedio)} %`}</p></div>
        <div className="card"><p className="text-sm text-muted">Con diferencia &gt; 5 % (página)</p><p className="text-2xl font-semibold">{conDiferencia}</p></div>
      </div>

      <form className="card grid gap-3 sm:grid-cols-3" aria-label="Filtros" onSubmit={(e) => e.preventDefault()}>
        <div><label className="label-field" htmlFor="l-desde">Desde</label><input id="l-desde" type="date" className="input-field" value={f.get("desde")} onChange={(e) => f.set({ desde: e.target.value })} /></div>
        <div><label className="label-field" htmlFor="l-hasta">Hasta</label><input id="l-hasta" type="date" className="input-field" value={f.get("hasta")} onChange={(e) => f.set({ hasta: e.target.value })} /></div>
        <div>
          <label className="label-field" htmlFor="l-olla">Olla</label>
          <select id="l-olla" className="input-field" value={f.get("olla")} onChange={(e) => f.set({ olla: e.target.value })}>
            <option value="">Todas</option>{ollas.datos?.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
          </select>
        </div>
      </form>

      <DatosAl fecha={lista.deCache} />
      {lista.cargando && !lista.datos && <CargandoVista />}
      {lista.error && !lista.datos && <ErrorConReintento mensaje={lista.error} onReintentar={lista.recargar} />}
      {lista.datos && items.length === 0 && <EmptyState titulo="Sin guías liquidadas" descripcion="Aún no hay guías cerradas en este periodo." />}
      {lista.datos && items.length > 0 && (
        <>
          <Tabla<Liquidacion>
            caption="Guías liquidadas"
            filas={items}
            clave={(l) => l.guia_id}
            columnas={[
              { clave: "g", titulo: "Guía", render: (l) => `#${l.guia_id}` },
              { clave: "o", titulo: "Olla", render: (l) => l.olla_nombre },
              { clave: "d", titulo: "Despacho", render: (l) => fechaHora(l.fecha_despacho) },
              { clave: "r", titulo: "Recepción", render: (l) => fechaHora(l.fecha_recepcion) },
              { clave: "l", titulo: "Liquidación", render: (l) => fechaHora(l.fecha_liquidacion) },
              { clave: "t", titulo: "t_liq (h)", render: (l) => (tLiq(l) === null ? "—" : numero(tLiq(l)!)), className: "text-right" },
              { clave: "f", titulo: "D_fis", render: (l) => <Dfis pct={l.d_fis_pct} /> },
            ]}
            tarjeta={(l) => (
              <div className="flex flex-col gap-1 text-sm">
                <p className="text-base font-medium">Guía #{l.guia_id} · {l.olla_nombre}</p>
                <p>Recepción: {fechaHora(l.fecha_recepcion)}</p>
                <p>Liquidación: {fechaHora(l.fecha_liquidacion)} · t_liq: {tLiq(l) === null ? "—" : `${numero(tLiq(l)!)} h`}</p>
                <Dfis pct={l.d_fis_pct} />
              </div>
            )}
          />
          <Paginador page={f.page} perPage={f.per_page} total={lista.datos.total} onCambiar={f.setPage} />
        </>
      )}
    </div>
  );
}

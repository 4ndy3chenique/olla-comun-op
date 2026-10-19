import { CargandoVista, ErrorConReintento } from "../../components/ui/Estados";
import { DatosAl } from "../../components/ui/DatosAl";
import { Icono } from "../../components/ui/Icono";
import { Tabla } from "../../components/ui/Tabla";
import { useCarga } from "../../hooks/useCarga";
import { useFiltrosUrl } from "../../hooks/usePaginacion";
import { fecha, numero } from "../../lib/formatos";
import { TTL_LARGO } from "../../lib/offline/cacheLectura";
import { calcularEins } from "../../lib/nutricion";
import { operativoApi } from "../../services/operativo";
import type { Gramaje } from "../../types/operativo";
import { BalanceNutricional } from "./BalanceNutricional";

function lunesDe(d: Date): string {
  const x = new Date(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x.toISOString().slice(0, 10);
}

/** Menú semanal y gramajes (solo lectura: el cálculo lo hace el motor nutricional del backend). */
export default function MenuSemanalPage() {
  const f = useFiltrosUrl();
  const semana = f.get("semana") || lunesDe(new Date());
  const ollas = useCarga("ollas:todas", () => operativoApi.listarOllas({}), TTL_LARGO, []);
  const ollaId = Number(f.get("olla")) || ollas.datos?.[0]?.id;
  const menu = useCarga(ollaId ? `menu:${ollaId}:${semana}` : null, () => (ollaId ? operativoApi.obtenerMenuSemanal({ olla_id: ollaId, semana }) : Promise.resolve(null)), TTL_LARGO, [ollaId, semana]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold">Menú semanal y gramajes</h1>
        <p className="text-sm text-muted">Planificación y control de raciones. Solo lectura.</p>
      </div>

      <form className="card grid gap-3 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()} aria-label="Filtros">
        <div>
          <label className="label-field" htmlFor="m-olla">Olla</label>
          <select id="m-olla" className="input-field" value={ollaId ?? ""} onChange={(e) => f.set({ olla: e.target.value })}>
            {ollas.datos?.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="label-field" htmlFor="m-semana">Semana (lunes)</label>
          <input id="m-semana" type="date" className="input-field" value={semana} onChange={(e) => e.target.value && f.set({ semana: lunesDe(new Date(e.target.value + "T00:00:00")) })} />
        </div>
      </form>

      {menu.cargando && !menu.datos && <CargandoVista />}
      {menu.error && !menu.datos && <ErrorConReintento mensaje={menu.error} onReintentar={menu.recargar} />}
      {menu.datos && (
        <>
          <DatosAl fecha={menu.deCache} />
          <section aria-label="Raciones programadas">
            <h2 className="mb-2 text-lg font-semibold">Raciones programadas</h2>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {menu.datos.programaciones.map((p) => (
                <li key={p.id} className="card flex flex-col gap-1">
                  <p className="font-medium">{new Date(p.fecha + "T00:00:00").toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "short" })}</p>
                  <p className="text-sm text-muted">{p.tipo_racion}</p>
                  <p className="text-ink">{numero(p.kcal_total_calculada, 0)} kcal</p>
                  <p className={`flex items-center gap-1.5 text-sm font-medium ${p.cumple_rango_optimo ? "text-success" : "text-danger"}`}>
                    <Icono nombre={p.cumple_rango_optimo ? "check" : "alerta"} className="h-4 w-4" />
                    {p.cumple_rango_optimo ? "En rango" : "Fuera de rango"}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section aria-label="Insumos">
            <h2 className="mb-2 text-lg font-semibold">Insumos de la semana (semana del {fecha(semana + "T00:00:00")})</h2>
            <Tabla<Gramaje>
              caption="Gramajes calculados"
              filas={menu.datos.gramajes}
              clave={(g) => g.id}
              columnas={[
                { clave: "i", titulo: "Insumo", render: (g) => g.insumo },
                { clave: "c", titulo: "kg calculado", render: (g) => numero(g.kg_calculado, 3), className: "text-right" },
                { clave: "r", titulo: "kg real usado", render: (g) => (g.kg_real_usado == null ? "—" : numero(g.kg_real_usado, 3)), className: "text-right" },
                { clave: "d", titulo: "Desviación", render: (g) => { const e = calcularEins(g); return e === null ? "—" : `${numero(e)} %`; }, className: "text-right" },
              ]}
              tarjeta={(g) => {
                const e = calcularEins(g);
                return (
                  <div className="flex flex-col gap-1 text-sm">
                    <p className="text-base font-medium">{g.insumo}</p>
                    <p>Calculado: {numero(g.kg_calculado, 3)} kg</p>
                    <p>Real usado: {g.kg_real_usado == null ? "—" : `${numero(g.kg_real_usado, 3)} kg`}</p>
                    <p>Desviación: {e === null ? "—" : `${numero(e)} %`}</p>
                  </div>
                );
              }}
            />
          </section>

          <BalanceNutricional programaciones={menu.datos.programaciones} gramajes={menu.datos.gramajes} />
        </>
      )}
    </div>
  );
}

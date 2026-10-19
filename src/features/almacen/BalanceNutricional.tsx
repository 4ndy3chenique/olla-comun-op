import { BarraHorizontal } from "../../components/ui/BarraHorizontal";
import type { Tono } from "../../components/ui/StatusBadge";
import { calcularEins, calcularEinsGlobal, calcularPcal } from "../../lib/nutricion";
import type { Gramaje, Programacion } from "../../types/operativo";

/** Metas opcionales (no están en el repositorio): vacías = sin semáforo, solo el valor. */
const META_PCAL = Number(import.meta.env.VITE_META_PCAL) || null;
const META_EINS = Number(import.meta.env.VITE_META_EINS) || null;

export function BalanceNutricional({ programaciones, gramajes }: { programaciones: Programacion[]; gramajes: Gramaje[] }) {
  const pcal = calcularPcal(programaciones);
  const eins = calcularEinsGlobal(gramajes);
  const tonoPcal: Tono = pcal === null || META_PCAL === null ? "info" : pcal >= META_PCAL ? "exito" : "peligro";
  const tonoEins = (v: number | null): Tono => (v === null || META_EINS === null ? "info" : v <= META_EINS ? "exito" : "alerta");

  return (
    <section className="card flex flex-col gap-4" aria-label="Balance nutricional">
      <h2 className="text-lg font-semibold">Balance nutricional de la semana</h2>
      <BarraHorizontal etiqueta="Balance calórico (P_cal): raciones en rango óptimo" valor={pcal} tono={tonoPcal} />
      <BarraHorizontal etiqueta="Desviación de insumos (E_ins) global" valor={eins} max={Math.max(25, eins ?? 0)} tono={tonoEins(eins)} />
      <p className="text-sm text-muted">
        {META_PCAL === null && META_EINS === null
          ? "Las metas de P_cal y E_ins no están configuradas; se muestra solo el valor."
          : `Metas: P_cal ≥ ${META_PCAL ?? "—"} %, E_ins ≤ ${META_EINS ?? "—"} %.`}
      </p>

      <h3 className="mt-2 text-base font-semibold">Desviación por insumo</h3>
      <div className="flex flex-col gap-3">
        {gramajes.map((g) => {
          const e = calcularEins(g);
          return <BarraHorizontal key={g.id} etiqueta={g.insumo} valor={e} max={Math.max(25, e ?? 0)} tono={tonoEins(e)} texto={e === null ? "Sin kg reales" : `${e.toFixed(1)} %`} />;
        })}
      </div>
    </section>
  );
}

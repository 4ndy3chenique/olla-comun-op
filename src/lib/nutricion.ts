import type { Gramaje, Programacion } from "../types/operativo";

/** P_cal: % de programaciones con cumple_rango_optimo = true. */
export const calcularPcal = (p: Programacion[]): number | null =>
  p.length === 0 ? null : (p.filter((x) => x.cumple_rango_optimo).length / p.length) * 100;

/** E_ins por insumo: |kg_real_usado − kg_calculado| / kg_calculado × 100. null si aún no hay dato real. */
export const calcularEins = (g: Gramaje): number | null =>
  g.kg_real_usado == null || g.kg_calculado === 0 ? null : (Math.abs(g.kg_real_usado - g.kg_calculado) / g.kg_calculado) * 100;

/** E_ins global: promedio ponderado por kg_calculado de los insumos con dato. */
export function calcularEinsGlobal(gs: Gramaje[]): number | null {
  const con = gs.filter((g) => calcularEins(g) !== null);
  const peso = con.reduce((s, g) => s + g.kg_calculado, 0);
  if (peso === 0) return null;
  return con.reduce((s, g) => s + (calcularEins(g) as number) * g.kg_calculado, 0) / peso;
}

/** D_fis = |despachada − recepcionada| / despachada × 100. */
export const calcularDfis = (despachada: number, recepcionada: number | null): number | null =>
  recepcionada == null || despachada === 0 ? null : (Math.abs(despachada - recepcionada) / despachada) * 100;

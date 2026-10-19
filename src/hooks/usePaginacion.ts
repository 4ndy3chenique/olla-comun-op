import { useSearchParams } from "react-router-dom";

/** Filtros y paginación en la URL (compartible y sobrevive a recargas). */
export function useFiltrosUrl(porPagina = 25) {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  const get = (k: string) => params.get(k) ?? "";
  const set = (cambios: Record<string, string | undefined>, reiniciarPagina = true) => {
    const n = new URLSearchParams(params);
    for (const [k, v] of Object.entries(cambios)) {
      if (v) n.set(k, v);
      else n.delete(k);
    }
    if (reiniciarPagina && !("page" in cambios)) n.delete("page");
    setParams(n, { replace: true });
  };
  return { page, per_page: porPagina, get, set, setPage: (p: number) => set({ page: String(p) }, false) };
}

interface Props { page: number; perPage: number; total: number; onCambiar: (p: number) => void }

export function Paginador({ page, perPage, total, onCambiar }: Props) {
  const paginas = Math.max(1, Math.ceil(total / perPage));
  if (total <= perPage) return <p className="mt-3 text-sm text-muted">{total} resultado{total === 1 ? "" : "s"}</p>;
  return (
    <nav aria-label="Paginación" className="mt-4 flex items-center justify-between gap-3">
      <button className="btn-secondary h-11" disabled={page <= 1} onClick={() => onCambiar(page - 1)}>Anterior</button>
      <p className="text-sm text-muted" aria-live="polite">Página {page} de {paginas} · {total} resultados</p>
      <button className="btn-secondary h-11" disabled={page >= paginas} onClick={() => onCambiar(page + 1)}>Siguiente</button>
    </nav>
  );
}

interface EmptyStateProps {
  titulo: string;
  descripcion: string;
  accion?: { etiqueta: string; onClick: () => void };
  /** true cuando el estado vacío ES el contenido de la página (lleva el h1); si no, es un h2 dentro de ella. */
  pagina?: boolean;
}

export function EmptyState({ titulo, descripcion, accion, pagina }: EmptyStateProps) {
  const Titulo = pagina ? "h1" : "h2";
  return (
    <div className="card flex flex-col items-center gap-2 py-10 text-center">
      <Titulo className="text-base font-medium text-ink">{titulo}</Titulo>
      <p className="max-w-sm text-sm text-muted">{descripcion}</p>
      {accion && (
        <button onClick={accion.onClick} className="btn-secondary mt-3">
          {accion.etiqueta}
        </button>
      )}
    </div>
  );
}

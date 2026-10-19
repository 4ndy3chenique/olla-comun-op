import { Icono } from "./Icono";

/** Bloque gris pulsante para estados de carga. */
export function Esqueleto({ className = "h-5 w-full" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded bg-border/70 ${className}`} />;
}

/** Carga de una vista de lista/tarjetas: título + tarjetas esqueleto. El texto es para lectores de pantalla. */
export function CargandoVista({ filas = 3 }: { filas?: number }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Cargando…</span>
      <Esqueleto className="h-7 w-56" />
      <Esqueleto className="mt-3 h-4 w-80 max-w-full" />
      <div className="mt-6 flex flex-col gap-3">
        {Array.from({ length: filas }, (_, i) => (
          <Esqueleto key={i} className="h-20 w-full" />
        ))}
      </div>
    </div>
  );
}

/** Error de carga con reintento. */
export function ErrorConReintento({ mensaje, onReintentar }: { mensaje: string; onReintentar?: () => void }) {
  return (
    <div role="alert" className="card flex flex-col items-start gap-3 border-danger-light bg-danger-light">
      <p className="flex items-start gap-2 text-danger">
        <Icono nombre="alerta" className="mt-0.5 h-5 w-5" />
        {mensaje}
      </p>
      {onReintentar && (
        <button className="btn-secondary h-11" onClick={onReintentar}>
          Reintentar
        </button>
      )}
    </div>
  );
}

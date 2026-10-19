import type { Tono } from "./StatusBadge";

const COLOR: Record<Tono, string> = {
  neutro: "bg-muted",
  exito: "bg-success",
  alerta: "bg-accent",
  peligro: "bg-danger",
  info: "bg-info",
};

interface Props {
  etiqueta: string;
  valor: number | null;
  /** Máximo de la escala (por defecto 100). */
  max?: number;
  tono?: Tono;
  /** Texto a la derecha; si falta se formatea el valor. */
  texto?: string;
}

/** Barra horizontal sin librerías: etiqueta + barra + valor en texto (el valor nunca depende del color). */
export function BarraHorizontal({ etiqueta, valor, max = 100, tono = "info", texto }: Props) {
  const pct = valor === null ? 0 : Math.min(100, Math.max(0, (valor / max) * 100));
  return (
    <div>
      <div className="mb-1 flex justify-between gap-2 text-sm">
        <span className="font-medium text-ink">{etiqueta}</span>
        <span className="text-ink">{texto ?? (valor === null ? "Sin datos" : `${valor.toFixed(1)} %`)}</span>
      </div>
      <div role="img" aria-label={`${etiqueta}: ${texto ?? (valor === null ? "sin datos" : valor.toFixed(1) + " %")}`} className="h-3 w-full overflow-hidden rounded-sm bg-border/70">
        <div className={`h-full rounded-sm ${COLOR[tono]}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

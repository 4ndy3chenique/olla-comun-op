import { Icono } from "./Icono";

/** Etiqueta "Datos al <fecha>" cuando lo mostrado proviene de la caché cifrada sin conexión. */
export function DatosAl({ fecha }: { fecha: Date | null }) {
  if (!fecha) return null;
  return (
    <p role="status" className="mb-3 flex items-center gap-2 rounded border border-accent bg-accent-light px-3 py-2 text-sm font-medium text-accent-dark">
      <Icono nombre="reloj" className="h-4 w-4" />
      Datos al {fecha.toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })} (sin conexión)
    </p>
  );
}

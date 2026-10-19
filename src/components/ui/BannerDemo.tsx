import { Icono } from "./Icono";

export function BannerDemo() {
  return (
    <p role="note" className="flex items-center gap-2 rounded border border-accent bg-accent-light px-3 py-2 text-sm font-medium text-accent-dark">
      <Icono nombre="alerta" className="h-4 w-4" /> MODO DEMO: datos simulados; los endpoints operativos aún no existen en la API.
    </p>
  );
}

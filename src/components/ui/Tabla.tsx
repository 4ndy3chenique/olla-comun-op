import type { ReactNode } from "react";

export interface Columna<T> {
  clave: string;
  titulo: string;
  render: (fila: T) => ReactNode;
  /** Clases extra de celda (p. ej. text-right). */
  className?: string;
}

interface Props<T> {
  caption: string;
  columnas: Columna<T>[];
  filas: T[];
  clave: (fila: T) => string | number;
  /** Render para móvil (<lg): tarjeta por fila. Si falta, la tabla hace scroll interno. */
  tarjeta?: (fila: T) => ReactNode;
}

/** Tabla en escritorio, tarjetas apiladas en móvil (360 px). */
export function Tabla<T>({ caption, columnas, filas, clave, tarjeta }: Props<T>) {
  return (
    <>
      {tarjeta && (
        <ul className="flex flex-col gap-3 lg:hidden" aria-label={caption}>
          {filas.map((f) => <li key={clave(f)} className="card">{tarjeta(f)}</li>)}
        </ul>
      )}
      <div className={`${tarjeta ? "hidden lg:block" : ""} overflow-x-auto rounded-lg border border-border bg-surface`}>
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b border-border bg-bg text-muted">
            <tr>{columnas.map((c) => <th key={c.clave} scope="col" className={`px-4 py-3 font-medium ${c.className ?? ""}`}>{c.titulo}</th>)}</tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={clave(f)} className="border-b border-border last:border-0">
                {columnas.map((c) => <td key={c.clave} className={`px-4 py-3 align-top text-ink ${c.className ?? ""}`}>{c.render(f)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

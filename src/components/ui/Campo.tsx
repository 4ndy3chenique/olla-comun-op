import type { ReactNode } from "react";

interface CampoProps {
  id: string;
  etiqueta: string;
  error?: string;
  ayuda?: ReactNode;
  children: ReactNode;
}

/** Etiqueta visible + control + mensaje de error asociado (el control debe usar aria-describedby con `${id}-error`). */
export function Campo({ id, etiqueta, error, ayuda, children }: CampoProps) {
  return (
    <div>
      <label className="label-field" htmlFor={id}>
        {etiqueta}
      </label>
      {children}
      {ayuda && !error && <div className="mt-1 text-sm text-muted">{ayuda}</div>}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 flex items-start gap-1.5 text-sm text-danger">
          <span aria-hidden>✖</span>
          {error}
        </p>
      )}
    </div>
  );
}

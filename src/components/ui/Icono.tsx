import type { ReactNode } from "react";

/** Iconos SVG inline (trazo). Decorativos por defecto: si el icono es el único contenido, pasar `titulo`. */
const RUTAS: Record<string, ReactNode> = {
  reloj: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  arena: (<><path d="M6 2h12M6 22h12" /><path d="M7 2v4l5 6-5 6v4M17 2v4l-5 6 5 6v4" /></>),
  alerta: (<><path d="M12 3 2 21h20z" /><path d="M12 10v5M12 18h.01" /></>),
  check: (<><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>),
  equis: (<><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6M15 9l-6 6" /></>),
  info: (<><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5h.01" /></>),
  planilla: (<><rect x="6" y="4" width="12" height="17" rx="2" /><path d="M9 4h6v3H9zM9 12h6M9 16h6" /></>),
  familia: (<><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17" cy="9" r="2.5" /><path d="M16 14.2c2.9.3 5 2.6 5 5.8" /></>),
  nutricion: (<><path d="M12 7c-2-2-6-1-6 4 0 5 3 9 6 9s6-4 6-9c0-5-4-6-6-4z" /><path d="M12 7c0-2 1-3 3-4" /></>),
  campana: (<><path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 21h4" /></>),
  usuario: (<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></>),
  historial: (<><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5M12 8v4l3 2" /></>),
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  cerrar: <path d="m6 6 12 12M18 6 6 18" />,
  escudo: (<><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" /><path d="m9 12 2 2 4-4" /></>),
  wifi: (<><path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01" /></>),
  wifiOff: (<><path d="M5 12.5a10 10 0 0 1 5-2.7M8.5 16a5 5 0 0 1 7 0M12 19.5h.01M2 9a15 15 0 0 1 4-2.8M3 3l18 18" /></>),
  salir: (<><path d="M9 21H5V3h4M16 17l5-5-5-5M21 12H9" /></>),
  tilde: <path d="m5 12 5 5 9-10" />,
  bandeja: (<><path d="M3 13l3-8h12l3 8v6H3z" /><path d="M3 13h5l1 3h6l1-3h5" /></>),
  abajo: <path d="m6 9 6 6 6-6" />,
  olla: (<><path d="M5 11h14v5a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5z" /><path d="M4 11h16M2 14h2M20 14h2M9 7c-1-1.5 1-2 0-3.5M13 7c-1-1.5 1-2 0-3.5" /></>),
  camara: (<><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>),
  qr: (<><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" /><path d="M14 14h3v3h-3zM20 14v.01M14 20h3M20 17v3" /></>),
  camion: (<><path d="M2 6h11v10H2zM13 10h4l3 3v3h-7" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></>),
  caja: (<><path d="M3 7l9-4 9 4v10l-9 4-9-4z" /><path d="M3 7l9 4 9-4M12 11v10" /></>),
  descarga: (<><path d="M12 4v11m0 0-4-4m4 4 4-4M4 20h16" /></>),
  buscar: (<><circle cx="11" cy="11" r="6.5" /><path d="m16 16 5 5" /></>),
  candado: (<><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>),
  tablero: (<><rect x="3" y="4" width="5" height="16" rx="1" /><rect x="10" y="4" width="5" height="10" rx="1" /><rect x="17" y="4" width="4" height="13" rx="1" /></>),
  menuSemana: (<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>),
  bitacora: (<><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5M9 13h7M9 17h7" /></>),
  ojo: (<><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>),
};

export type NombreIcono = keyof typeof RUTAS;

interface IconoProps {
  nombre: NombreIcono;
  className?: string;
  /** Solo si el icono comunica algo por sí solo (icono-botón sin texto). */
  titulo?: string;
}

export function Icono({ nombre, className = "h-5 w-5", titulo }: IconoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      role={titulo ? "img" : undefined}
      aria-label={titulo}
      aria-hidden={titulo ? undefined : true}
    >
      {RUTAS[nombre]}
    </svg>
  );
}

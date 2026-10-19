import { ETIQUETA_FSM, type EstadoFsm } from "../../lib/fsm";
import { Icono, type NombreIcono } from "./Icono";

export type Tono = "neutro" | "exito" | "alerta" | "peligro" | "info";

interface StatusBadgeProps {
  estado: string;
  tono: Tono;
  /** Por defecto el icono sale del tono. */
  icono?: NombreIcono;
  /** Texto a mostrar; por defecto se usa el estado tal cual. */
  etiqueta?: string;
}

const TONOS: Record<Tono, string> = {
  neutro: "bg-border/60 text-ink",
  exito: "bg-success-light text-success",
  alerta: "bg-accent-light text-accent-dark",
  peligro: "bg-danger-light text-danger",
  info: "bg-info-light text-info",
};

const ICONO_POR_TONO: Record<Tono, NombreIcono> = {
  neutro: "reloj",
  exito: "check",
  alerta: "alerta",
  peligro: "equis",
  info: "arena",
};

const TONO_FSM: Record<EstadoFsm, Tono> = { PROGRAMADO: "neutro", DESPACHADO: "info", EN_TRANSITO: "alerta", RECEPCIONADO: "exito" };
const ICONO_FSM: Record<EstadoFsm, NombreIcono> = { PROGRAMADO: "reloj", DESPACHADO: "caja", EN_TRANSITO: "camion", RECEPCIONADO: "check" };

/** Un estado nunca se comunica solo por color: siempre icono + texto. */
export function StatusBadge({ estado, tono, icono, etiqueta }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-sm font-medium ${TONOS[tono]}`}>
      <Icono nombre={icono ?? ICONO_POR_TONO[tono]} className="h-4 w-4" />
      {etiqueta ?? estado}
    </span>
  );
}

export function BadgeFsm({ estado }: { estado: EstadoFsm }) {
  return <StatusBadge estado={estado} tono={TONO_FSM[estado]} icono={ICONO_FSM[estado]} etiqueta={ETIQUETA_FSM[estado]} />;
}

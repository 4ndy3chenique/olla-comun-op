import { Link } from "react-router-dom";
import { BadgeFsm, StatusBadge } from "../../components/ui/StatusBadge";
import type { EstadoRuta, ParadaRuta } from "../../types/operativo";

const RUTA: Record<EstadoRuta, { tono: "neutro" | "info" | "exito"; texto: string }> = {
  ASIGNADA: { tono: "neutro", texto: "Asignada" },
  EN_CURSO: { tono: "info", texto: "En curso" },
  COMPLETADA: { tono: "exito", texto: "Completada" },
};

export function ParadaCard({ parada }: { parada: ParadaRuta }) {
  const { guia, olla } = parada;
  const r = RUTA[parada.estado_ruta];
  const mapa = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${olla.direccion}, ${olla.distrito}`)}`;

  return (
    <li className="card flex flex-col gap-3 border-2 border-ink">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{olla.nombre}</h2>
        <div className="flex flex-wrap gap-2">
          <StatusBadge estado={parada.estado_ruta} tono={r.tono} etiqueta={r.texto} />
          <BadgeFsm estado={guia.estado_fsm} />
        </div>
      </div>
      <p className="text-base text-ink">{olla.direccion} · {olla.distrito}</p>
      <p className="text-base text-ink">Guía #{guia.id} · {guia.items.length} ítem{guia.items.length === 1 ? "" : "s"}</p>

      <div className="flex flex-col gap-2 sm:flex-row">
        {guia.estado_fsm === "DESPACHADO" && (
          <Link className="btn-primary btn-campo flex-1" to={`/transporte/recepcion?guia=${guia.id}&modo=salida`}>Iniciar tránsito (escanear)</Link>
        )}
        {guia.estado_fsm === "EN_TRANSITO" && (
          <Link className="btn-primary btn-campo flex-1" to={`/transporte/recepcion?guia=${guia.id}&modo=recepcion`}>Escanear y recepcionar</Link>
        )}
        <a className="btn-secondary btn-campo" href={mapa} target="_blank" rel="noreferrer">Cómo llegar</a>
      </div>
    </li>
  );
}

import { Timeline, type Hito } from "../../components/ui/Timeline";
import { ETIQUETA_FSM, ORDEN_FSM, type EstadoFsm } from "../../lib/fsm";
import { fechaHora } from "../../lib/formatos";
import type { TransicionFsm } from "../../types/operativo";

export function FsmTimeline({ estado, transiciones }: { estado: EstadoFsm; transiciones: TransicionFsm[] }) {
  const idxActual = ORDEN_FSM.indexOf(estado);
  const de = (e: EstadoFsm) => transiciones.find((t) => t.estado_destino === e && t.es_transicion_valida);

  const hitos: Hito[] = ORDEN_FSM.map((e, i) => ({
    clave: e,
    etiqueta: ETIQUETA_FSM[e],
    estado: i < idxActual || estado === "RECEPCIONADO" ? "done" : i === idxActual ? "actual" : "pendiente",
    fecha: de(e) ? fechaHora(de(e)!.timestamp) : undefined,
    detalle: de(e)?.usuario_nombre,
  }));

  return (
    <section aria-label="Cadena de custodia">
      <Timeline hitos={hitos} orientacion="horizontal" />
      {transiciones.some((t) => !t.es_transicion_valida) && (
        <p role="alert" className="mt-3 rounded bg-danger-light p-3 text-sm text-danger">
          Se detectaron transiciones no válidas en esta guía. Revisa la bitácora de auditoría.
        </p>
      )}
    </section>
  );
}

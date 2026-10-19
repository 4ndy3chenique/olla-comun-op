import { useState } from "react";
import { EmptyState } from "../../components/ui/EmptyState";
import { Modal } from "../../components/ui/Modal";
import { StatusBadge, type Tono } from "../../components/ui/StatusBadge";
import { Tabla } from "../../components/ui/Tabla";
import { useAuth } from "../../context/AuthContext";
import { useConectividad } from "../../context/ConectividadContext";
import { useOperacionesCola } from "../../hooks/useCola";
import { fechaHora, idCorto } from "../../lib/formatos";
import { eliminarOperacion, reintentar, type EstadoCola, type OperacionCola } from "../../lib/offline/cola";
import { borrarTodo } from "../../lib/offline/db";
import type { TipoOperacion } from "../../types/operativo";

const TIPO: Record<TipoOperacion, string> = {
  EMISION_GUIA: "Emisión de guía", TRANSICION_FSM: "Cambio de estado", ESCANEO_QR: "Escaneo QR (salida)", RECEPCION: "Recepción",
};
const ESTADO: Record<EstadoCola, { tono: Tono; texto: string }> = {
  PENDIENTE: { tono: "info", texto: "Pendiente" },
  SINCRONIZANDO: { tono: "info", texto: "Sincronizando" },
  ERROR: { tono: "peligro", texto: "Error" },
  CONFLICTO: { tono: "alerta", texto: "Conflicto" },
};

export default function ColaSincronizacionPage() {
  const { usuario, rol } = useAuth();
  const { enLinea, sincronizarAhora, sincronizando } = useConectividad();
  const ops = useOperacionesCola();
  const soloLectura = rol === "AUDITOR" || rol === "ADMINISTRADOR";
  const [descartar, setDescartar] = useState<OperacionCola | null>(null);
  const [borrar, setBorrar] = useState(false);
  const hayError = ops.some((o) => o.estado === "ERROR");

  const accion = (o: OperacionCola) => {
    if (soloLectura) return null;
    return (
      <div className="flex flex-wrap gap-2">
        {o.estado === "ERROR" && <button className="btn-secondary h-11" onClick={() => reintentar(o.uuid)}>Reintentar</button>}
        {(o.estado === "ERROR" || o.estado === "CONFLICTO") && <button className="btn-secondary h-11 text-danger" onClick={() => setDescartar(o)}>Descartar</button>}
      </div>
    );
  };
  const estado = (o: OperacionCola) => <StatusBadge estado={o.estado} tono={ESTADO[o.estado].tono} etiqueta={ESTADO[o.estado].texto} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Cola de sincronización</h1>
          <p className="text-sm text-muted">Transacciones guardadas en este dispositivo (cifradas). Se identifican con UUIDv4 y no se duplican al reenviar.</p>
        </div>
        {!soloLectura && (
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" disabled={!enLinea || sincronizando} onClick={() => void sincronizarAhora()}>{sincronizando ? "Sincronizando…" : "Sincronizar ahora"}</button>
            {hayError && <button className="btn-secondary" onClick={() => reintentar()}>Reintentar errores</button>}
          </div>
        )}
      </div>

      {ops.length === 0 ? (
        <EmptyState titulo="No hay transacciones pendientes" descripcion="Todo lo que registres sin conexión aparecerá aquí hasta sincronizarse." />
      ) : (
        <Tabla<OperacionCola>
          caption="Transacciones locales"
          filas={ops}
          clave={(o) => o.uuid}
          columnas={[
            { clave: "u", titulo: "UUID", render: (o) => <button className="toque font-mono underline" title={o.uuid} onClick={() => navigator.clipboard?.writeText(o.uuid)}>{idCorto(o.uuid)}</button> },
            { clave: "t", titulo: "Tipo", render: (o) => TIPO[o.tipo] },
            { clave: "h", titulo: "Creada", render: (o) => fechaHora(o.creadoEn) },
            { clave: "i", titulo: "Intentos", render: (o) => o.intentos },
            { clave: "e", titulo: "Estado", render: estado },
            { clave: "x", titulo: "Último error", render: (o) => o.ultimoError ?? "—" },
            ...(soloLectura ? [] : [{ clave: "a", titulo: "Acciones", render: accion }]),
          ]}
          tarjeta={(o) => (
            <div className="flex flex-col gap-1 text-sm">
              <div className="flex items-center justify-between gap-2"><p className="text-base font-medium">{TIPO[o.tipo]}</p>{estado(o)}</div>
              <p>UUID <span className="font-mono">{idCorto(o.uuid)}</span> · {fechaHora(o.creadoEn)} · {o.intentos} intento(s)</p>
              {o.ultimoError && <p className="text-danger">{o.ultimoError}</p>}
              {o.usuarioId !== usuario?.id && <p className="text-accent-dark">Pertenece a otro usuario: no se envía con esta sesión.</p>}
              {accion(o)}
            </div>
          )}
        />
      )}

      {!soloLectura && (
        <section className="card" aria-label="Datos del dispositivo">
          <h2 className="text-base font-semibold">Datos del dispositivo</h2>
          <p className="mb-3 text-sm text-muted">Cerrar sesión no borra la cola. Esta opción elimina la cola, la caché y las claves de este dispositivo.</p>
          <button className="btn-danger" onClick={() => setBorrar(true)}>Borrar datos del dispositivo</button>
        </section>
      )}

      <Modal abierto={!!descartar} tituloId="t-descartar" onCerrar={() => setDescartar(null)}>
        <h2 id="t-descartar" className="text-lg font-semibold">Descartar transacción</h2>
        <p className="mt-2 text-sm">Se eliminará "{descartar && TIPO[descartar.tipo]}" ({descartar && idCorto(descartar.uuid)}) y no se enviará al servidor. No se puede deshacer.</p>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => setDescartar(null)}>Cancelar</button>
          <button className="btn-danger" onClick={async () => { if (descartar) await eliminarOperacion(descartar.uuid); setDescartar(null); }}>Descartar</button>
        </div>
      </Modal>

      <Modal abierto={borrar} tituloId="t-borrar" onCerrar={() => setBorrar(false)}>
        <h2 id="t-borrar" className="text-lg font-semibold">Borrar datos del dispositivo</h2>
        <p className="mt-2 text-sm">Se perderán {ops.length} transacción(es) pendiente(s) y la caché sin conexión. Esta acción no se puede deshacer.</p>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => setBorrar(false)}>Cancelar</button>
          <button className="btn-danger" onClick={async () => { await borrarTodo(); setBorrar(false); window.dispatchEvent(new Event("cola-actualizada")); }}>Borrar todo</button>
        </div>
      </Modal>
    </div>
  );
}

import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CargandoVista, ErrorConReintento } from "../../components/ui/Estados";
import { DatosAl } from "../../components/ui/DatosAl";
import { StatusBadge, BadgeFsm } from "../../components/ui/StatusBadge";
import { Tabla } from "../../components/ui/Tabla";
import { useAuth } from "../../context/AuthContext";
import { useCarga } from "../../hooks/useCarga";
import { fechaHora, numero } from "../../lib/formatos";
import { TTL_CORTO } from "../../lib/offline/cacheLectura";
import { calcularDfis } from "../../lib/nutricion";
import { ApiError } from "../../services/http";
import { operativoApi } from "../../services/operativo";
import type { ItemGuia, TransicionFsm } from "../../types/operativo";
import { FsmTimeline } from "./FsmTimeline";
import { GuiaQrCard } from "./GuiaQrCard";

function AsignarTransportista({ guiaId, actual, alCambiar }: { guiaId: number; actual: number | null; alCambiar: () => void }) {
  const transportistas = useCarga("transportistas", () => operativoApi.listarTransportistas(), TTL_CORTO, []);
  const [elegido, setElegido] = useState<string>(actual ? String(actual) : "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    setGuardando(true);
    setError(null);
    try {
      await operativoApi.asignarTransportista(guiaId, Number(elegido));
      alCambiar();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos asignar el transportista.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="card flex flex-col gap-2" aria-label="Transportista">
      <label className="label-field" htmlFor="asignar-transp">{actual ? "Cambiar transportista" : "Asignar transportista"}</label>
      <div className="flex flex-wrap gap-2">
        <select id="asignar-transp" className="input-field max-w-xs" value={elegido} onChange={(e) => setElegido(e.target.value)}>
          <option value="">Selecciona…</option>
          {transportistas.datos?.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
        </select>
        <button type="button" className="btn-secondary" disabled={guardando || !elegido || Number(elegido) === actual || !navigator.onLine} onClick={guardar}>
          {guardando ? "Guardando…" : "Guardar"}
        </button>
      </div>
      {error && <p role="alert" className="text-sm font-medium text-danger">{error}</p>}
    </section>
  );
}

function BadgeDfis({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-muted">Sin recepción</span>;
  const tono = pct > 10 ? "peligro" : pct > 5 ? "alerta" : "exito";
  const texto = pct > 10 ? "Diferencia alta" : pct > 5 ? "Diferencia" : "Conforme";
  return <StatusBadge estado={texto} tono={tono} etiqueta={`${numero(pct)} % · ${texto}`} />;
}

export default function GuiaDetallePage() {
  const { id } = useParams();
  const guiaId = Number(id);
  const { rol } = useAuth();
  const [tokenNuevo, setTokenNuevo] = useState<string | null>(null);
  const g = useCarga(`guia:${guiaId}`, () => operativoApi.obtenerGuia(guiaId), TTL_CORTO, [guiaId]);

  if (g.cargando && !g.datos) return <CargandoVista />;
  if (g.error && !g.datos) return <ErrorConReintento mensaje={g.error} onReintentar={g.recargar} />;
  const guia = g.datos!;

  return (
    <div className="flex flex-col gap-5">
      <Link to="/almacen" className="toque text-sm font-medium text-primary underline">← Volver al tablero</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Guía #{guia.id}</h1>
        <BadgeFsm estado={guia.estado_fsm} />
      </div>
      <DatosAl fecha={g.deCache} />
      <p className="text-ink">{guia.olla_nombre} · Transportista: {guia.transportista_nombre ?? "sin asignar"} · Emitida {fechaHora(guia.fecha_generacion)}</p>

      {rol === "ALMACENERO" && (guia.estado_fsm === "PROGRAMADO" || guia.estado_fsm === "DESPACHADO") && (
        <AsignarTransportista key={guia.transportista_id ?? 0} guiaId={guia.id} actual={guia.transportista_id} alCambiar={g.recargar} />
      )}

      <section className="card" aria-label="Cadena de custodia">
        <FsmTimeline estado={guia.estado_fsm} transiciones={guia.transiciones} />
      </section>

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <section aria-label="Ítems">
          <h2 className="mb-2 text-lg font-semibold">Ítems y diferencia física (D_fis)</h2>
          <Tabla<ItemGuia>
            caption="Ítems de la guía"
            filas={guia.items}
            clave={(i) => i.insumo}
            columnas={[
              { clave: "insumo", titulo: "Insumo", render: (i) => i.insumo },
              { clave: "desp", titulo: "Despachado", render: (i) => `${numero(i.cantidad_despachada, 3)} ${i.unidad}`, className: "text-right" },
              { clave: "rec", titulo: "Recepcionado", render: (i) => (i.cantidad_recepcionada == null ? "—" : `${numero(i.cantidad_recepcionada, 3)} ${i.unidad}`), className: "text-right" },
              { clave: "dfis", titulo: "D_fis", render: (i) => <BadgeDfis pct={calcularDfis(i.cantidad_despachada, i.cantidad_recepcionada)} /> },
            ]}
            tarjeta={(i) => (
              <div className="flex flex-col gap-1">
                <p className="font-medium">{i.insumo}</p>
                <p className="text-sm">Despachado: {numero(i.cantidad_despachada, 3)} {i.unidad}</p>
                <p className="text-sm">Recepcionado: {i.cantidad_recepcionada == null ? "—" : `${numero(i.cantidad_recepcionada, 3)} ${i.unidad}`}</p>
                <BadgeDfis pct={calcularDfis(i.cantidad_despachada, i.cantidad_recepcionada)} />
              </div>
            )}
          />

          <h2 className="mb-2 mt-6 text-lg font-semibold">Historial de transiciones</h2>
          <Tabla<TransicionFsm>
            caption="Transiciones de la guía"
            filas={guia.transiciones}
            clave={(t) => t.id}
            columnas={[
              { clave: "fecha", titulo: "Fecha", render: (t) => fechaHora(t.timestamp) },
              { clave: "o", titulo: "De", render: (t) => t.estado_origen ?? "—" },
              { clave: "d", titulo: "A", render: (t) => t.estado_destino },
              { clave: "u", titulo: "Usuario", render: (t) => t.usuario_nombre ?? `#${t.usuario_id}` },
              { clave: "v", titulo: "Válida", render: (t) => <StatusBadge estado="v" tono={t.es_transicion_valida ? "exito" : "peligro"} etiqueta={t.es_transicion_valida ? "Válida" : "No válida"} /> },
            ]}
          />
        </section>

        <GuiaQrCard guiaId={guia.id} token={tokenNuevo ?? guia.token_qr} puedeRegenerar={rol === "ALMACENERO"} onToken={setTokenNuevo} />
      </div>
    </div>
  );
}

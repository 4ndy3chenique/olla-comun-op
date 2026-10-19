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
import { operativoApi } from "../../services/operativo";
import type { ItemGuia, TransicionFsm } from "../../types/operativo";
import { FsmTimeline } from "./FsmTimeline";
import { GuiaQrCard } from "./GuiaQrCard";

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

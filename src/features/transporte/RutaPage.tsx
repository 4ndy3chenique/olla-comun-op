import { CargandoVista, ErrorConReintento } from "../../components/ui/Estados";
import { DatosAl } from "../../components/ui/DatosAl";
import { EmptyState } from "../../components/ui/EmptyState";
import { useAuth } from "../../context/AuthContext";
import { useCarga } from "../../hooks/useCarga";
import { TTL_CORTO } from "../../lib/offline/cacheLectura";
import { operativoApi } from "../../services/operativo";
import { ParadaCard } from "./ParadaCard";

export const claveRuta = (usuarioId: number | undefined) => `ruta:${usuarioId}`;

export default function RutaPage() {
  const { usuario } = useAuth();
  const ruta = useCarga(claveRuta(usuario?.id), () => operativoApi.obtenerMiRuta(), TTL_CORTO, [usuario?.id]);

  if (ruta.cargando && !ruta.datos) return <CargandoVista />;
  if (ruta.error && !ruta.datos) return <ErrorConReintento mensaje={ruta.error} onReintentar={ruta.recargar} />;
  const paradas = ruta.datos ?? [];

  return (
    <div>
      <h1 className="text-2xl font-semibold">Mi ruta de entrega</h1>
      <p className="mb-4 text-base text-ink">{paradas.filter((p) => p.estado_ruta !== "COMPLETADA").length} parada(s) pendiente(s)</p>
      <DatosAl fecha={ruta.deCache} />
      {paradas.length === 0 ? (
        <EmptyState titulo="No tienes paradas asignadas" descripcion="Cuando el almacén te asigne una guía, aparecerá aquí." />
      ) : (
        <ul className="flex flex-col gap-4">{paradas.map((p) => <ParadaCard key={p.ruta_id} parada={p} />)}</ul>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { CargandoVista, ErrorConReintento } from "../../components/ui/Estados";
import { DatosAl } from "../../components/ui/DatosAl";
import { EmptyState } from "../../components/ui/EmptyState";
import { Paginador } from "../../components/ui/Paginador";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Tabla } from "../../components/ui/Tabla";
import { useCarga } from "../../hooks/useCarga";
import { useFiltrosUrl } from "../../hooks/usePaginacion";
import { fecha } from "../../lib/formatos";
import { TTL_LARGO } from "../../lib/offline/cacheLectura";
import { operativoApi } from "../../services/operativo";
import type { BeneficiarioMascarado } from "../../types/operativo";

function edad(nac: string) {
  const n = new Date(nac + "T00:00:00");
  const h = new Date();
  let e = h.getFullYear() - n.getFullYear();
  if (h < new Date(h.getFullYear(), n.getMonth(), n.getDate())) e--;
  return Number.isFinite(e) ? e : "—";
}

const ESTADO: Record<BeneficiarioMascarado["estado_padron"], { tono: "exito" | "alerta" | "neutro"; texto: string }> = {
  ACTIVO: { tono: "exito", texto: "Activo" },
  DUPLICADO: { tono: "alerta", texto: "Duplicado" },
  INACTIVO: { tono: "neutro", texto: "Inactivo" },
};

/** Padrón de beneficiarios (solo lectura). La API ya devuelve el DNI enmascarado; aquí no existe el DNI completo. */
export default function PadronPage() {
  const f = useFiltrosUrl(25);
  const [texto, setTexto] = useState(f.get("q"));
  const q = f.get("q");
  const olla = Number(f.get("olla")) || undefined;
  const estadoPadron = f.get("estado") || "ACTIVO";

  // búsqueda con debounce de 250 ms (nombre o últimos 4 dígitos del DNI)
  useEffect(() => {
    const t = setTimeout(() => { if (texto !== q) f.set({ q: texto || undefined }); }, 250);
    return () => clearTimeout(t);
  }, [texto]); // eslint-disable-line react-hooks/exhaustive-deps

  const ollas = useCarga("ollas:todas", () => operativoApi.listarOllas({}), TTL_LARGO, []);
  const lista = useCarga(`padron:${q}:${olla}:${estadoPadron}:${f.page}`,
    () => operativoApi.listarBeneficiarios({ q: q || undefined, olla_id: olla, estado: estadoPadron, page: f.page, per_page: f.per_page }),
    TTL_LARGO, [q, olla, estadoPadron, f.page]);

  const insignia = (b: BeneficiarioMascarado) => <StatusBadge estado={b.estado_padron} tono={ESTADO[b.estado_padron].tono} etiqueta={ESTADO[b.estado_padron].texto} />;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Padrón de beneficiarios y familias</h1>
        <p className="text-sm text-muted">Consulta operativa de solo lectura. El DNI se muestra siempre enmascarado.</p>
      </div>

      <form role="search" className="card grid gap-3 sm:grid-cols-3" onSubmit={(e) => e.preventDefault()}>
        <div className="sm:col-span-1">
          <label className="label-field" htmlFor="p-q">Buscar por nombre o últimos 4 dígitos</label>
          <input id="p-q" type="search" className="input-field" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ej.: Quispe o 1236" autoComplete="off" />
        </div>
        <div>
          <label className="label-field" htmlFor="p-olla">Olla</label>
          <select id="p-olla" className="input-field" value={f.get("olla")} onChange={(e) => f.set({ olla: e.target.value })}>
            <option value="">Todas</option>
            {ollas.datos?.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="label-field" htmlFor="p-estado">Estado</label>
          <select id="p-estado" className="input-field" value={estadoPadron} onChange={(e) => f.set({ estado: e.target.value })}>
            <option value="ACTIVO">Activo</option>
            <option value="DUPLICADO">Duplicado</option>
            <option value="INACTIVO">Inactivo</option>
          </select>
        </div>
      </form>

      <DatosAl fecha={lista.deCache} />
      {lista.cargando && !lista.datos && <CargandoVista />}
      {lista.error && !lista.datos && <ErrorConReintento mensaje={lista.error} onReintentar={lista.recargar} />}
      {lista.datos && lista.datos.items.length === 0 && <EmptyState titulo="Sin resultados" descripcion="Prueba con otro nombre o cambia los filtros." />}
      {lista.datos && lista.datos.items.length > 0 && (
        <>
          <Tabla<BeneficiarioMascarado>
            caption="Padrón de beneficiarios"
            filas={lista.datos.items}
            clave={(b) => b.id}
            columnas={[
              { clave: "dni", titulo: "DNI", render: (b) => <span className="font-mono">{b.dni_enmascarado}</span> },
              { clave: "n", titulo: "Nombres", render: (b) => b.nombres },
              { clave: "a", titulo: "Apellidos", render: (b) => b.apellidos },
              { clave: "e", titulo: "Edad", render: (b) => edad(b.fecha_nacimiento) },
              { clave: "h", titulo: "Hogar", render: (b) => b.integrantes_hogar },
              { clave: "c", titulo: "Condición nutricional", render: (b) => b.condicion_nutricional ?? "—" },
              { clave: "o", titulo: "Olla", render: (b) => b.olla_nombre },
              { clave: "s", titulo: "Estado", render: insignia },
            ]}
            tarjeta={(b) => (
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{b.nombres} {b.apellidos}</p>
                  {insignia(b)}
                </div>
                <p className="font-mono text-sm">{b.dni_enmascarado} · {edad(b.fecha_nacimiento)} años · nac. {fecha(b.fecha_nacimiento + "T00:00:00")}</p>
                <p className="text-sm text-muted">{b.olla_nombre} · hogar de {b.integrantes_hogar}</p>
                {b.condicion_nutricional && <p className="text-sm">{b.condicion_nutricional}</p>}
              </div>
            )}
          />
          <Paginador page={f.page} perPage={f.per_page} total={lista.datos.total} onCambiar={f.setPage} />
        </>
      )}
    </div>
  );
}

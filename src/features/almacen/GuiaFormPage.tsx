import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { Campo } from "../../components/ui/Campo";
import { Icono } from "../../components/ui/Icono";
import { useAuth } from "../../context/AuthContext";
import { useCarga } from "../../hooks/useCarga";
import { TTL_CORTO, TTL_LARGO } from "../../lib/offline/cacheLectura";
import { mensajeDeError } from "../../services/http";
import { operativoApi } from "../../services/operativo";
import { emitirGuiaConCola } from "../../services/operativo/acciones";

const UNIDADES = ["kg", "g", "L", "unidad", "caja"] as const;

const esquema = z.object({
  olla_id: z.number({ error: "Selecciona una olla." }).int().positive("Selecciona una olla."),
  transportista_id: z.number().nullable(),
  observaciones: z.string().max(300, "Máximo 300 caracteres.").optional(),
  items: z.array(z.object({
    insumo: z.string().trim().min(1, "Indica el insumo.").max(100, "Máximo 100 caracteres."),
    unidad: z.enum(UNIDADES),
    cantidad_despachada: z.number({ error: "Ingresa una cantidad." }).positive("Debe ser mayor que 0.").multipleOf(0.001, "Máximo 3 decimales."),
  })).min(1, "Agrega al menos un ítem.")
    .refine((it) => new Set(it.map((i) => i.insumo.trim().toLowerCase())).size === it.length, "No repitas insumos en la misma guía."),
});
type Datos = z.infer<typeof esquema>;

function semanaActual(): string {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

export default function GuiaFormPage() {
  const { usuario } = useAuth();
  const navegar = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const ollas = useCarga("ollas:aptas", () => operativoApi.listarOllas({ apta: true }), TTL_LARGO, []);
  const transportistas = useCarga("transportistas", () => operativoApi.listarTransportistas(), TTL_CORTO, []);

  const { register, control, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<Datos>({
    resolver: zodResolver(esquema),
    defaultValues: { transportista_id: null, items: [{ insumo: "", unidad: "kg", cantidad_despachada: undefined as unknown as number }] },
  });
  const { fields, append, remove, replace } = useFieldArray({ control, name: "items" });
  const ollaId = watch("olla_id");

  async function cargarDesdeMenu() {
    if (!ollaId) return setError("Primero selecciona una olla.");
    setError(null);
    try {
      const m = await operativoApi.obtenerMenuSemanal({ olla_id: ollaId, semana: semanaActual() });
      if (m.gramajes.length === 0) return setError("Esa olla no tiene menú semanal calculado.");
      replace(m.gramajes.map((g) => ({ insumo: g.insumo, unidad: "kg" as const, cantidad_despachada: g.kg_calculado })));
    } catch (e) {
      setError(mensajeDeError(e, "No pudimos cargar el menú. Sin conexión, ingresa los ítems a mano."));
    }
  }

  async function enviar(d: Datos) {
    if (!usuario) return;
    setError(null);
    try {
      const r = await emitirGuiaConCola(usuario.id, { olla_id: d.olla_id, transportista_id: d.transportista_id, observaciones: d.observaciones, items: d.items });
      if (r.encolada) navegar("/almacen", { replace: true, state: { aviso: "Guía guardada en el dispositivo. El QR se activará al sincronizar." } });
      else navegar(`/almacen/guias/${r.resultado.id}`, { replace: true });
    } catch (e) {
      setError(mensajeDeError(e, "No pudimos emitir la guía."));
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold">Emitir guía de despacho</h1>
      <p className="mb-4 text-sm text-muted">Salida de víveres hacia una olla común aprobada. Sin conexión, la guía se guarda y se envía al reconectar.</p>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit(enviar)} noValidate>
        <div className="card grid gap-4 sm:grid-cols-2">
          <Campo id="olla_id" etiqueta="Olla común (aprobada)" error={errors.olla_id?.message}>
            <select id="olla_id" className="input-field" aria-invalid={!!errors.olla_id} aria-describedby={errors.olla_id ? "olla_id-error" : undefined}
              {...register("olla_id", { setValueAs: (v) => (v === "" ? undefined : Number(v)) })}>
              <option value="">Selecciona…</option>
              {ollas.datos?.map((o) => <option key={o.id} value={o.id}>{o.nombre} · {o.distrito}</option>)}
            </select>
          </Campo>
          <Campo id="transportista_id" etiqueta="Transportista (opcional)">
            <select id="transportista_id" className="input-field" {...register("transportista_id", { setValueAs: (v) => (v === "" ? null : Number(v)) })}>
              <option value="">Sin asignar</option>
              {transportistas.datos?.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
          </Campo>
        </div>

        <fieldset className="card flex flex-col gap-3">
          <legend className="px-1 text-base font-semibold">Ítems</legend>
          <button type="button" className="btn-secondary self-start" onClick={cargarDesdeMenu}>Cargar desde menú semanal</button>

          {fields.map((f, i) => (
            <div key={f.id} className="grid grid-cols-1 gap-3 rounded border border-border p-3 sm:grid-cols-[2fr_1fr_1fr_auto]">
              <Campo id={`insumo-${i}`} etiqueta="Insumo" error={errors.items?.[i]?.insumo?.message}>
                <input id={`insumo-${i}`} className="input-field" aria-invalid={!!errors.items?.[i]?.insumo} aria-describedby={errors.items?.[i]?.insumo ? `insumo-${i}-error` : undefined} {...register(`items.${i}.insumo`)} />
              </Campo>
              <Campo id={`unidad-${i}`} etiqueta="Unidad">
                <select id={`unidad-${i}`} className="input-field" {...register(`items.${i}.unidad`)}>
                  {UNIDADES.map((u) => <option key={u}>{u}</option>)}
                </select>
              </Campo>
              <Campo id={`cant-${i}`} etiqueta="Cantidad" error={errors.items?.[i]?.cantidad_despachada?.message}>
                <input id={`cant-${i}`} className="input-field" inputMode="decimal" aria-invalid={!!errors.items?.[i]?.cantidad_despachada} aria-describedby={errors.items?.[i]?.cantidad_despachada ? `cant-${i}-error` : undefined}
                  {...register(`items.${i}.cantidad_despachada`, { setValueAs: (v) => (v === "" || v == null ? undefined : Number(String(v).replace(",", "."))) })} />
              </Campo>
              <div className="flex items-end">
                <button type="button" className="btn-secondary toque" onClick={() => remove(i)} disabled={fields.length === 1} aria-label={`Quitar ítem ${i + 1}`}>
                  <Icono nombre="cerrar" />
                </button>
              </div>
            </div>
          ))}
          {errors.items?.root?.message && <p role="alert" className="text-sm text-danger">{errors.items.root.message}</p>}
          {errors.items?.message && <p role="alert" className="text-sm text-danger">{errors.items.message}</p>}
          <button type="button" className="btn-secondary self-start" onClick={() => append({ insumo: "", unidad: "kg", cantidad_despachada: undefined as unknown as number })}>
            + Agregar ítem
          </button>
        </fieldset>

        <Campo id="observaciones" etiqueta="Observaciones (opcional)" error={errors.observaciones?.message}>
          <textarea id="observaciones" rows={2} className="input-field h-auto py-3" {...register("observaciones")} />
        </Campo>

        {error && <p role="alert" className="flex items-start gap-2 rounded border border-danger bg-danger-light p-3 text-sm text-danger"><Icono nombre="alerta" className="mt-0.5 h-5 w-5" />{error}</p>}
        <div className="flex gap-3">
          <button type="button" className="btn-secondary" onClick={() => { setValue("items", []); navegar("/almacen"); }}>Cancelar</button>
          <button className="btn-primary flex-1" type="submit" disabled={isSubmitting}>{isSubmitting ? "Emitiendo…" : "Emitir guía"}</button>
        </div>
      </form>
    </div>
  );
}

import { useCallback, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Icono } from "../../components/ui/Icono";
import { BadgeFsm } from "../../components/ui/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import { useCarga } from "../../hooks/useCarga";
import { fechaHora, idCorto, numero } from "../../lib/formatos";
import { TTL_CORTO } from "../../lib/offline/cacheLectura";
import { bdGet, bdPut } from "../../lib/offline/db";
import { calcularDfis } from "../../lib/nutricion";
import { contrafirmar, type RegistroEscaneo } from "../../lib/qr/contrafirma";
import { decodificarToken, type TokenDecodificado } from "../../lib/qr/token";
import { mensajeDeError } from "../../services/http";
import { operativoApi } from "../../services/operativo";
import { registrarEscaneoConCola } from "../../services/operativo/acciones";
import type { ParadaRuta, RegistroEscaneoEnvio, ResultadoValidacion, TipoEscaneo } from "../../types/operativo";
import { claveRuta } from "./RutaPage";
import { QrScannerView } from "./QrScannerView";

type Paso =
  | { paso: "escaneo" }
  | { paso: "error"; titulo: string; detalle: string }
  | { paso: "verificacion"; token: TokenDecodificado; crudo: string; parada: ParadaRuta; tiempoMs: number }
  | { paso: "comprobante"; uuid: string; hora: string; sincronizado: boolean; resultado?: ResultadoValidacion };

const claveNonce = (nonce: string, tipo: TipoEscaneo) => `${nonce}:${tipo}`;

export default function RecepcionPage() {
  const { usuario } = useAuth();
  const [params] = useSearchParams();
  const guiaEsperada = Number(params.get("guia")) || null;
  const modo: "salida" | "recepcion" = params.get("modo") === "salida" ? "salida" : "recepcion";
  const tipo: TipoEscaneo = modo === "salida" ? "SALIDA_ALMACEN" : "RECEPCION";

  const ruta = useCarga(claveRuta(usuario?.id), () => operativoApi.obtenerMiRuta(), TTL_CORTO, [usuario?.id]);
  const [estado, setEstado] = useState<Paso>({ paso: "escaneo" });
  const [cantidades, setCantidades] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  // 1. Escaneo → validación local (formato, expiración, ruta, nonce)
  const alLeer = useCallback(async (crudo: string, tiempoMs: number) => {
    const d = decodificarToken(crudo);
    if (!d.ok) {
      return setEstado({
        paso: "error",
        titulo: d.error === "EXPIRADO" ? "El QR venció" : "QR no reconocido",
        detalle: d.error === "EXPIRADO" ? "Pide al almacén que regenere el código de la guía." : "El código no tiene el formato de una guía de despacho.",
      });
    }
    const parada = ruta.datos?.find((p) => p.guia.id === d.token.guiaId);
    if (!parada) {
      return setEstado({ paso: "error", titulo: "Esta guía no es de tu ruta", detalle: `La guía #${d.token.guiaId} no está asignada a ti. No continúes con la entrega.` });
    }
    if (guiaEsperada && d.token.guiaId !== guiaEsperada) {
      return setEstado({ paso: "error", titulo: "Escaneaste otra guía", detalle: `Esperábamos la guía #${guiaEsperada} y leíste la #${d.token.guiaId}.` });
    }
    try {
      if (await bdGet("nonces", claveNonce(d.token.nonce, tipo))) {
        return setEstado({ paso: "error", titulo: "QR ya usado (NONCE_REPETIDO)", detalle: "Este código ya fue escaneado en este dispositivo. No se registra dos veces." });
      }
    } catch { /* sin IndexedDB: el servidor detectará la repetición */ }
    const esperado = modo === "salida" ? "DESPACHADO" : "EN_TRANSITO";
    if (parada.guia.estado_fsm !== esperado) {
      return setEstado({ paso: "error", titulo: "Estado de la guía no válido", detalle: `La guía está en ${parada.guia.estado_fsm}; para ${modo === "salida" ? "iniciar tránsito" : "recepcionar"} debe estar en ${esperado}.` });
    }
    setCantidades(Object.fromEntries(parada.guia.items.map((i) => [i.insumo, String(i.cantidad_despachada)])));
    setEstado({ paso: "verificacion", token: d.token, crudo, parada, tiempoMs });
  }, [ruta.datos, guiaEsperada, modo, tipo]);

  // 4. Contrafirma y registro (cola si no hay red)
  async function confirmar(v: Extract<Paso, { paso: "verificacion" }>) {
    if (!usuario) return;
    setEnviando(true);
    setErrorEnvio(null);
    try {
      const uuid = crypto.randomUUID();
      const items = modo === "recepcion"
        ? v.parada.guia.items.map((i) => ({ insumo: i.insumo, cantidadRecepcionada: Number(String(cantidades[i.insumo]).replace(",", ".")) }))
        : undefined;
      if (items?.some((i) => !Number.isFinite(i.cantidadRecepcionada) || i.cantidadRecepcionada < 0)) {
        throw new Error("Revisa las cantidades recepcionadas: deben ser números mayores o iguales a 0.");
      }
      const registro: RegistroEscaneo = {
        uuid, guiaId: v.token.guiaId, nonce: v.token.nonce, tipo, token: v.crudo, usuarioId: usuario.id,
        escaneadoEn: new Date().toISOString(), tiempoEscaneoMs: v.tiempoMs, items,
      };
      const { firma, clavePublicaJwk } = await contrafirmar(registro);
      const envio: RegistroEscaneoEnvio = {
        uuid, guia_id: registro.guiaId, token_qr: v.crudo, tipo_escaneo: tipo, escaneado_en: registro.escaneadoEn,
        tiempo_escaneo_ms: v.tiempoMs, contrafirma: firma, clave_publica: clavePublicaJwk,
        items_recepcionados: items?.map((i) => ({ insumo: i.insumo, cantidad_recepcionada: i.cantidadRecepcionada })),
      };
      const r = await registrarEscaneoConCola(usuario.id, modo === "salida" ? "ESCANEO_QR" : "RECEPCION", envio);
      if (!r.encolada && r.resultado.resultado !== "VALIDO") {
        return setEstado({ paso: "error", titulo: `El servidor rechazó el QR (${r.resultado.resultado})`, detalle: "No se registró la operación. Avisa al almacén." });
      }
      await bdPut("nonces", { nonce: claveNonce(v.token.nonce, tipo), guardadoEn: registro.escaneadoEn });
      setEstado({ paso: "comprobante", uuid, hora: registro.escaneadoEn, sincronizado: !r.encolada, resultado: r.encolada ? undefined : r.resultado.resultado });
    } catch (e) {
      setErrorEnvio(mensajeDeError(e, e instanceof Error ? e.message : "No pudimos registrar la operación."));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <h1 className="text-2xl font-semibold">{modo === "salida" ? "Iniciar tránsito" : "Recepción en la olla"}</h1>
      {guiaEsperada && <p className="text-base text-ink">Guía esperada: #{guiaEsperada}</p>}

      {estado.paso === "escaneo" && (ruta.cargando && !ruta.datos
        ? <p role="status" className="text-ink">Cargando tu ruta…</p>
        : <QrScannerView activo onLectura={alLeer} />)}

      {estado.paso === "error" && (
        <section role="alert" className="flex flex-col gap-3 rounded-lg border-2 border-danger bg-danger-light p-5 text-danger">
          <p className="flex items-center gap-2 text-xl font-semibold"><Icono nombre="equis" className="h-7 w-7" /> {estado.titulo}</p>
          <p className="text-base">{estado.detalle}</p>
          <button className="btn-primary btn-campo" onClick={() => setEstado({ paso: "escaneo" })}>Volver a escanear</button>
          <Link className="btn-secondary btn-campo" to="/transporte">Registrar incidencia / volver a mi ruta</Link>
        </section>
      )}

      {estado.paso === "verificacion" && (
        <section className="flex flex-col gap-4" aria-label="Verificación de la guía">
          <div className="card border-2 border-ink">
            <p className="text-lg font-semibold">{estado.parada.olla.nombre}</p>
            <p className="text-base">{estado.parada.olla.direccion}, {estado.parada.olla.distrito}</p>
            <p className="mt-1 flex items-center gap-2 text-base">Guía #{estado.token.guiaId} <BadgeFsm estado={estado.parada.guia.estado_fsm} /></p>
            <p className="mt-1 text-sm text-ink">Lectura en {estado.tiempoMs} ms</p>
          </div>

          <ul className="flex flex-col gap-3">
            {estado.parada.guia.items.map((i) => {
              const val = Number(String(cantidades[i.insumo] ?? "").replace(",", "."));
              const dfis = modo === "recepcion" && Number.isFinite(val) ? calcularDfis(i.cantidad_despachada, val) : null;
              return (
                <li key={i.insumo} className="card border-2 border-ink">
                  <p className="text-lg font-medium">{i.insumo}</p>
                  <p className="text-base">Despachado: {numero(i.cantidad_despachada, 3)} {i.unidad}</p>
                  {modo === "recepcion" && (
                    <>
                      <label htmlFor={`rec-${i.insumo}`} className="label-field mt-2 text-base">Cantidad recepcionada ({i.unidad})</label>
                      <div className="flex items-center gap-2">
                        <button type="button" className="btn-secondary toque h-14 w-14 text-2xl" aria-label={`Restar 1 a ${i.insumo}`}
                          onClick={() => setCantidades((c) => ({ ...c, [i.insumo]: String(Math.max(0, (Number(String(c[i.insumo]).replace(",", ".")) || 0) - 1)) }))}>−</button>
                        <input id={`rec-${i.insumo}`} inputMode="decimal" className="input-field h-14 text-center text-xl" value={cantidades[i.insumo] ?? ""}
                          onChange={(e) => setCantidades((c) => ({ ...c, [i.insumo]: e.target.value }))} />
                        <button type="button" className="btn-secondary toque h-14 w-14 text-2xl" aria-label={`Sumar 1 a ${i.insumo}`}
                          onClick={() => setCantidades((c) => ({ ...c, [i.insumo]: String((Number(String(c[i.insumo]).replace(",", ".")) || 0) + 1) }))}>+</button>
                      </div>
                      {dfis !== null && (
                        <p className={`mt-2 flex items-center gap-2 text-base font-medium ${dfis > 10 ? "text-danger" : dfis > 5 ? "text-accent-dark" : "text-success"}`}>
                          <Icono nombre={dfis > 5 ? "alerta" : "check"} className="h-5 w-5" />
                          Diferencia (D_fis): {numero(dfis)} % {dfis > 10 ? "· Diferencia alta" : dfis > 5 ? "· Diferencia" : "· Conforme"}
                        </p>
                      )}
                    </>
                  )}
                </li>
              );
            })}
          </ul>

          {errorEnvio && <p role="alert" className="rounded border border-danger bg-danger-light p-3 text-danger">{errorEnvio}</p>}
          <button className="btn-primary btn-campo" disabled={enviando} onClick={() => confirmar(estado)}>
            {enviando ? "Firmando…" : modo === "salida" ? "Confirmar salida y firmar" : "Confirmar y firmar recepción"}
          </button>
          <button className="btn-secondary btn-campo" onClick={() => setEstado({ paso: "escaneo" })}>Cancelar</button>
        </section>
      )}

      {estado.paso === "comprobante" && (
        <section className="flex flex-col gap-3 rounded-lg border-2 border-success bg-success-light p-5 text-ink" role="status">
          <p className="flex items-center gap-2 text-xl font-semibold text-success"><Icono nombre="check" className="h-7 w-7" /> Operación registrada</p>
          <p className="text-base">Comprobante <strong>{idCorto(estado.uuid)}</strong> · {fechaHora(estado.hora)}</p>
          <p className="flex items-center gap-2 text-base font-medium">
            <Icono nombre={estado.sincronizado ? "wifi" : "bandeja"} />
            {estado.sincronizado ? `Sincronizado (${estado.resultado})` : "Guardado en el dispositivo; se enviará al reconectar"}
          </p>
          <Link className="btn-primary btn-campo" to="/transporte">Volver a mi ruta</Link>
        </section>
      )}
    </div>
  );
}

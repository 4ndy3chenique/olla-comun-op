import { useCallback, useEffect, useRef, useState } from "react";
import { Icono } from "../../components/ui/Icono";
import { decodificarToken } from "../../lib/qr/token";
import { mensajeDeError } from "../../services/http";
import { operativoApi } from "../../services/operativo";

interface Props {
  guiaId: number;
  token: string | null;
  puedeRegenerar: boolean;
  onToken: (t: string) => void;
}

/** QR dinámico firmado por el servidor (HMAC). El cliente solo lo dibuja y muestra la cuenta regresiva. */
export function GuiaQrCard({ guiaId, token, puedeRegenerar, onToken }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ahora, setAhora] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!token || !canvas.current) return;
    const el = canvas.current;
    import("qrcode").then((Q) =>
      Q.toCanvas(el, token, { errorCorrectionLevel: "M", margin: 4, width: 288, color: { dark: "#000000", light: "#FFFFFF" } }),
    ).catch(() => setError("No pudimos dibujar el código QR."));
  }, [token]);

  const regenerar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      onToken((await operativoApi.regenerarQr(guiaId)).token_qr);
    } catch (e) {
      setError(mensajeDeError(e, "No pudimos regenerar el QR."));
    } finally {
      setCargando(false);
    }
  }, [guiaId, onToken]);

  if (!token) {
    return (
      <section className="card flex flex-col items-center gap-2 text-center" aria-label="Código QR de la guía">
        <Icono nombre="candado" className="h-8 w-8 text-muted" />
        <p className="font-medium">El QR se activa al sincronizar</p>
        <p className="text-sm text-muted">Esta guía aún está en el dispositivo. No se puede usar un QR provisional.</p>
      </section>
    );
  }

  const d = decodificarToken(token, Math.floor(ahora / 1000));
  const restante = d.ok ? Math.max(0, d.token.expira - Math.floor(ahora / 1000)) : 0;
  const expirado = !d.ok && d.error === "EXPIRADO";
  const mmss = `${String(Math.floor(restante / 60)).padStart(2, "0")}:${String(restante % 60).padStart(2, "0")}`;

  return (
    <section className="card imprimible flex flex-col items-center gap-3" aria-label="Código QR de la guía">
      <h2 className="text-base font-semibold">Código QR de la guía #{guiaId}</h2>
      {expirado ? (
        <p role="alert" className="flex items-center gap-2 rounded bg-danger-light p-3 text-danger">
          <Icono nombre="equis" /> El QR venció. Regenera uno nuevo.
        </p>
      ) : (
        <canvas ref={canvas} className="rounded border border-border" aria-label="Código QR firmado de la guía" role="img" />
      )}
      {d.ok && <p className="text-sm text-ink">Vence en {mmss}</p>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <div className="flex flex-wrap justify-center gap-2 print:hidden">
        {puedeRegenerar && (
          <button className="btn-secondary" onClick={regenerar} disabled={cargando}>{cargando ? "Regenerando…" : "Regenerar QR"}</button>
        )}
        <button className="btn-secondary" onClick={() => window.print()} disabled={expirado}>Imprimir</button>
      </div>
    </section>
  );
}

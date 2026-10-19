import { useEffect, useRef, useState } from "react";
import type QrScannerType from "qr-scanner";
import { Icono } from "../../components/ui/Icono";

interface Props {
  /** Se llama una sola vez por lectura; `tiempoMs` es el tiempo desde que se abrió la cámara (KPI t_scan < 2000 ms). */
  onLectura: (valor: string, tiempoMs: number) => void;
  activo: boolean;
}

export function QrScannerView({ onLectura, activo }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScannerType | null>(null);
  const inicioRef = useRef(0);
  const entregadoRef = useRef(false);
  const lecturaRef = useRef(onLectura);
  lecturaRef.current = onLectura;
  const [error, setError] = useState<string | null>(null);
  const [linterna, setLinterna] = useState<boolean | null>(null); // null = no soportada
  const [manual, setManual] = useState("");

  useEffect(() => {
    if (!activo || !videoRef.current) return;
    let cancelado = false;
    entregadoRef.current = false;
    inicioRef.current = performance.now();
    setError(null);

    (async () => {
      try {
        const { default: QrScanner } = await import("qr-scanner"); // carga diferida
        if (cancelado || !videoRef.current) return;
        const scanner = new QrScanner(
          videoRef.current,
          (r) => {
            if (entregadoRef.current) return;
            entregadoRef.current = true;
            navigator.vibrate?.(80);
            const ms = Math.round(performance.now() - inicioRef.current);
            if (import.meta.env.DEV) console.debug("t_scan", ms, "ms");
            lecturaRef.current(r.data, ms);
          },
          { preferredCamera: "environment", maxScansPerSecond: 25, returnDetailedScanResult: true, highlightScanRegion: true },
        );
        scannerRef.current = scanner;
        await scanner.start();
        if (cancelado) return scanner.destroy();
        setLinterna((await scanner.hasFlash()) ? false : null);
      } catch {
        if (!cancelado) setError("No pudimos usar la cámara. Revisa los permisos del navegador o ingresa el código a mano.");
      }
    })();

    return () => {
      cancelado = true;
      scannerRef.current?.stop();
      scannerRef.current?.destroy(); // libera cámara y worker
      scannerRef.current = null;
    };
  }, [activo]);

  async function alternarLinterna() {
    await scannerRef.current?.toggleFlash();
    setLinterna(scannerRef.current?.isFlashOn() ?? null);
  }

  return (
    <section aria-label="Escáner de código QR" className="flex flex-col gap-4">
      <div className="relative overflow-hidden rounded-lg border-2 border-ink bg-ink">
        <video ref={videoRef} className="aspect-square w-full object-cover" muted playsInline />
        {activo && !error && (
          <p role="status" className="absolute inset-x-0 bottom-0 bg-ink/80 p-2 text-center text-base font-medium text-white">
            Apunta la cámara al código QR de la guía
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="flex items-start gap-2 rounded border border-danger bg-danger-light p-3 text-danger">
          <Icono nombre="alerta" className="mt-0.5 h-5 w-5" /> {error}
        </p>
      )}

      {linterna !== null && (
        <button type="button" className="btn-secondary toque border-2 border-ink" onClick={alternarLinterna} aria-pressed={linterna}>
          {linterna ? "Apagar linterna" : "Encender linterna"}
        </button>
      )}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (manual.trim() && !entregadoRef.current) {
            entregadoRef.current = true;
            lecturaRef.current(manual.trim(), 0);
          }
        }}
      >
        <label htmlFor="qr-manual" className="sr-only">Código de la guía</label>
        <input id="qr-manual" className="input-field" value={manual} onChange={(e) => setManual(e.target.value)} placeholder="O pega el código aquí" autoComplete="off" />
        <button className="btn-primary shrink-0" type="submit">Usar</button>
      </form>
    </section>
  );
}

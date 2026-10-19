import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Campo } from "../../components/ui/Campo";
import { Icono } from "../../components/ui/Icono";
import { BannerDemo } from "../../components/ui/BannerDemo";
import { mensajeDeError } from "../../services/http";
import { MODO_DEMO } from "../../services/operativo";
import { USUARIOS_DEMO } from "../../services/operativo/apiDemo";
import { rutaPermitida, rutaPorRol } from "../../routes/redireccionPorRol";
import type { NombreRol } from "../../types";

const esquema = z.object({
  identificador: z.string().trim().min(1, "Ingresa tu DNI o correo electrónico.")
    .refine((v) => /^\d{8}$/.test(v) || z.email().safeParse(v).success, "Ingresa un DNI de 8 dígitos o un correo válido."),
  password: z.string().min(1, "Ingresa tu contraseña.").max(72, "La contraseña es demasiado larga."),
  recordar: z.boolean(),
});
type Datos = z.infer<typeof esquema>;

const ACCESOS_DEMO: { rol: keyof typeof USUARIOS_DEMO; etiqueta: string; icono: "caja" | "camion" | "bitacora" }[] = [
  { rol: "ALMACENERO", etiqueta: "Entrar como Almacenero", icono: "caja" },
  { rol: "TRANSPORTISTA", etiqueta: "Entrar como Transportista", icono: "camion" },
  { rol: "AUDITOR", etiqueta: "Entrar como Auditor", icono: "bitacora" },
];

export default function LoginPage() {
  const { usuario, login, loginDemo } = useAuth();
  const navegar = useNavigate();
  const desde = (useLocation().state as { from?: string } | null)?.from;
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Datos>({
    resolver: zodResolver(esquema), defaultValues: { recordar: true },
  });

  const destino = (rol: NombreRol) => (desde && rutaPermitida(rol, desde) ? desde : rutaPorRol(rol));
  if (usuario) return <Navigate to={destino(usuario.rol_nombre)} replace />;

  async function enviar(d: Datos) {
    setError(null);
    try {
      await login({ identificador: d.identificador, password: d.password }, d.recordar);
    } catch (e) {
      setError(mensajeDeError(e, e instanceof Error ? e.message : "No pudimos iniciar sesión."));
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-5 px-4 py-8">
      <div className="flex items-center gap-3">
        <img src="/favicon.svg" alt="" width={44} height={44} className="h-11 w-11" />
        <div>
          <h1 className="text-xl font-semibold text-primary-dark">Plataforma Operativa</h1>
          <p className="text-sm text-muted">Manos y Ollas · Almacén, transporte y auditoría</p>
        </div>
      </div>

      {MODO_DEMO && <BannerDemo />}

      <form className="card flex flex-col gap-4" onSubmit={handleSubmit(enviar)} noValidate>
        <Campo id="identificador" etiqueta="DNI o correo electrónico" error={errors.identificador?.message}>
          <input id="identificador" className="input-field" autoComplete="username" inputMode="email"
            aria-invalid={!!errors.identificador} aria-describedby={errors.identificador ? "identificador-error" : undefined}
            {...register("identificador")} />
        </Campo>
        <Campo id="password" etiqueta="Contraseña" error={errors.password?.message}>
          <input id="password" type="password" className="input-field" autoComplete="current-password"
            aria-invalid={!!errors.password} aria-describedby={errors.password ? "password-error" : undefined}
            {...register("password")} />
        </Campo>
        <label className="toque flex items-center gap-3 text-sm">
          <input type="checkbox" className="h-5 w-5 accent-primary" {...register("recordar")} />
          Recordar este dispositivo
        </label>

        {error && (
          <p role="alert" className="flex items-start gap-2 rounded border border-danger bg-danger-light p-3 text-sm text-danger">
            <Icono nombre="alerta" className="mt-0.5 h-5 w-5" /> {error}
          </p>
        )}
        <button className="btn-primary" type="submit" disabled={isSubmitting || MODO_DEMO}>
          {isSubmitting ? "Ingresando…" : "Ingresar"}
        </button>
        {MODO_DEMO && <p className="text-sm text-muted">En modo demo no se contacta con el servidor: usa un acceso rápido.</p>}
      </form>

      {MODO_DEMO && (
        <section aria-label="Accesos rápidos de demostración" className="flex flex-col gap-3">
          {ACCESOS_DEMO.map((a) => (
            <button key={a.rol} className="btn-secondary btn-campo gap-2" onClick={() => { loginDemo(a.rol); navegar(destino(a.rol), { replace: true }); }}>
              <Icono nombre={a.icono} className="h-6 w-6" /> {a.etiqueta}
            </button>
          ))}
        </section>
      )}
    </main>
  );
}

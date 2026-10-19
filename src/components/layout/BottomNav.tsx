import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Icono } from "../ui/Icono";
import { DESTINOS_POR_ROL } from "./navegacion";

/** Barra inferior móvil (máx. 5 destinos, pensada para el pulgar). */
export function BottomNav() {
  const { rol } = useAuth();
  if (!rol) return null;
  const destinos = DESTINOS_POR_ROL[rol].filter((d) => !d.soloLateral).slice(0, 5);

  return (
    <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
      {destinos.map((d) => (
        <NavLink
          key={d.to}
          to={d.to}
          end={d.exacto}
          className={({ isActive }) =>
            `flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium ${isActive ? "text-primary-dark" : "text-muted"}`
          }
        >
          <Icono nombre={d.icono} className="h-6 w-6" />
          {d.etiqueta}
        </NavLink>
      ))}
    </nav>
  );
}

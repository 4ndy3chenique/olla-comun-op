import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Icono } from "../ui/Icono";
import { DESTINOS_POR_ROL, TITULO_PANEL } from "./navegacion";

/** Barra lateral fija (escritorio, lg+). */
export function SideNav() {
  const { usuario, rol, logout } = useAuth();
  if (!rol) return null;

  return (
    <aside className="hidden border-r border-border bg-surface lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-64 lg:flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-border px-5 text-lg font-semibold text-primary-dark">
        <img src="/favicon.svg" alt="" width={32} height={32} className="h-8 w-8" />
        <span>Operativo · {TITULO_PANEL[rol]}</span>
      </div>

      <nav aria-label="Principal" className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {DESTINOS_POR_ROL[rol].map((d) => (
          <NavLink
            key={d.to}
            to={d.to}
            end={d.exacto}
            className={({ isActive }) =>
              `toque flex items-center gap-3 rounded px-3 text-sm font-medium transition-colors ${
                isActive ? "bg-primary-light text-primary-dark" : "text-muted hover:bg-bg hover:text-ink"
              }`
            }
          >
            <Icono nombre={d.icono} />
            <span className="flex-1">{d.etiqueta}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border p-4">
        <p className="truncate text-sm font-medium text-ink">{usuario?.nombres} {usuario?.apellidos}</p>
        <p className="truncate text-xs text-muted">{rol}</p>
        <button onClick={logout} className="toque mt-2 flex items-center gap-2 text-sm font-medium text-danger hover:underline">
          <Icono nombre="salir" /> Cerrar sesión
        </button>
      </div>
    </aside>
  );
}

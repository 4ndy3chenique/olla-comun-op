import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { EmptyState } from "../../components/ui/EmptyState";
import { rutaPorRol } from "../../routes/redireccionPorRol";

export default function SinAccesoPage() {
  const { rol } = useAuth();
  return (
    <div className="flex flex-col items-center gap-3">
      <EmptyState pagina titulo="No tienes acceso a esta sección (403)" descripcion="Tu rol no incluye esta vista. Vuelve a tu panel." />
      {rol && <Link className="btn-primary" to={rutaPorRol(rol)}>Ir a mi panel</Link>}
    </div>
  );
}

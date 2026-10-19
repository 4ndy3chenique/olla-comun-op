import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ConectividadProvider } from "./context/ConectividadContext";
import { Rutas } from "./routes";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ConectividadProvider>
          <Rutas />
        </ConectividadProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

import { useConectividad } from "../context/ConectividadContext";

export const useOnline = () => useConectividad().enLinea;

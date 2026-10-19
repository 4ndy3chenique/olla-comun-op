import { apiDemo } from "./apiDemo";
import { apiReal } from "./apiReal";
import type { OperativoApi } from "./tipos";

/** demo (por defecto) | real. Ver VITE_OPERATIVO_MODO en .env.example. */
export const MODO_DEMO = (import.meta.env.VITE_OPERATIVO_MODO ?? "demo") !== "real";

export const operativoApi: OperativoApi = MODO_DEMO ? apiDemo : apiReal;
export type { OperativoApi } from "./tipos";

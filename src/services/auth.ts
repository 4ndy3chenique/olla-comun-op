import { http } from "./http";
import type { LoginInput, SesionAutenticada, Usuario } from "../types";

export const loginReal = (input: LoginInput) => http.post<SesionAutenticada>("/auth/login", input);
export const miCuenta = () => http.get<Usuario>("/usuarios/me");

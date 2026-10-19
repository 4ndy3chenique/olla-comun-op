export type NombreRol = "SOLICITANTE_DIRIGENTE" | "ALMACENERO" | "TRANSPORTISTA" | "AUDITOR" | "ADMINISTRADOR";

export interface Usuario {
  id: number;
  dni: string;
  nombres: string;
  apellidos: string;
  email: string;
  rol_id: number;
  rol_nombre: NombreRol;
  olla_id: number | null;
  estado: string;
  created_at: string | null;
}

export interface LoginInput {
  identificador: string; // DNI (8 dígitos) o email
  password: string;
}

export interface SesionAutenticada {
  usuario: Usuario;
  access_token: string;
  refresh_token: string;
  expira_en: string; // ISO
}

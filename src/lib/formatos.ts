export const fechaHora = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" }) : "—";
export const fecha = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("es-PE") : "—");
export const numero = (n: number, dec = 1) => n.toLocaleString("es-PE", { maximumFractionDigits: dec });
export const idCorto = (uuid: string) => uuid.slice(0, 8);
/** Horas entre dos fechas ISO. */
export const horasEntre = (a: string, b: string) => (new Date(b).getTime() - new Date(a).getTime()) / 3_600_000;

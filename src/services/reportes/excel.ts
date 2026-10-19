/** Exportación a Excel (carga diferida de write-excel-file): fila de cabecera en negrita. */
import type { TablaReporte } from "./pdf";

const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-");

export async function descargarExcel(t: TablaReporte) {
  const { default: writeXlsxFile } = await import("write-excel-file");
  const cabecera = t.columnas.map((c) => ({ value: c, fontWeight: "bold" as const }));
  const cuerpo = t.filas.map((f) =>
    f.map((v) => (typeof v === "number" ? { value: v, type: Number } : { value: String(v), type: String })),
  );
  await writeXlsxFile([cabecera, ...cuerpo], {
    sheet: t.titulo.slice(0, 31).replace(/[\\/?*[\]:]/g, " "),
    fileName: `${slug(t.titulo)}-${new Date().toISOString().slice(0, 10)}.xlsx`,
  });
}

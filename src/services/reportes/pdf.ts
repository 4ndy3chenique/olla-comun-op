/** Exportación a PDF (carga diferida de jspdf). Colores del design system: #1F4D3F y #FAF8F3. */
export interface TablaReporte {
  titulo: string;
  columnas: string[];
  filas: (string | number)[][];
}

export interface MetaReporte {
  usuario: string;
  rol: string;
  filtros: string;
  truncado?: boolean;
}

const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-");

export async function descargarPdf(t: TablaReporte, m: MetaReporte) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ orientation: t.columnas.length > 6 ? "landscape" : "portrait", unit: "pt", format: "a4" });
  const ancho = doc.internal.pageSize.getWidth();

  doc.setFillColor(31, 77, 63);
  doc.rect(0, 0, ancho, 56, "F");
  doc.setTextColor(250, 248, 243);
  doc.setFontSize(15);
  doc.text("Manos y Ollas — Reporte operativo", 32, 26);
  doc.setFontSize(10);
  doc.text(t.titulo, 32, 44);

  doc.setTextColor(43, 39, 33);
  doc.setFontSize(9);
  const encabezado = [
    `Generado: ${new Date().toLocaleString("es-PE")} · Usuario: ${m.usuario}`,
    `Filtros: ${m.filtros || "ninguno"}`,
    ...(m.truncado ? ["Aviso: el reporte se truncó en 5000 filas."] : []),
  ];
  doc.text(encabezado, 32, 76);

  autoTable(doc, {
    startY: 76 + encabezado.length * 12 + 6,
    head: [t.columnas],
    body: t.filas.map((f) => f.map(String)),
    styles: { fontSize: 8, cellPadding: 4, textColor: [43, 39, 33] },
    headStyles: { fillColor: [31, 77, 63], textColor: [250, 248, 243] },
    alternateRowStyles: { fillColor: [250, 248, 243] },
    didDrawPage: () => {
      const n = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.text(`Generado por ${m.rol} · Página ${n}`, 32, doc.internal.pageSize.getHeight() - 16);
    },
  });

  doc.save(`${slug(t.titulo)}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

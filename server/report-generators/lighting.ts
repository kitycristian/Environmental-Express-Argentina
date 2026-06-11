import {
  Paragraph, Table, TableRow,
  WidthType, AlignmentType,
} from "docx";
import {
  CONT_W, NAVY, GREEN_OK, RED_FAIL, run, cell, hdr, cumpleCell,
  pageBreakPara, protocolHeader, spaceBlock,
} from "./helpers.js";

export function buildLightingSection(establishment: any, lightingSectors: any[]): any[] {
  if (!lightingSectors?.length) return [];
  const items: any[] = [pageBreakPara()];

  items.push(new Paragraph({
    children: [run("ESTUDIO DE ILUMINACIÓN SEGÚN RESOL. SRT Nº 84/2012", { size: 13, bold: true, color: NAVY })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 200 },
  }));

  // ── Encabezado + Datos para la medición
  items.push(protocolHeader("PROTOCOLO PARA MEDICIÓN DE ILUMINACIÓN EN EL AMBIENTE LABORAL", establishment));
  items.push(new Table({
    width: { size: CONT_W, type: WidthType.DXA },
    columnWidths: [CONT_W],
    rows: [
      new TableRow({ children: [hdr("Datos para la medición")] }),
      new TableRow({ children: [cell("Instrumento: Luxómetro digital conforme a norma IRAM 2326 / CIE Publ. 69 · Certificado de calibración vigente.")] }),
      new TableRow({ children: [hdr("Documentación que se adjuntará")] }),
      new TableRow({ children: [cell("• Certificado de calibración del luxómetro.\n• Croquis del establecimiento con puntos de medición numerados.")] }),
    ],
  }));

  // ── Tabla resumen de todos los puntos
  items.push(pageBreakPara());
  items.push(protocolHeader("PROTOCOLO PARA MEDICIÓN DE ILUMINACIÓN EN EL AMBIENTE LABORAL", establishment));
  items.push(new Table({
    width: { size: CONT_W, type: WidthType.DXA },
    columnWidths: [CONT_W],
    rows: [new TableRow({ children: [hdr("Datos de la Medición")] })],
  }));

  items.push(new Table({
    width: { size: CONT_W, type: WidthType.DXA },
    columnWidths: [460, 560, 1160, 1300, 840, 840, 840, 680, 800, 800, 840, 780],
    rows: [
      new TableRow({ children: [
        hdr("Pto",                      { align: AlignmentType.CENTER }),
        hdr("Hora",                     { align: AlignmentType.CENTER }),
        hdr("Sector"),
        hdr("Sección / Puesto"),
        hdr("Tipo Ilumin.",             { align: AlignmentType.CENTER }),
        hdr("Fuente",                   { align: AlignmentType.CENTER }),
        hdr("Tipo Sist.",               { align: AlignmentType.CENTER }),
        hdr("E min.",                   { align: AlignmentType.CENTER }),
        hdr("E min ≥ Emed/2",          { align: AlignmentType.CENTER }),
        hdr("E media (lux)",            { align: AlignmentType.CENTER }),
        hdr("VLA (lux)",                { align: AlignmentType.CENTER }),
        hdr("Cumple",                   { align: AlignmentType.CENTER }),
      ]}),
      ...lightingSectors.flatMap((s: any, si: number) =>
        (s.measurements || [])
          .filter((m: any) => m.type === "lighting")
          .map((m: any) => {
            const pts  = m.points || [];
            const vals = pts.map((p: any) => parseFloat(p.values?.lux || "0")).filter((v: number) => !isNaN(v) && v > 0);
            const eMin   = vals.length ? Math.min(...vals) : 0;
            const eMedia = vals.length ? Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length) : 0;
            const vla    = m.config?.limit || 500;
            const cumple = eMedia >= vla ? "SI" : "NO";
            const uniCheck = eMin >= eMedia / 2 ? "≥" : "<";
            const lightType = m.config?.lightingType === "natural" ? "Natural"
              : m.config?.lightingType === "mixed" ? "Mixta" : "Artificial";
            return new TableRow({ children: [
              cell(String(si + 1).padStart(2, "0"),           { align: AlignmentType.CENTER }),
              cell(m.hora || "-",                             { align: AlignmentType.CENTER }),
              cell(s.name || ""),
              cell(s.description || s.name || ""),
              cell(lightType,                                 { align: AlignmentType.CENTER }),
              cell(m.config?.lightSource || "Mixta",         { align: AlignmentType.CENTER }),
              cell(m.config?.lightingSystemType === "localized" ? "Localizada" : "General", { align: AlignmentType.CENTER }),
              cell(String(eMin),                              { align: AlignmentType.CENTER }),
              cell(uniCheck,                                  { align: AlignmentType.CENTER }),
              cell(String(eMedia),                            { align: AlignmentType.CENTER, bold: true }),
              cell(String(vla),                               { align: AlignmentType.CENTER }),
              cumpleCell(cumple),
            ]});
          })
      ),
    ],
  }));

  // ── Memoria de cálculo por sector
  lightingSectors.forEach((s: any) => {
    (s.measurements || [])
      .filter((m: any) => m.type === "lighting")
      .forEach((m: any) => {
        const pts  = m.points || [];
        if (!pts.length) return;
        const vals  = pts.map((p: any) => parseFloat(p.values?.lux || "0")).filter((v: number) => !isNaN(v) && v > 0);
        const eMin   = vals.length ? Math.min(...vals) : 0;
        const eMax   = vals.length ? Math.max(...vals) : 0;
        const eMedia = vals.length ? Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length) : 0;
        const vla    = m.config?.limit || 500;
        const cumple = eMedia >= vla;
        const uniCumple = eMin >= eMedia / 2;

        const largo = m.config?.length || "-";
        const ancho = m.config?.width  || "-";
        const alto  = m.config?.height || "-";
        const k = (largo !== "-" && ancho !== "-" && alto !== "-")
          ? (parseFloat(largo) * parseFloat(ancho) / (parseFloat(alto) * (parseFloat(largo) + parseFloat(ancho)))).toFixed(2)
          : "-";

        items.push(pageBreakPara());
        items.push(protocolHeader("PROTOCOLO PARA MEDICIÓN DE ILUMINACIÓN EN EL AMBIENTE LABORAL", establishment));
        items.push(new Paragraph({
          children: [run(`MEMORIA DE CÁLCULO — SECTOR: ${s.name?.toUpperCase() || ""}${s.description ? ` / ${s.description.toUpperCase()}` : ""}`, { size: 10, bold: true, color: NAVY })],
          spacing: { before: 120, after: 80 },
        }));

        // Dimensiones y factor K
        items.push(new Table({
          width: { size: CONT_W, type: WidthType.DXA },
          columnWidths: [Math.floor(CONT_W / 4), Math.floor(CONT_W / 4), Math.floor(CONT_W / 4), Math.floor(CONT_W / 4)],
          rows: [
            new TableRow({ children: [
              hdr("Largo (m)"),
              hdr("Ancho (m)"),
              hdr("Altura plano trabajo (m)"),
              hdr("Factor K"),
            ]}),
            new TableRow({ children: [
              cell(String(largo), { align: AlignmentType.CENTER }),
              cell(String(ancho), { align: AlignmentType.CENTER }),
              cell(String(alto),  { align: AlignmentType.CENTER }),
              cell(String(k),     { align: AlignmentType.CENTER, bold: true }),
            ]}),
          ],
        }));

        // Grilla de puntos de medición
        const colW = Math.floor(CONT_W / Math.min(pts.length, 9));
        const chunkSize = 9;
        for (let start = 0; start < pts.length; start += chunkSize) {
          const chunk = pts.slice(start, start + chunkSize);
          const cols  = Array(chunk.length).fill(colW);
          items.push(new Table({
            width: { size: CONT_W, type: WidthType.DXA },
            columnWidths: cols,
            rows: [
              new TableRow({ children: chunk.map((_: any, ci: number) => hdr(`P${start + ci + 1}`, { align: AlignmentType.CENTER })) }),
              new TableRow({ children: chunk.map((p: any) => cell(p.values?.lux || "-", { align: AlignmentType.CENTER, bold: true, size: 10 })) }),
            ],
          }));
        }

        // Resumen E media / VLA
        items.push(new Table({
          width: { size: CONT_W, type: WidthType.DXA },
          columnWidths: [Math.floor(CONT_W / 5), Math.floor(CONT_W / 5), Math.floor(CONT_W / 5), Math.floor(CONT_W / 5), Math.floor(CONT_W / 5)],
          rows: [
            new TableRow({ children: [
              hdr("E mínima (lux)"),
              hdr("E máxima (lux)"),
              hdr("E media (lux)"),
              hdr("VLA (lux)"),
              hdr("Cumple"),
            ]}),
            new TableRow({ children: [
              cell(String(eMin),   { align: AlignmentType.CENTER }),
              cell(String(eMax),   { align: AlignmentType.CENTER }),
              cell(String(eMedia), { align: AlignmentType.CENTER, bold: true }),
              cell(String(vla),    { align: AlignmentType.CENTER }),
              cumpleCell(cumple ? "SI" : "NO"),
            ]}),
          ],
        }));

        items.push(new Paragraph({
          children: [run(
            `Uniformidad: E min (${eMin} lux) ${uniCumple ? "≥" : "<"} E media/2 (${Math.round(eMedia / 2)} lux) → ${uniCumple ? "CUMPLE" : "NO CUMPLE"}`,
            { size: 9, bold: true, color: uniCumple ? GREEN_OK : RED_FAIL }
          )],
          spacing: { before: 60, after: 60 },
        }));
      });
  });

  // ── Análisis y recomendaciones estándar
  items.push(pageBreakPara());
  items.push(protocolHeader("PROTOCOLO PARA MEDICIÓN DE ILUMINACIÓN EN EL AMBIENTE LABORAL", establishment));
  items.push(new Table({
    width: { size: CONT_W, type: WidthType.DXA },
    columnWidths: [CONT_W],
    rows: [
      new TableRow({ children: [hdr("Conclusiones")] }),
      new TableRow({ children: [cell(
        "Los resultados obtenidos fueron comparados con los valores de referencia establecidos en la " +
        "Resolución SRT N° 84/2012. Los sectores que no alcanzan el valor mínimo requerido deberán " +
        "implementar las mejoras indicadas en las recomendaciones."
      )] }),
      new TableRow({ children: [hdr("Análisis y Mejoras a Realizar")] }),
      new TableRow({ children: [cell(
        "1. Revisar y reemplazar luminarias en mal estado o con lámparas agotadas.\n" +
        "2. En sectores con incumplimiento: aumentar la cantidad de luminarias o instalar iluminación localizada.\n" +
        "3. Realizar limpieza periódica de luminarias, reflectores y difusores.\n" +
        "4. Verificar que las luminarias instaladas correspondan al tipo de tarea realizada (visual fina / gruesa).\n" +
        "5. Distribuir las luminarias de manera uniforme para evitar zonas de sombra.\n" +
        "6. Considerar el uso de pantallas antireflejos en puestos con trabajo frente a pantallas.\n" +
        "7. Instalar iluminación de emergencia en pasillos y salidas.\n" +
        "8. Efectuar mantenimiento preventivo de las instalaciones eléctricas de iluminación.\n" +
        "9. Reemplazar lámparas incandescentes por LED de alta eficiencia para mejorar niveles y eficiencia energética.\n" +
        "10. En tareas de alta demanda visual: instalar iluminación localizada (≥ 1000 lux en plano de trabajo).\n" +
        "11. Verificar el índice de deslumbramiento (UGR) en puestos con pantallas visualizadoras.\n" +
        "12. Efectuar una nueva medición luego de implementadas las mejoras."
      )] }),
    ],
  }));

  // ── Constancia fotográfica + Meteorológica
  items.push(...spaceBlock("PROTOCOLO PARA MEDICIÓN DE ILUMINACIÓN EN EL AMBIENTE LABORAL", establishment));

  // ── Instructivo
  items.push(pageBreakPara());
  items.push(new Table({
    width: { size: CONT_W, type: WidthType.DXA },
    columnWidths: [CONT_W],
    rows: [
      new TableRow({ children: [hdr("INSTRUCTIVO PARA COMPLETAR EL PROTOCOLO DE MEDICIÓN DE ILUMINACIÓN", { align: AlignmentType.CENTER })] }),
      new TableRow({ children: [cell(
        "1. Identificación del establecimiento (razón social, domicilio, localidad, provincia, CP, CUIT).\n" +
        "2. Instrumento: marca, modelo, número de serie y certificado de calibración vigente.\n" +
        "3. Fecha y hora de la medición (indicar si es diurna o nocturna con iluminación artificial).\n" +
        "4. Tipo de iluminación: Natural, Artificial o Mixta.\n" +
        "5. Tipo de fuente luminosa: LED, Fluorescente, Sodio, Halógena, etc.\n" +
        "6. Sistema de iluminación: General o Localizada.\n" +
        "7. Método de medición: cuadrícula según procedimiento SRT 84/2012. El número de puntos\n" +
        "   de medición se determina en función del factor de local K = (L × A) / (h × (L + A)).\n" +
        "8. E media = promedio aritmético de todos los puntos medidos.\n" +
        "9. E mínima ≥ E media / 2: condición de uniformidad requerida.\n" +
        "10. Valor Legal de Aplicación (VLA): valor mínimo requerido según el tipo de tarea visual\n" +
        "    (Anexo IV, Decreto 351/79 y Resolución SRT 84/2012)."
      )] }),
    ],
  }));

  return items;
}

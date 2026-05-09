// @ts-ignore
import { saveAs } from "file-saver";
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType, Header, Footer, PageNumber,
  HeadingLevel, VerticalAlign, ShadingType, ImageRun,
} from "docx";
import { Establishment, Sector, Measurement, MEASUREMENT_LABELS, MeasurementType } from "@/lib/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useStore } from "@/lib/store";

// ── Constants ───────────────────────────────────────────────────────────────
const NAVY        = "003366";
const HEADER_FILL = "D9E2F3";
const LIGHT_FILL  = "F2F2F2";
const BORDER_THIN = { style: BorderStyle.SINGLE, size: 1, color: "000000" };
const BORDERS_ALL = { top: BORDER_THIN, bottom: BORDER_THIN, left: BORDER_THIN, right: BORDER_THIN };

// ── Helpers ─────────────────────────────────────────────────────────────────
const cell = (
  text: string,
  opts: {
    bold?: boolean; size?: number;
    alignment?: typeof AlignmentType[keyof typeof AlignmentType];
    fill?: string; color?: string; columnSpan?: number; rowSpan?: number;
    width?: { size: number; type: typeof WidthType[keyof typeof WidthType] };
    font?: string;
  } = {}
): TableCell =>
  new TableCell({
    children: [new Paragraph({
      children: [new TextRun({
        text,
        bold: opts.bold ?? false,
        font: opts.font || "Arial",
        size: (opts.size || 9) * 2,
        color: opts.color || "000000",
      })],
      alignment: opts.alignment || AlignmentType.LEFT,
      spacing: { before: 20, after: 20 },
    })],
    borders: BORDERS_ALL,
    shading: opts.fill ? { type: ShadingType.SOLID, color: opts.fill, fill: opts.fill } : undefined,
    columnSpan: opts.columnSpan,
    rowSpan: opts.rowSpan,
    width: opts.width,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 40, bottom: 40, left: 60, right: 60 },
  });

const headerCell = (
  text: string,
  opts: {
    columnSpan?: number;
    alignment?: typeof AlignmentType[keyof typeof AlignmentType];
    width?: { size: number; type: typeof WidthType[keyof typeof WidthType] };
  } = {}
): TableCell =>
  cell(text, { bold: true, size: 8, fill: HEADER_FILL, alignment: opts.alignment || AlignmentType.CENTER, columnSpan: opts.columnSpan, width: opts.width });

const titleParagraph = (
  text: string,
  opts: {
    pageBreak?: boolean; size?: number;
    alignment?: typeof AlignmentType[keyof typeof AlignmentType];
    spacing?: { before?: number; after?: number };
  } = {}
): Paragraph =>
  new Paragraph({
    children: [new TextRun({ text, bold: true, font: "Arial", size: (opts.size || 12) * 2, color: NAVY })],
    alignment: opts.alignment || AlignmentType.CENTER,
    spacing: opts.spacing || { before: 200, after: 200 },
    ...(opts.pageBreak ? { pageBreakBefore: true } : {}),
  });

const textParagraph = (
  text: string,
  opts: {
    bold?: boolean; size?: number;
    spacing?: { before?: number; after?: number };
    alignment?: typeof AlignmentType[keyof typeof AlignmentType];
  } = {}
): Paragraph =>
  new Paragraph({
    children: [new TextRun({ text, bold: opts.bold, font: "Arial", size: (opts.size || 10) * 2 })],
    alignment: opts.alignment || AlignmentType.JUSTIFIED,
    spacing: opts.spacing || { before: 60, after: 60 },
  });

const emptyPara = (before = 100, after = 100): Paragraph =>
  new Paragraph({ text: "", spacing: { before, after } });

const heading = (text: string, level: typeof HeadingLevel[keyof typeof HeadingLevel] = HeadingLevel.HEADING_2): Paragraph =>
  new Paragraph({ text, heading: level, alignment: AlignmentType.CENTER });

const establishmentHeader = (title: string, est: Establishment, subtitle?: string): (Paragraph | Table)[] => {
  const items: (Paragraph | Table)[] = [titleParagraph(title, { size: 11 })];
  if (subtitle) items.push(textParagraph(subtitle, { bold: true, size: 10, alignment: AlignmentType.CENTER }));
  items.push(emptyPara(50, 50));
  items.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [cell("Razón Social:", { bold: true, size: 9 }), cell(est.razonSocial || est.name || "-", { size: 9 })] }),
      new TableRow({ children: [cell("C.U.I.T.:",    { bold: true, size: 9 }), cell(est.cuit || "-",    { size: 9 })] }),
      new TableRow({ children: [cell("Dirección:",   { bold: true, size: 9 }), cell(est.address || "-", { size: 9 })] }),
      new TableRow({ children: [cell("Localidad:",   { bold: true, size: 9 }), cell(est.city || "-",    { size: 9 })] }),
      new TableRow({ children: [cell("C.P.:",        { bold: true, size: 9 }), cell(est.postalCode || "-", { size: 9 })] }),
      new TableRow({ children: [cell("Provincia:",   { bold: true, size: 9 }), cell(est.province || "-",{ size: 9 })] }),
    ],
  }));
  items.push(emptyPara(50, 50));
  return items;
};

const safeDate = (d: string | undefined): string => {
  if (!d) return "-";
  try {
    const dt = new Date(d);
    if (!isNaN(dt.getTime())) return format(dt, "dd/MM/yyyy");
    if (/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/.test(d)) return d;
    return d;
  } catch { return d || "-"; }
};

const getStoreData = () => useStore.getState();

// ── Main generator ───────────────────────────────────────────────────────────
export const generateDocxReport = async (establishment: Establishment, sectors: Sector[]) => {
  const store = getStoreData();
  const children: (Paragraph | Table)[] = [];

  // ── Header / Footer ────────────────────────────────────────────────────────
  const getHeader = () => new Header({
    children: [new Paragraph({
      children: [
        new TextRun({ text: "ENVIRONMENTAL EXPRESS ARGENTINA", bold: true, size: 18, color: NAVY, font: "Arial" }),
        new TextRun({ text: "  |  Servicios de Higiene y Seguridad Laboral", size: 16, color: "666666", font: "Arial" }),
      ],
      alignment: AlignmentType.CENTER,
      border: { bottom: { style: BorderStyle.SINGLE, size: 3, color: NAVY, space: 4 } },
    })],
  });

  const getFooter = () => new Footer({
    children: [new Paragraph({
      children: [
        new TextRun({ text: `${establishment.razonSocial || establishment.name || ""} - `, size: 14, font: "Arial", color: "888888" }),
        new TextRun({ text: "Generado por Environmental Express Argentina - ", size: 14, font: "Arial", color: "888888" }),
        new TextRun({ children: ["Página ", PageNumber.CURRENT, " de ", PageNumber.TOTAL_PAGES], size: 14, font: "Arial" }),
      ],
      alignment: AlignmentType.CENTER,
      border: { top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC", space: 4 } },
    })],
  });

  // ── Cover Page ─────────────────────────────────────────────────────────────
  children.push(emptyPara(800, 200));
  children.push(titleParagraph(establishment.razonSocial || establishment.name || "INFORME TÉCNICO", { size: 18 }));
  if (establishment.address)
    children.push(textParagraph(establishment.address, { size: 12, alignment: AlignmentType.CENTER }));
  if (establishment.city || establishment.province)
    children.push(textParagraph(`${establishment.city || ""}${establishment.province ? `, ${establishment.province}` : ""}`, { size: 12, alignment: AlignmentType.CENTER }));
  children.push(emptyPara(200, 200));

  const allMeasurements = sectors.flatMap(s => s.measurements);
  const hasType = (t: MeasurementType) => allMeasurements.some(m => m.type === t);
  const studyTypes: string[] = [];
  if (hasType('lighting'))     studyTypes.push("ILUMINACIÓN (RESOL. SRT 84/2012)");
  if (hasType('noise'))        studyTypes.push("RUIDO LABORAL (RESOL. SRT 85/2012)");
  if (hasType('thermal_load')) studyTypes.push("CARGA TÉRMICA (RESOL. SRT 30/2023)");
  if (hasType('cold_stress'))  studyTypes.push("ESTRÉS POR FRÍO (RESOL. MTEySS 295/2003)");
  if (studyTypes.length > 0)
    children.push(titleParagraph(`ESTUDIO DE ${studyTypes.join(", ")}`, { size: 11 }));
  children.push(emptyPara(200, 200));
  if (establishment.date)
    children.push(textParagraph(safeDate(establishment.date), { size: 12, alignment: AlignmentType.CENTER, bold: true }));

  // ══════════════════════════════════════════════════════════════════════════
  // CARGA TÉRMICA - Resol. SRT 30/2023
  // ══════════════════════════════════════════════════════════════════════════
  const thermalRows    = store.thermalProtocol?.rows?.length ? store.thermalProtocol.rows : null;
  const thermalCompany = store.thermalProtocol?.company || ({} as any);
  const thermalObs     = store.thermalProtocol?.observaciones;
  const thermalConc    = store.thermalProtocol?.conclusiones;
  const thermalRec     = store.thermalProtocol?.recomendaciones;
  const tc             = thermalCompany;

  const filledThermal = thermalRows?.filter((r: any) => r.sector || r.puestoTrabajo || r.tbs) ?? [];

  if (filledThermal.length > 0) {
    children.push(heading("PROTOCOLO DE MEDICIÓN DE ESTRÉS POR CALOR (RESOL. SRT 30/2023)", HeadingLevel.HEADING_1));
    children.push(titleParagraph("ESTUDIO DE CARGA TÉRMICA SEGÚN RESOL. SRT Nº 30/2023", { pageBreak: true, size: 14 }));
    children.push(emptyPara(100, 100));

    // Datos del Establecimiento
    children.push(...establishmentHeader("INFORME DE MEDICIÓN DE CARGA TÉRMICA EN EL AMBIENTE LABORAL", establishment, "Datos del establecimiento"));

    // Datos de medición
    children.push(textParagraph("Datos para la medición", { bold: true, size: 10 }));
    children.push(emptyPara(50, 50));
    children.push(textParagraph("Marca, modelo y número de serie del instrumento utilizado:", { bold: true, size: 9 }));
    if (tc.instrumento1) {
      children.push(textParagraph(`Instrumento 1: ${tc.instrumento1}`, { size: 9 }));
      if (tc.instrumento1Serie)    children.push(textParagraph(`N° de Serie: ${tc.instrumento1Serie}`, { size: 9 }));
      if (tc.instrumento1Cert)     children.push(textParagraph(`N° de Certificado de Calibración: ${tc.instrumento1Cert}`, { size: 9 }));
      if (tc.instrumento1FechaCal) children.push(textParagraph(`Fecha del certificado de calibración: ${tc.instrumento1FechaCal}`, { size: 9 }));
    }
    if (tc.instrumento2) {
      children.push(textParagraph(`Instrumento 2: ${tc.instrumento2}`, { size: 9 }));
      if (tc.instrumento2Serie)    children.push(textParagraph(`N° de Serie: ${tc.instrumento2Serie}`, { size: 9 }));
      if (tc.instrumento2Cert)     children.push(textParagraph(`N° de Certificado de Calibración: ${tc.instrumento2Cert}`, { size: 9 }));
      if (tc.instrumento2FechaCal) children.push(textParagraph(`Fecha del certificado de calibración: ${tc.instrumento2FechaCal}`, { size: 9 }));
    }
    children.push(emptyPara(50, 50));
    children.push(textParagraph(`Fecha de la medición: ${tc.fechaMedicion || safeDate(establishment.date)}`, { size: 9 }));
    children.push(textParagraph(`Hora de inicio: ${tc.horaInicio || establishment.startTime || "-"} Hs`, { size: 9 }));
    children.push(textParagraph(`Hora finalización: ${tc.horaFin || establishment.endTime || "-"} Hs`, { size: 9 }));
    children.push(textParagraph(`Horarios/turnos habituales de trabajo: ${tc.turnos || "-"}`, { size: 9 }));
    if (tc.condicionesAtm) {
      children.push(emptyPara(50, 50));
      children.push(textParagraph("Las condiciones atmosféricas durante la medición fueron las siguientes:", { bold: true, size: 9 }));
      children.push(textParagraph(tc.condicionesAtm, { size: 9 }));
    }

    // ── Análisis de Tasa Metabólica ────────────────────────────────────────
    children.push(emptyPara(100, 50));
    children.push(textParagraph("Análisis de Tasa Metabólica (TM)", { bold: true, size: 10 }));
    children.push(emptyPara(50, 50));
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [headerCell("Componente"), headerCell("Valor (W)")] }),
        new TableRow({ children: [cell("Metabolismo Basal (Sentado / Ligero)", { size: 8 }), cell("126 W", { size: 8, alignment: AlignmentType.CENTER })] }),
        new TableRow({ children: [cell("Suplemento Postura (De Pie)", { size: 8 }),            cell("27 W",  { size: 8, alignment: AlignmentType.CENTER })] }),
        new TableRow({ children: [cell("Tipo de trabajo y grupo muscular",   { size: 8 }),     cell("(según tabla SRT)", { size: 8, alignment: AlignmentType.CENTER })] }),
        new TableRow({ children: [cell("TOTAL TASA METABÓLICA",  { size: 8, bold: true }),     cell(filledThermal[0]?.cargaMetabolica ? `${filledThermal[0].cargaMetabolica} W` : "Ver tabla datos", { size: 8, bold: true, alignment: AlignmentType.CENTER })] }),
      ],
    }));

    // ── Tabla de datos ─────────────────────────────────────────────────────
    children.push(...establishmentHeader("INFORME DE MEDICIÓN DE CARGA TÉRMICA EN EL AMBIENTE LABORAL", establishment, "DATOS DE LA MEDICIÓN"));

    const thermalDataRows = filledThermal.map((r: any, idx: number) =>
      new TableRow({
        children: [
          cell((idx + 1).toString().padStart(2, "0"), { size: 8, alignment: AlignmentType.CENTER }),
          cell(r.sector         || "-", { size: 8 }),
          cell(r.puestoTrabajo  || "-", { size: 8 }),
          cell(r.exposicionHs   || "-", { size: 8, alignment: AlignmentType.CENTER }),
          cell(r.tbs            || "-", { size: 8, alignment: AlignmentType.CENTER }),
          cell(r.tbh            || "-", { size: 8, alignment: AlignmentType.CENTER }),
          cell(r.tg             || "-", { size: 8, alignment: AlignmentType.CENTER }),
          cell(r.tgbh           || "-", { size: 8, alignment: AlignmentType.CENTER }),
          cell(r.tgbhPonderado  || "-", { size: 8, alignment: AlignmentType.CENTER }),
          cell(r.aclimatado     || "SI",{ size: 8, alignment: AlignmentType.CENTER }),
          cell(r.cargaMetabolica|| "-", { size: 8, alignment: AlignmentType.CENTER }),
          cell(r.vla            || "-", { size: 8, alignment: AlignmentType.CENTER }),
          cell(r.vlp            || "-", { size: 8, alignment: AlignmentType.CENTER }),
          cell(r.cumpleVla || "-", { size: 8, alignment: AlignmentType.CENTER, bold: true, color: r.cumpleVla === "SI" ? "008800" : "CC0000" }),
          cell(r.cumpleVlp || "-", { size: 8, alignment: AlignmentType.CENTER, bold: true, color: r.cumpleVlp === "SI" ? "008800" : "CC0000" }),
        ],
      })
    );

    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            headerCell("Punto"), headerCell("Sector"), headerCell("Puesto / Puesto tipo"),
            headerCell("Exposición (h)"), headerCell("TBS (ºC)"), headerCell("TBH (ºC)"),
            headerCell("TG (ºC)"), headerCell("TGBH (ºC)"), headerCell("TGBH Pond."),
            headerCell("Aclim."), headerCell("TM (W)"), headerCell("VLA"), headerCell("VLP"),
            headerCell("Cumple VLA"), headerCell("Cumple VLP"),
          ],
        }),
        ...thermalDataRows,
      ],
    }));

    if (filledThermal.some((r: any) => r.observaciones)) {
      children.push(emptyPara(100, 50));
      children.push(textParagraph("(34) Información adicional:", { bold: true, size: 9 }));
      filledThermal.forEach((r: any, idx: number) => {
        if (r.observaciones)
          children.push(textParagraph(`Punto de Medición ${(idx + 1).toString().padStart(2, "0")}: ${r.observaciones}`, { size: 9 }));
      });
    }

    // ── Valores de Referencia ──────────────────────────────────────────────
    children.push(...establishmentHeader("INFORME DE MEDICIÓN DE CARGA TÉRMICA EN EL AMBIENTE LABORAL", establishment, "Valores de Referencia"));
    children.push(textParagraph("Categorías de las tareas según la Tasa Metabólica ponderada", { bold: true, size: 9 }));
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [headerCell("Categoría"), headerCell("Tasa Metabólica media / ponderada (W)")] }),
        new TableRow({ children: [cell("0 - Descanso",                        { size: 8 }), cell("115 (100 a 125)", { size: 8, alignment: AlignmentType.CENTER })] }),
        new TableRow({ children: [cell("1 - Tasa Metabólica Baja: LIGERO",    { size: 8 }), cell("180 (126 a 235)", { size: 8, alignment: AlignmentType.CENTER })] }),
        new TableRow({ children: [cell("2 - Tasa Metabólica Moderada: MODERADO", { size: 8 }), cell("300 (236 a 360)", { size: 8, alignment: AlignmentType.CENTER })] }),
        new TableRow({ children: [cell("3 - Tasa Metabólica Alta: PESADO",    { size: 8 }), cell("415 (361 a 465)", { size: 8, alignment: AlignmentType.CENTER })] }),
        new TableRow({ children: [cell("4 - Tasa Metabólica Muy Alta: MUY PESADO", { size: 8 }), cell("520 (Mayor a 466)", { size: 8, alignment: AlignmentType.CENTER })] }),
      ],
    }));

    children.push(emptyPara(100, 50));
    children.push(textParagraph("El criterio de evaluación a seguir luego de las mediciones es el indicado en la Resolución SRT N° 30/2023.", { size: 9 }));
    children.push(textParagraph("Los Valores Límites se expresan tomando en cuenta el uso de una vestimenta típica como ropa de trabajo de algodón (0.6clo) compuesta por camisa de manga y pantalón largos. Cuando la ropa utilizada por los trabajadores difiera de estas características, se deberá realizar una corrección sobre el índice TGBH calculado adicionando un valor definido como Valor de Ajuste por Ropa (VAR).", { size: 9 }));

    children.push(emptyPara(50, 50));
    children.push(textParagraph("TABLA: TIPO DE ROPA Y VALOR DE AJUSTE (VAR)", { bold: true, size: 9 }));
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [headerCell("Tipo de Ropa"), headerCell("VAR")] }),
        new TableRow({ children: [cell("Ropa de trabajo: Camisa de manga y pantalón largos. Tela: Algodón", { size: 8 }), cell("0",    { size: 8, alignment: AlignmentType.CENTER })] }),
        new TableRow({ children: [cell("Overol de material tejido",                    { size: 8 }), cell("0",    { size: 8, alignment: AlignmentType.CENTER })] }),
        new TableRow({ children: [cell("Overol de polipropileno SMS de una sola capa", { size: 8 }), cell("+0.5", { size: 8, alignment: AlignmentType.CENTER })] }),
        new TableRow({ children: [cell("Overol de poliolefina de una sola capa",       { size: 8 }), cell("+1",   { size: 8, alignment: AlignmentType.CENTER })] }),
        new TableRow({ children: [cell("Ropa tejida de doble capa",                    { size: 8 }), cell("+3",   { size: 8, alignment: AlignmentType.CENTER })] }),
        new TableRow({ children: [cell("Overol barrera de vapor con capucha",          { size: 8 }), cell("+11",  { size: 8, alignment: AlignmentType.CENTER })] }),
      ],
    }));

    // ── Conclusiones ───────────────────────────────────────────────────────
    children.push(...establishmentHeader("INFORME DE MEDICIÓN DE CARGA TÉRMICA EN EL AMBIENTE LABORAL", establishment, "Análisis de los Datos"));
    children.push(textParagraph("Conclusiones", { bold: true, size: 10 }));
    if (thermalConc) {
      children.push(textParagraph(thermalConc, { size: 9 }));
    } else {
      children.push(textParagraph("La determinación del estrés térmico y la tensión térmica se utiliza para evaluar el riesgo a la salud y seguridad del trabajador. Los Valores Límites Permisibles representan las condiciones bajo las cuales se cree que casi todos los trabajadores sanos pueden estar expuestos repetidamente al calor sin sufrir efectos adversos para la salud.", { size: 9 }));
      filledThermal.forEach((r: any) => {
        if (r.puestoTrabajo) {
          const cumple = r.cumpleVla === "SI" && r.cumpleVlp === "SI";
          children.push(textParagraph(`${r.puestoTrabajo.toUpperCase()}: ${cumple ? "CUMPLE el VLA y VLP" : "NO CUMPLE el VLA y/o VLP"} según Resol. SRT 30/2023.`, { bold: true, size: 9 }));
        }
      });
    }

    // ── Recomendaciones ────────────────────────────────────────────────────
    children.push(emptyPara(100, 50));
    children.push(textParagraph("Recomendaciones", { bold: true, size: 10 }));
    if (thermalRec) {
      children.push(textParagraph(thermalRec, { size: 9 }));
    } else {
      children.push(textParagraph("• Permitir la autolimitación de las exposiciones y fomentar la observación de signos y síntomas de tensión térmica.", { size: 9 }));
      children.push(textParagraph("• Proveer agua fría en los puestos de trabajo y fomentar la ingesta frecuente.", { size: 9 }));
      children.push(textParagraph("• Capacitar a los trabajadores sobre estrés térmico y tensión térmica.", { size: 9 }));
    }

    // Controles Generales
    children.push(...establishmentHeader("INFORME DE MEDICIÓN DE CARGA TÉRMICA EN EL AMBIENTE LABORAL", establishment, "Controles Generales"));
    children.push(textParagraph("Si se superase el VLA, el empleador deberá:", { bold: true, size: 9 }));
    children.push(textParagraph("• Declarar a los trabajadores expuestos a agente de riesgo Calor (ESOP 80001) mediante la Nómina de Trabajadores Expuestos ante su ART.", { size: 9 }));
    children.push(textParagraph("• Proveer de agua fría en los puestos de trabajo y fomentar la ingesta de pequeñas cantidades.", { size: 9 }));
    children.push(textParagraph("• Permitir la autolimitación de las exposiciones y fomentar la observación de signos y síntomas de tensión térmica.", { size: 9 }));
    children.push(textParagraph("• Brindar capacitación y entrenamiento periódico acerca del estrés térmico.", { size: 9 }));
    children.push(textParagraph("• Establecer un programa de monitoreo de las condiciones higrotérmicas.", { size: 9 }));
    children.push(textParagraph("• Monitorear a trabajadores con medicación que pueda afectar la regulación térmica.", { size: 9 }));
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ESTRÉS POR FRÍO - Resol. MTEySS 295/2003
  // ══════════════════════════════════════════════════════════════════════════
  const coldRows    = store.coldProtocol?.rows?.length ? store.coldProtocol.rows : null;
  const coldCompany = store.coldProtocol?.company || ({} as any);
  const coldObs     = store.coldProtocol?.observaciones;
  const coldConc    = store.coldProtocol?.conclusiones;
  const coldRec     = store.coldProtocol?.recomendaciones;
  const cc          = coldCompany;

  const filledCold = coldRows?.filter((r: any) => r.sector || r.puestoTrabajo || r.tbs) ?? [];

  if (filledCold.length > 0) {
    children.push(titleParagraph("ESTUDIO DE ESTRÉS POR FRÍO SEGÚN RESOL. MTEySS Nº 295/2003", { pageBreak: true, size: 14 }));
    children.push(emptyPara(100, 100));
    children.push(...establishmentHeader("PROTOCOLO DE MEDICIÓN DE ESTRÉS POR FRÍO EN EL AMBIENTE LABORAL", establishment, "Datos del establecimiento"));

    children.push(textParagraph("Datos para la medición", { bold: true, size: 10 }));
    children.push(textParagraph("Marca, modelo y número de serie del instrumento utilizado:", { bold: true, size: 9 }));
    if (cc.instrumento1) {
      children.push(textParagraph(`Instrumento: ${cc.instrumento1}`, { size: 9 }));
      if (cc.instrumento1Serie)    children.push(textParagraph(`N° de Serie: ${cc.instrumento1Serie}`, { size: 9 }));
      if (cc.instrumento1Cert)     children.push(textParagraph(`Certificado de Calibración: ${cc.instrumento1Cert}`, { size: 9 }));
      if (cc.instrumento1FechaCal) children.push(textParagraph(`Fecha del certificado de calibración: ${cc.instrumento1FechaCal}`, { size: 9 }));
    }
    children.push(emptyPara(50, 50));
    children.push(textParagraph(`Fecha de la medición: ${cc.fechaMedicion || safeDate(establishment.date)}`, { size: 9 }));
    children.push(textParagraph(`Hora de inicio: ${cc.horaInicio || "-"} Hs`, { size: 9 }));
    children.push(textParagraph(`Hora finalización: ${cc.horaFin || "-"} Hs`, { size: 9 }));
    children.push(textParagraph(`Horarios/turnos habituales de trabajo: ${cc.turnos || "-"}`, { size: 9 }));
    if (cc.condicionesAtm) {
      children.push(emptyPara(50, 50));
      children.push(textParagraph("Las condiciones atmosféricas durante la medición fueron las siguientes:", { bold: true, size: 9 }));
      children.push(textParagraph(cc.condicionesAtm, { size: 9 }));
    }

    children.push(...establishmentHeader("PROTOCOLO DE MEDICIÓN DE ESTRÉS POR FRÍO EN EL AMBIENTE LABORAL", establishment, "DATOS DE LA MEDICIÓN"));

    const coldDataRows = filledCold.map((r: any, idx: number) =>
      new TableRow({
        children: [
          cell((idx + 1).toString().padStart(2, "0"), { size: 7, alignment: AlignmentType.CENTER }),
          cell(r.sector                 || "-", { size: 7 }),
          cell(r.puestoTrabajo          || "-", { size: 7 }),
          cell(r.rangoTemp              || "-", { size: 7, alignment: AlignmentType.CENTER }),
          cell(r.ciclosExposicion       || "-", { size: 7, alignment: AlignmentType.CENTER }),
          cell(r.duracionCiclo          || "-", { size: 7, alignment: AlignmentType.CENTER }),
          cell(r.tiempoNetoExposicion   || "-", { size: 7, alignment: AlignmentType.CENTER }),
          cell(r.tiempoIntegracion      || "-", { size: 7, alignment: AlignmentType.CENTER }),
          cell(r.caracteristicasExposicion || "-", { size: 7 }),
          cell(r.tbs                    || "-", { size: 7, alignment: AlignmentType.CENTER }),
          cell(r.velocidadViento        || "-", { size: 7, alignment: AlignmentType.CENTER }),
          cell(r.tee                    || "-", { size: 7, alignment: AlignmentType.CENTER }),
          cell(r.tipoUniforme           || "-", { size: 7 }),
          cell(r.exposicionMas4h        || "-", { size: 7, alignment: AlignmentType.CENTER }),
        ],
      })
    );

    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            headerCell("Punto"), headerCell("Sector"), headerCell("Puesto de Trabajo"),
            headerCell("Rango Temp. (ºC)"), headerCell("Ciclos Exp."),
            headerCell("Duración Ciclo (min)"), headerCell("Tiempo Neto Exp. (min)"),
            headerCell("Tiempo Integr. (min)"), headerCell("Carac. Exposición"),
            headerCell("TBS (ºC)"), headerCell("Veloc. (m/s)"), headerCell("TEE (ºC)"),
            headerCell("Tipo Uniforme"), headerCell(">4h? (SI/NO)"),
          ],
        }),
        ...coldDataRows,
      ],
    }));

    children.push(emptyPara(50, 50));
    children.push(textParagraph("Información Adicional", { bold: true, size: 9 }));
    children.push(textParagraph("TBS (Temperatura de bulbo seco)", { size: 9 }));
    children.push(textParagraph("TEE (Temperatura equivalente de enfriamiento en relación con la Velocidad del Aire)", { size: 9 }));

    if (coldObs) {
      children.push(...establishmentHeader("PROTOCOLO DE MEDICIÓN DE ESTRÉS POR FRÍO EN EL AMBIENTE LABORAL", establishment, "OBSERVACIONES"));
      children.push(textParagraph(coldObs, { size: 9 }));
    }

    children.push(...establishmentHeader("PROTOCOLO DE MEDICIÓN DE ESTRÉS POR FRÍO EN EL AMBIENTE LABORAL", establishment, "Valores Legales de Referencia Res. MTyESS # 295/03"));
    children.push(textParagraph("Los valores límite son aplicables solamente para trabajadores con ropa seca.", { size: 9 }));
    children.push(textParagraph("Hay que proveer a los trabajadores de ropa aislante seca adecuada para mantener la temperatura del cuerpo por encima de los 36°C si el trabajo se realiza a temperaturas del aire inferiores a 4°C. Son factores críticos la relación de enfriamiento y el poder de refrigeración del aire.", { size: 9 }));

    children.push(...establishmentHeader("PROTOCOLO DE MEDICIÓN DE ESTRÉS POR FRÍO EN EL AMBIENTE LABORAL", establishment, "Conclusiones"));
    if (coldConc) {
      children.push(textParagraph(coldConc, { size: 9 }));
    } else {
      children.push(textParagraph("Analizando la TEE y siguiendo los lineamientos de la Ley 19.587/72, Res. Nac. del MTEySS # 295/2003, modificatoria del Decreto 351/79, y considerando el tipo de muestreo que se realizó, el tiempo de exposición informado por la empresa y de mantenerse los parámetros medidos:", { size: 9 }));
    }

    if (coldRec) {
      children.push(...establishmentHeader("PROTOCOLO DE MEDICIÓN DE ESTRÉS POR FRÍO EN EL AMBIENTE LABORAL", establishment, "Recomendaciones"));
      children.push(textParagraph(coldRec, { size: 9 }));
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ILUMINACIÓN - Resol. SRT 84/2012
  // ══════════════════════════════════════════════════════════════════════════
  const lightingMeasurements = sectors.flatMap(s =>
    s.measurements.filter(m => m.type === 'lighting').map(m => ({ ...m, sectorName: s.name }))
  );

  if (lightingMeasurements.length > 0) {
    children.push(titleParagraph("ESTUDIO DE ILUMINACIÓN SEGÚN RESOL. SRT Nº 84/2012", { pageBreak: true, size: 14 }));
    children.push(emptyPara(100, 100));
    children.push(...establishmentHeader("PROTOCOLO PARA MEDICIÓN DE ILUMINACIÓN EN EL AMBIENTE LABORAL", establishment, "Datos del establecimiento"));

    const lightDetail = lightingMeasurements[0]?.details;
    children.push(textParagraph("Datos para la medición", { bold: true, size: 10 }));
    if (lightDetail?.brand) {
      children.push(textParagraph(`Instrumento: ${lightDetail.brand} ${lightDetail.model || ""}`, { size: 9 }));
      if (lightDetail.serialNumber)    children.push(textParagraph(`N° de Serie: ${lightDetail.serialNumber}`, { size: 9 }));
      if (lightDetail.calibrationDate) children.push(textParagraph(`Fecha del certificado de calibración: ${lightDetail.calibrationDate}`, { size: 9 }));
    }
    children.push(textParagraph(`Fecha de la medición: ${lightDetail?.measurementDate || safeDate(establishment.date)}`, { size: 9 }));
    children.push(textParagraph(`Hora de inicio: ${lightDetail?.startTime || establishment.startTime || "-"} Hs`, { size: 9 }));
    children.push(textParagraph(`Hora finalización: ${lightDetail?.endTime || establishment.endTime || "-"} Hs`, { size: 9 }));
    if (lightDetail?.workShifts)
      children.push(textParagraph(`Horarios/turnos habituales de trabajo: ${lightDetail.workShifts}`, { size: 9 }));
    if (lightDetail?.normalConditions) {
      children.push(emptyPara(50, 50));
      children.push(textParagraph("Describa las condiciones normales y/o habituales de trabajo:", { bold: true, size: 9 }));
      children.push(textParagraph(lightDetail.normalConditions, { size: 9 }));
    }
    if (lightDetail?.currentConditions) {
      children.push(textParagraph("Describa las condiciones de trabajo al momento de la medición:", { bold: true, size: 9 }));
      children.push(textParagraph(lightDetail.currentConditions, { size: 9 }));
    }

    const pageSize = 9;
    for (let page = 0; page < Math.ceil(lightingMeasurements.length / pageSize); page++) {
      const startIdx = page * pageSize;
      const pageItems = lightingMeasurements.slice(startIdx, startIdx + pageSize);
      children.push(...establishmentHeader("PROTOCOLO PARA MEDICIÓN DE ILUMINACIÓN EN EL AMBIENTE LABORAL", establishment, "DATOS DE LA MEDICIÓN"));

      const lightRows = pageItems.map((m, localIdx) => {
        const idx = startIdx + localIdx;
        const values = m.points.map(p => Number(p.values.lux) || 0).filter(v => v > 0);
        const avg = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
        const eMin = values.length > 0 ? Math.min(...values) : 0;
        const uniformityMet = eMin >= avg / 2;
        const valorLegal = m.config?.limit || "-";
        return new TableRow({
          children: [
            cell((idx + 1).toString().padStart(2, "0"), { size: 7, alignment: AlignmentType.CENTER }),
            cell(m.details?.startTime || "-",     { size: 7, alignment: AlignmentType.CENTER }),
            cell(m.sectorName || "-",             { size: 7 }),
            cell(m.name || m.points[0]?.notes || "-", { size: 7 }),
            cell(m.config?.lightingType === 'natural' ? "Natural" : m.config?.lightingType === 'mixed' ? "Mixta" : "Artificial", { size: 7, alignment: AlignmentType.CENTER }),
            cell(m.config?.lightSource || m.config?.artifactType || "-", { size: 7, alignment: AlignmentType.CENTER }),
            cell(m.config?.lightingSystemType === 'localized' ? "Localizada" : m.config?.lightingSystemType === 'mixed' ? "Mixta" : "General", { size: 7, alignment: AlignmentType.CENTER }),
            cell(`${eMin} ${uniformityMet ? "≥" : "<"} ${Math.round(avg / 2)}`, { size: 7, alignment: AlignmentType.CENTER }),
            cell(avg.toString(), { size: 7, alignment: AlignmentType.CENTER, bold: true }),
            cell(valorLegal.toString(), { size: 7, alignment: AlignmentType.CENTER }),
          ],
        });
      });

      children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              headerCell("Punto"), headerCell("Hora"), headerCell("Sector"),
              headerCell("Sección / Puesto"), headerCell("Tipo Iluminación"),
              headerCell("Fuente Lumínica"), headerCell("Iluminación"),
              headerCell("Uniformidad E min ≥ (E media)/2"),
              headerCell("Valor Medido (Lux)"), headerCell("Valor Legal (Lux)"),
            ],
          }),
          ...lightRows,
        ],
      }));
    }

    const lightObs = lightingMeasurements.find(m => m.observations)?.observations;
    if (lightObs) {
      children.push(...establishmentHeader("PROTOCOLO PARA MEDICIÓN DE ILUMINACIÓN EN EL AMBIENTE LABORAL", establishment, "OBSERVACIONES"));
      children.push(textParagraph(lightObs, { size: 9 }));
    }

    const lightRec = lightingMeasurements.find(m => m.analysisAndImprovements)?.analysisAndImprovements;
    children.push(...establishmentHeader("PROTOCOLO PARA MEDICIÓN DE ILUMINACIÓN EN EL AMBIENTE LABORAL", establishment, "ANÁLISIS DE LOS DATOS Y MEJORAS A REALIZAR"));
    children.push(textParagraph("Recomendaciones para adecuar el nivel de iluminación a la legislación vigente:", { bold: true, size: 9 }));
    if (lightRec) children.push(textParagraph(lightRec, { size: 9 }));
    children.push(emptyPara(50, 50));
    children.push(textParagraph("MANTENIMIENTO PREVENTIVO Y CORRECTIVO", { bold: true, size: 9 }));
    [
      "• Confeccionar un programa de limpieza y recambio de luminarias quemadas.",
      "• Evaluar lámparas envejecidas no renovadas.",
      "• Evaluar deterioros en la superficie de reflexión de las luminarias.",
      "• Verificar que la distribución y orientación de las luminarias sea la adecuada.",
      "• Verificar en forma periódica el buen funcionamiento del sistema de iluminación de emergencia.",
      "• Evitar el deslumbramiento directo o reflejado.",
      "• Controlar si existe dificultad en la percepción visual mediante encuestas a los empleados.",
      "• Observar que las sombras y los contrastes sean los adecuados.",
      "• Evaluar la incorporación de luminarias con el objeto de mejorar el desempeño de la tarea.",
    ].forEach(t => children.push(textParagraph(t, { size: 9 })));

    children.push(emptyPara(50, 50));
    children.push(textParagraph("Tabla: Vida Útil de Fuentes Luminosas", { bold: true, size: 9 }));
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [headerCell("Tipo"), headerCell("Potencia (W)"), headerCell("Rendimiento (lm/w)"), headerCell("Horas")] }),
        new TableRow({ children: [cell("LED",           { size: 8 }), cell("14",          { size: 8, alignment: AlignmentType.CENTER }), cell("150", { size: 8, alignment: AlignmentType.CENTER }), cell("50000", { size: 8, alignment: AlignmentType.CENTER })] }),
        new TableRow({ children: [cell("Incandescentes",{ size: 8 }), cell("40/60/100/200",{ size: 8, alignment: AlignmentType.CENTER }), cell("10/15",{ size: 8, alignment: AlignmentType.CENTER }), cell("1000",  { size: 8, alignment: AlignmentType.CENTER })] }),
        new TableRow({ children: [cell("Fluorescentes", { size: 8 }), cell("40",           { size: 8, alignment: AlignmentType.CENTER }), cell("65",  { size: 8, alignment: AlignmentType.CENTER }), cell("7000",  { size: 8, alignment: AlignmentType.CENTER })] }),
        new TableRow({ children: [cell("Mercurio",      { size: 8 }), cell("125/250/400",  { size: 8, alignment: AlignmentType.CENTER }), cell("50",  { size: 8, alignment: AlignmentType.CENTER }), cell("12000", { size: 8, alignment: AlignmentType.CENTER })] }),
      ],
    }));
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RUIDO LABORAL - Resol. SRT 85/2012
  // ══════════════════════════════════════════════════════════════════════════
  const noiseRows    = store.noiseRows?.length ? store.noiseRows : null;
  const noiseCompany = store.noiseCompany || ({} as any);
  const noiseObs     = store.noiseObs;
  const noiseConc    = store.noiseConc;
  const noiseRec     = store.noiseRec;
  const nc           = noiseCompany;

  const filledNoise = noiseRows?.filter((r: any) => r.sector || r.puestoTrabajo || r.valorMedido) ?? [];

  if (filledNoise.length > 0) {
    children.push(titleParagraph("ESTUDIO DE RUIDO LABORAL SEGÚN RESOL. SRT Nº 85/2012", { pageBreak: true, size: 14 }));
    children.push(emptyPara(100, 100));
    children.push(...establishmentHeader("PROTOCOLO DE MEDICIÓN DE RUIDO EN EL AMBIENTE LABORAL", establishment, "Datos del establecimiento"));

    children.push(textParagraph("Datos para la medición", { bold: true, size: 10 }));
    children.push(textParagraph("Marca, modelo y número de serie del instrumento utilizado:", { bold: true, size: 9 }));
    if (nc.instrumento1) {
      children.push(textParagraph(`Instrumento 1: ${nc.instrumento1}`, { size: 9 }));
      if (nc.instrumento1Serie)    children.push(textParagraph(`N° de Serie: ${nc.instrumento1Serie}`, { size: 9 }));
      if (nc.instrumento1Cert)     children.push(textParagraph(`N° de Certificado de Calibración: ${nc.instrumento1Cert}`, { size: 9 }));
      if (nc.instrumento1FechaCal) children.push(textParagraph(`Fecha del certificado de calibración: ${nc.instrumento1FechaCal}`, { size: 9 }));
    }
    if (nc.instrumento2) {
      children.push(textParagraph(`Instrumento 2: ${nc.instrumento2}`, { size: 9 }));
      if (nc.instrumento2Serie)    children.push(textParagraph(`N° de Serie: ${nc.instrumento2Serie}`, { size: 9 }));
      if (nc.instrumento2Cert)     children.push(textParagraph(`N° de Certificado de Calibración: ${nc.instrumento2Cert}`, { size: 9 }));
      if (nc.instrumento2FechaCal) children.push(textParagraph(`Fecha del certificado de calibración: ${nc.instrumento2FechaCal}`, { size: 9 }));
    }
    children.push(emptyPara(50, 50));
    children.push(textParagraph(`Fecha de la medición: ${nc.fechaMedicion || safeDate(establishment.date)}`, { size: 9 }));
    children.push(textParagraph(`Hora de inicio: ${nc.horaInicio || "-"} Hs`, { size: 9 }));
    children.push(textParagraph(`Hora finalización: ${nc.horaFin || "-"} Hs`, { size: 9 }));
    children.push(textParagraph(`Horarios/turnos habituales de trabajo: ${nc.turnos || nc.jornadaLaboral || "-"}`, { size: 9 }));

    if (nc.condicionesNormales) {
      children.push(emptyPara(50, 50));
      children.push(textParagraph("Describa las condiciones normales y/o habituales de trabajo:", { bold: true, size: 9 }));
      children.push(textParagraph(nc.condicionesNormales, { size: 9 }));
    }
    if (nc.condicionesMedicion) {
      children.push(emptyPara(50, 50));
      children.push(textParagraph("Describa las condiciones de trabajo al momento de la medición:", { bold: true, size: 9 }));
      children.push(textParagraph(nc.condicionesMedicion, { size: 9 }));
    }

    // ── Validación de cumplimiento (tabla de ruido) ────────────────────────
    children.push(textParagraph("Resultados de Ruido Laboral", { bold: true, size: 10 }));
    children.push(...establishmentHeader("PROTOCOLO DE MEDICIÓN DE RUIDO EN EL AMBIENTE LABORAL", establishment, "DATOS DE LA MEDICIÓN"));

    const noiseDataRows = filledNoise.map((r: any, idx: number) =>
      new TableRow({
        children: [
          cell((idx + 1).toString().padStart(2, "0"), { size: 7, alignment: AlignmentType.CENTER }),
          cell(r.sector         || "-", { size: 7 }),
          cell(r.puestoTrabajo  || "-", { size: 7 }),
          cell(r.tiempoExposicion || "-", { size: 7, alignment: AlignmentType.CENTER }),
          cell(r.tiempoIntegracion || "-", { size: 7, alignment: AlignmentType.CENTER }),
          cell(r.tipoRuido      || "-", { size: 7 }),
          cell(r.valorMedido    || "-", { size: 7, alignment: AlignmentType.CENTER, bold: true }),
          cell(r.fraccion       || "-", { size: 7, alignment: AlignmentType.CENTER }),
          cell(r.dosisRuido     || "-", { size: 7, alignment: AlignmentType.CENTER }),
          cell(r.cumple || "-", {
            size: 7, alignment: AlignmentType.CENTER, bold: true,
            color: r.cumple === "SI" ? "008800" : r.cumple === "NO" ? "CC0000" : "000000",
          }),
        ],
      })
    );

    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            headerCell("Punto"), headerCell("Sector"), headerCell("Puesto / Puesto tipo"),
            headerCell("Tiempo Exp. (Te)"), headerCell("Tiempo Integr."),
            headerCell("Carac. del Ruido"), headerCell("LAeq (dBA)"),
            headerCell("Suma Fracciones"), headerCell("Dosis (%)"), headerCell("Cumple (SI/NO)"),
          ],
        }),
        ...noiseDataRows,
      ],
    }));

    if (filledNoise.some((r: any) => r.observaciones)) {
      children.push(emptyPara(100, 50));
      children.push(textParagraph("(34) Información adicional:", { bold: true, size: 9 }));
      filledNoise.forEach((r: any, idx: number) => {
        if (r.observaciones)
          children.push(textParagraph(`Punto de Medición ${(idx + 1).toString().padStart(2, "0")}: ${r.observaciones}`, { size: 9 }));
      });
    }

    // ── Valores de referencia ──────────────────────────────────────────────
    children.push(...establishmentHeader("PROTOCOLO DE MEDICIÓN DE RUIDO EN EL AMBIENTE LABORAL", establishment, "VALORES DE REFERENCIA"));
    children.push(textParagraph("El criterio de evaluación a seguir luego de las mediciones es el indicado en el Anexo V de la Resolución 295/2003 del MTEySS.", { size: 9 }));
    children.push(emptyPara(50, 50));
    children.push(textParagraph("Valores Límites para el Ruido", { bold: true, size: 9 }));
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [headerCell("Duración por Día"), headerCell("Nivel de Presión Acústica dBA")] }),
        ...([["24 Horas","80"],["16 Horas","82"],["8 Horas","85"],["4 Horas","88"],["2 Horas","91"],
             ["1 Hora","94"],["30 Minutos","97"],["15 Minutos","100"],["7,5 Minutos","103"],
             ["3,75 Minutos","106"],["1,88 Minutos","109"]].map(([d, v]) =>
          new TableRow({ children: [cell(d, { size: 8 }), cell(v, { size: 8, alignment: AlignmentType.CENTER })] })
        )),
      ],
    }));
    children.push(emptyPara(50, 50));
    children.push(textParagraph("No ha de haber exposiciones al ruido continuo, intermitente o de impacto por encima de un nivel pico C ponderado de 140 dBA.", { size: 9, bold: true }));

    // ── Conclusiones ───────────────────────────────────────────────────────
    children.push(...establishmentHeader("PROTOCOLO DE MEDICIÓN DE RUIDO EN EL AMBIENTE LABORAL", establishment, "Análisis de los Datos y Mejoras a Realizar"));
    children.push(textParagraph("Conclusiones", { bold: true, size: 10 }));
    if (noiseConc) {
      children.push(textParagraph(noiseConc, { size: 9 }));
    } else {
      children.push(textParagraph("Para los puestos evaluados se puede concluir lo siguiente:", { size: 9 }));
      filledNoise.forEach((r: any) => {
        if (r.puestoTrabajo) {
          const cumple = r.cumple === "SI";
          children.push(textParagraph(
            `${r.puestoTrabajo.toUpperCase()}: ${cumple ? "CUMPLE CON EL VALOR LIMITE UMBRAL" : "NO CUMPLE CON EL VALOR LIMITE UMBRAL"} (EXPOSICIÓN GLOBAL)`,
            { bold: true, size: 9 }
          ));
        }
      });
    }

    // ── Recomendaciones ────────────────────────────────────────────────────
    children.push(emptyPara(100, 50));
    children.push(textParagraph("Recomendaciones para adecuar el nivel de ruido a la legislación vigente:", { bold: true, size: 10 }));
    if (noiseRec) children.push(textParagraph(noiseRec, { size: 9 }));
    children.push(emptyPara(50, 50));
    children.push(textParagraph("En su fuente:", { bold: true, size: 9 }));
    [
      "• Impedir o disminuir el choque entre piezas.",
      "• Sustituir piezas de metal por piezas de plástico más silenciosas.",
      "• Aislar las piezas de la máquina que sean particularmente ruidosas.",
      "• Colocar silenciadores en las salidas de aire de las válvulas neumáticas.",
      "• Emplear máquinas poco ruidosas y tecnología de bajo ruido.",
      "• Delimitar las zonas de ruido y señalizarlas.",
    ].forEach(t => children.push(textParagraph(t, { size: 9 })));
    children.push(emptyPara(50, 50));
    children.push(textParagraph("Barreras:", { bold: true, size: 9 }));
    [
      "• La barrera no debe estar en contacto con ninguna pieza de la máquina.",
      "• En la barrera debe haber el número mínimo posible de orificios.",
      "• Los paneles deben ir forrados por dentro de material que absorba el sonido.",
      "• Se deben utilizar materiales que absorban el sonido en paredes, suelos y techos.",
    ].forEach(t => children.push(textParagraph(t, { size: 9 })));
    children.push(emptyPara(50, 50));
    children.push(textParagraph("En el propio trabajador:", { bold: true, size: 9 }));
    children.push(textParagraph("• A los trabajadores expuestos a niveles ≥ 85 dB(A), es obligatorio el uso de protección auditiva, recomendándose su uso a partir de los 80 dB(A).", { size: 9 }));
    children.push(textParagraph("• Los trabajadores deberán ser formados y capacitados para proteger su capacidad auditiva.", { size: 9 }));
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CONCLUSIONES GENERALES
  // ══════════════════════════════════════════════════════════════════════════
  if (establishment.conclusions || establishment.recommendations) {
    children.push(titleParagraph("CONCLUSIONES Y RECOMENDACIONES GENERALES", { pageBreak: true, size: 12 }));
    if (establishment.conclusions) {
      children.push(textParagraph("Conclusiones:", { bold: true, size: 10 }));
      children.push(textParagraph(establishment.conclusions, { size: 9 }));
    }
    if (establishment.recommendations) {
      children.push(emptyPara(100, 50));
      children.push(textParagraph("Recomendaciones:", { bold: true, size: 10 }));
      children.push(textParagraph(establishment.recommendations, { size: 9 }));
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ARMAR DOCUMENTO
  // ══════════════════════════════════════════════════════════════════════════
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 1000, right: 900, bottom: 1000, left: 900 },
          size: { orientation: "landscape" as any },
        },
      },
      headers: { default: getHeader() },
      footers: { default: getFooter() },
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const fileName = `Protocolos_${(establishment.razonSocial || establishment.name || "EEA").replace(/\s+/g, "_")}.docx`;
  saveAs(blob, fileName);
};

// @ts-ignore
import { saveAs } from "file-saver";
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType, Header, Footer, PageNumber,
  VerticalAlign, ShadingType, PageBreak, PageOrientation
} from "docx";
import { Establishment, Sector, MeasurementType } from "@/lib/types";
import { NoiseProtocol, ThermalProtocol, ColdProtocol } from "@/lib/store";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// ── Color palette ──────────────────────────────────────────────────────────────
const NAVY      = "0D2F5E";
const NAVY_MED  = "1A4480";
const GREEN_EEA = "2E7D32";
const HDR_BLUE  = "D6E4F0";
const HDR_GREEN = "D4EDDA";
const HDR_GOLD  = "FFF3CD";
const LIGHT_GRAY= "F5F5F5";
const WHITE     = "FFFFFF";
const RED_FAIL  = "C0392B";
const GREEN_OK  = "27AE60";

// ── Border helpers ─────────────────────────────────────────────────────────────
const BD  = (c="000000", sz=4): any => ({ style: BorderStyle.SINGLE, size: sz, color: c });
const BORDERS = (c="999999"): any => ({ top: BD(c), bottom: BD(c), left: BD(c), right: BD(c) });
const BORDERS_BOLD = (): any => ({ top: BD(NAVY,8), bottom: BD(NAVY,8), left: BD(NAVY,6), right: BD(NAVY,6) });
const NO_BORDER: any = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const NO_BORDERS = (): any => ({ top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER });

// ── Page constants (A4, margins in DXA) ───────────────────────────────────────
const A4_W  = 11906;
const A4_H  = 16838;
const MARG  = 720;  // 0.5 inch
const CONT_W = A4_W - MARG * 2;   // 10466 DXA

// ── Typography helpers ─────────────────────────────────────────────────────────
const run = (text: string, opts: any = {}): TextRun =>
  new TextRun({ text, font: "Arial", size: (opts.size || 9) * 2, bold: !!opts.bold, italics: !!opts.italic, color: opts.color || "000000", ...opts });

const para = (children: TextRun[], opts: any = {}): Paragraph =>
  new Paragraph({
    children,
    alignment: opts.align || AlignmentType.LEFT,
    spacing: { before: opts.before ?? 40, after: opts.after ?? 40 },
    ...(opts.pageBreak ? { pageBreakBefore: true } : {}),
    ...(opts.border ? { border: opts.border } : {}),
  });

const title = (text: string, size = 13, opts: any = {}): Paragraph =>
  para([run(text, { size, bold: true, color: NAVY })], { align: AlignmentType.CENTER, before: 120, after: 120, ...opts });

const subtitle = (text: string, size = 10): Paragraph =>
  para([run(text, { size, bold: true, color: NAVY_MED })], { align: AlignmentType.CENTER, before: 80, after: 80 });

const bodyText = (text: string, opts: any = {}): Paragraph =>
  para([run(text, { size: opts.size || 9, bold: opts.bold, color: opts.color })], {
    align: opts.align || AlignmentType.JUSTIFIED, before: opts.before ?? 50, after: opts.after ?? 50,
  });

const spacer = (h = 80): Paragraph => new Paragraph({ text: "", spacing: { before: h, after: h } });

// ── Cell builders ──────────────────────────────────────────────────────────────
const cellOpts = (text: string, opts: any = {}): TableCell => new TableCell({
  children: [new Paragraph({
    children: [run(text, { size: opts.size || 9, bold: opts.bold, color: opts.color })],
    alignment: opts.align || AlignmentType.CENTER,
    spacing: { before: 30, after: 30 },
  })],
  borders: opts.borders || BORDERS(),
  shading: opts.fill ? { type: ShadingType.CLEAR, color: opts.fill, fill: opts.fill } : undefined,
  columnSpan: opts.span,
  width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
  verticalAlign: VerticalAlign.CENTER,
  margins: { top: 50, bottom: 50, left: 80, right: 80 },
});

const hdrCell = (text: string, opts: any = {}): TableCell =>
  cellOpts(text, { bold: true, fill: opts.fill || HDR_BLUE, color: NAVY, ...opts });

const dataCell = (text: string, opts: any = {}): TableCell =>
  cellOpts(text, { align: AlignmentType.CENTER, size: 8.5, ...opts });

const labelCell = (text: string, w?: number): TableCell =>
  cellOpts(text, { bold: true, size: 9, align: AlignmentType.LEFT, fill: HDR_BLUE, color: NAVY, width: w });

const valueCell = (text: string, w?: number): TableCell =>
  cellOpts(text, { size: 9, align: AlignmentType.LEFT, width: w });

// ── Compliance cell (coloured) ─────────────────────────────────────────────────
const cumpleCell = (val: string): TableCell => {
  const v = val?.toUpperCase();
  const ok  = v === "SI" || v === "SÍ" || v === "CUMPLE";
  const bad = v === "NO" || v === "NO CUMPLE";
  return cellOpts(val || "-", {
    bold: true, size: 8.5,
    fill: ok ? "D4EDDA" : bad ? "FADBD8" : WHITE,
    color: ok ? GREEN_OK : bad ? RED_FAIL : "000000",
  });
};

// ── Section header bar ─────────────────────────────────────────────────────────
const sectionBar = (text: string, fill = NAVY): Table => new Table({
  width: { size: CONT_W, type: WidthType.DXA },
  columnWidths: [CONT_W],
  rows: [new TableRow({ children: [new TableCell({
    children: [new Paragraph({ children: [run(text, { size: 10, bold: true, color: WHITE })], alignment: AlignmentType.CENTER, spacing: { before: 60, after: 60 } })],
    borders: NO_BORDERS(), shading: { type: ShadingType.CLEAR, color: fill, fill },
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
  })] })],
});

// ── Page-level header row (Razón Social / CUIT / Dirección / ...) ──────────────
const establishmentPageHeader = (title_str: string, est: Establishment): Table => {
  const rs = est.razonSocial || est.name || "-";
  const cuit = est.cuit || "-";
  const addr = est.address || "-";
  const city = est.city || "-";
  const cp = est.postalCode || "-";
  const prov = est.province || "-";
  return new Table({
    width: { size: CONT_W, type: WidthType.DXA },
    columnWidths: [CONT_W],
    rows: [
      new TableRow({ children: [new TableCell({
        children: [new Paragraph({ children: [run(title_str, { size: 11, bold: true, color: WHITE })], alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 } })],
        borders: NO_BORDERS(), shading: { type: ShadingType.CLEAR, color: NAVY, fill: NAVY },
        columnSpan: 1, margins: { top: 80, bottom: 80, left: 120, right: 120 },
      })] }),
      new TableRow({ children: [new TableCell({
        children: [
          new Paragraph({ children: [run(`Razón social: ${rs}`, { size: 9 }), new TextRun({ text: `    C.U.I.T.: ${cuit}`, font: "Arial", size: 18 })], spacing: { before: 40, after: 20 } }),
          new Paragraph({ children: [run(`Dirección: ${addr}    Localidad: ${city}    C.P.: ${cp}    Provincia: ${prov}`, { size: 9 })], spacing: { before: 20, after: 40 } }),
        ],
        borders: BORDERS(NAVY_MED),
        shading: { type: ShadingType.CLEAR, color: "EBF5FB", fill: "EBF5FB" },
        margins: { top: 60, bottom: 60, left: 120, right: 120 },
      })] }),
    ],
  });
};

// ── Date helper ────────────────────────────────────────────────────────────────
const safeDate = (d?: string): string => {
  if (!d) return "-";
  try {
    const dt = new Date(d);
    if (!isNaN(dt.getTime())) return format(dt, "dd/MM/yyyy", { locale: es });
    return d;
  } catch { return d; }
};

// ══════════════════════════════════════════════════════════════════════════════
// SECTION GENERATORS
// ══════════════════════════════════════════════════════════════════════════════

// ── THERMAL LOAD (Carga Térmica) — Resol. SRT 30/2023 ─────────────────────────
function buildThermalSection(est: Establishment, protocol: ThermalProtocol): (Paragraph | Table)[] {
  const items: (Paragraph | Table)[] = [];
  const tc = protocol.company;
  const rows = protocol.rows.filter(r => r.sector || r.puestoTrabajo || r.tbs);
  if (rows.length === 0) return items;

  // Cover sub-title
  items.push(title("ESTUDIO DE CARGA TÉRMICA SEGÚN RESOL. SRT Nº 30/2023", 14, { pageBreak: true, before: 200 }));
  items.push(spacer(60));

  // ── Datos del establecimiento ──
  items.push(establishmentPageHeader("PROTOCOLO DE MEDICIÓN DE ESTRÉS POR CALOR EN EL AMBIENTE LABORAL", est));
  items.push(spacer());

  items.push(sectionBar("Datos del establecimiento"));
  items.push(new Table({
    width: { size: CONT_W, type: WidthType.DXA },
    columnWidths: [2800, 7666],
    rows: [
      new TableRow({ children: [labelCell("Razón Social:", 2800), valueCell(est.razonSocial || est.name || "-", 7666)] }),
      new TableRow({ children: [labelCell("Dirección:", 2800), valueCell(est.address || "-", 7666)] }),
      new TableRow({ children: [labelCell("Localidad:", 2800), valueCell(est.city || "-", 7666)] }),
      new TableRow({ children: [labelCell("Provincia:", 2800), valueCell(est.province || "-", 7666)] }),
      new TableRow({ children: [labelCell("C.P.:", 2800), valueCell(est.postalCode || "-", 7666)] }),
      new TableRow({ children: [labelCell("C.U.I.T.:", 2800), valueCell(est.cuit || "-", 7666)] }),
    ],
  }));
  items.push(spacer());

  // ── Datos para la medición ──
  items.push(sectionBar("Datos para la medición", NAVY_MED));
  items.push(new Table({
    width: { size: CONT_W, type: WidthType.DXA },
    columnWidths: [2800, 7666],
    rows: [
      new TableRow({ children: [
        cellOpts("Instrumento 1:", { bold: true, align: AlignmentType.LEFT, fill: HDR_BLUE, color: NAVY, width: 2800 }),
        cellOpts(`${tc.instrumento1 || "-"} | N° Serie: ${tc.instrumento1Serie || "-"} | Cert.: ${tc.instrumento1Cert || "-"} | Cal.: ${tc.instrumento1FechaCal || "-"}`, { align: AlignmentType.LEFT, size: 9, width: 7666 }),
      ] }),
      new TableRow({ children: [
        cellOpts("Instrumento 2:", { bold: true, align: AlignmentType.LEFT, fill: HDR_BLUE, color: NAVY, width: 2800 }),
        cellOpts(`${tc.instrumento2 || "-"} | N° Serie: ${tc.instrumento2Serie || "-"} | Cert.: ${tc.instrumento2Cert || "-"} | Cal.: ${tc.instrumento2FechaCal || "-"}`, { align: AlignmentType.LEFT, size: 9, width: 7666 }),
      ] }),
      new TableRow({ children: [labelCell("Fecha de medición:", 2800), valueCell(`${tc.fechaMedicion || safeDate(est.date)}`, 7666)] }),
      new TableRow({ children: [labelCell("Horario:", 2800), valueCell(`Inicio: ${tc.horaInicio || "-"} Hs   Finalización: ${tc.horaFin || "-"} Hs`, 7666)] }),
      new TableRow({ children: [labelCell("Turnos habituales:", 2800), valueCell(tc.turnos || "-", 7666)] }),
      ...(tc.condicionesAtm ? [new TableRow({ children: [labelCell("Condiciones atmosféricas:", 2800), valueCell(tc.condicionesAtm, 7666)] })] : []),
      ...(tc.tempExterior ? [new TableRow({ children: [labelCell("Temperatura exterior:", 2800), valueCell(`${tc.tempExterior} °C`, 7666)] })] : []),
    ],
  }));
  items.push(spacer());

  // ── Main measurement table ──
  items.push(sectionBar("Datos de la Medición"));
  const COL_WIDTHS = [400, 1200, 1400, 600, 600, 600, 600, 700, 800, 700, 700, 700, 700, 700, 700];
  items.push(new Table({
    width: { size: CONT_W, type: WidthType.DXA },
    columnWidths: COL_WIDTHS,
    rows: [
      // Header row 1
      new TableRow({ tableHeader: true, children: [
        hdrCell("Pto", { size: 7, width: 400 }),
        hdrCell("Sector", { size: 7, width: 1200 }),
        hdrCell("Puesto / Puesto tipo", { size: 7, width: 1400 }),
        hdrCell("Exp. (h)", { size: 7, width: 600 }),
        hdrCell("TBS (°C)", { size: 7, width: 600 }),
        hdrCell("TBH (°C)", { size: 7, width: 600 }),
        hdrCell("TG (°C)", { size: 7, width: 600 }),
        hdrCell("TGBH (°C)", { size: 7, width: 700 }),
        hdrCell("TGBH Ponderado", { size: 7, width: 800 }),
        hdrCell("Aclimatado", { size: 7, width: 700 }),
        hdrCell("TM (W)", { size: 7, width: 700 }),
        hdrCell("VLA", { size: 7, width: 700 }),
        hdrCell("VLP", { size: 7, width: 700 }),
        hdrCell("¿< VLA?", { size: 7, width: 700 }),
        hdrCell("¿< VLP?", { size: 7, width: 700 }),
      ] }),
      ...rows.map((r, i) => new TableRow({ children: [
        dataCell(String(i + 1).padStart(2, "0")),
        cellOpts(r.sector || "-", { size: 8.5, align: AlignmentType.LEFT }),
        cellOpts(r.puestoTrabajo || "-", { size: 8.5, align: AlignmentType.LEFT }),
        dataCell(r.exposicionHs || "-"),
        dataCell(r.tbs || "-"),
        dataCell(r.tbh || "-"),
        dataCell(r.tg || "-"),
        dataCell(r.tgbh || "-"),
        dataCell(r.tgbhPonderado || "-", { bold: true }),
        dataCell(r.aclimatado || "SI"),
        dataCell(r.cargaMetabolica || "-"),
        dataCell(r.vla || "-"),
        dataCell(r.vlp || "-"),
        cumpleCell(r.cumpleVla || "-"),
        cumpleCell(r.cumpleVlp || "-"),
      ] })),
    ],
  }));
  items.push(spacer());

  // ── Per-sector metabolic rate tables ──
  rows.forEach((r) => {
    if (!r.sector) return;
    items.push(spacer(60));
    items.push(para([run(r.sector.toUpperCase(), { size: 11, bold: true, color: NAVY })], { align: AlignmentType.CENTER, before: 100, after: 60 }));

    const TM = Number(r.cargaMetabolica) || (Number(r.tmSentado || 126) + Number(r.tmSuplemento || 27));
    const comment = `Determinación de carga térmica en el sector ${r.sector.toLowerCase()}.` +
      ` El VLA y VLP de temperatura globo bulbo húmedo (TGBH) es ${r.vla || "-"} y ${r.vlp || "-"} °C respectivamente,` +
      ` para una TASA METABOLICA PONDERADA de ${TM}W bajo un régimen de ${r.exposicionHs || "-"}h de trabajo,` +
      ` según Anexo de la Resol. SRT 30/2023.`;

    // Metabolic rate summary table
    items.push(new Table({
      width: { size: CONT_W, type: WidthType.DXA },
      columnWidths: [1400, 2000, 1800, 1800, 1800, 1666],
      rows: [
        new TableRow({ children: [
          hdrCell("DATOS DE MEDICIÓN DE CARGA TÉRMICA", { span: 6, fill: NAVY, color: WHITE, size: 10 }),
        ] }),
        new TableRow({ children: [
          cellOpts(est.razonSocial || est.name || "-", { size: 8.5, align: AlignmentType.LEFT }),
          cellOpts(`Puesto: ${r.puestoTrabajo || r.sector || "-"}`, { bold: true, size: 8.5, align: AlignmentType.LEFT }),
          cellOpts(`Fecha: ${r.exposicionHs ? tc.fechaMedicion || safeDate(est.date) : "-"}`, { size: 8.5 }),
          cellOpts(`Temp. Ext.: ${tc.tempExterior || "-"} °C`, { size: 8.5 }),
          cellOpts(`Aclimatado: ${r.aclimatado || "SI"}`, { size: 8.5 }),
          dataCell(""),
        ] }),
        new TableRow({ children: [
          hdrCell("Magnitudes", { size: 7.5 }),
          hdrCell("TGBH (sin ponderar)", { size: 7.5 }),
          hdrCell("Suplemento TM [W]", { size: 7.5 }),
          hdrCell("TM Sentado [W]", { size: 7.5 }),
          hdrCell("TM Total [W]", { size: 7.5 }),
          hdrCell("Comentario", { size: 7.5 }),
        ] }),
        new TableRow({ children: [
          cellOpts("Resultados", { bold: true, size: 8.5 }),
          dataCell(r.tgbh || "-", { bold: true }),
          dataCell(r.tmSuplemento || "27"),
          dataCell(r.tmSentado || "126"),
          dataCell(String(TM), { bold: true }),
          cellOpts(comment, { size: 7.5, align: AlignmentType.JUSTIFIED }),
        ] }),
      ],
    }));

    // Metabolic rate classification table
    items.push(spacer(40));
    items.push(bodyText("La tasa metabólica TM se ha calculado mediante la clasificación expuesta en el punto 4.2.1.1 (Método a) de la Resol. SRT 30/2023 — Evaluación por requisitos de tareas/posturas/biomecánicos.", { size: 8.5 }));
    items.push(new Table({
      width: { size: CONT_W, type: WidthType.DXA },
      columnWidths: [2200, 800, 1400, 1000, 1000, 1000, 3066],
      rows: [
        new TableRow({ children: [
          hdrCell("Tasa Metabólica W — posición del cuerpo, carga de trabajo", { span: 6, size: 8 }),
          hdrCell("Factores de Exposición", { size: 8 }),
        ] }),
        new TableRow({ children: [
          hdrCell("Suplemento por postura (PC)", { size: 7.5 }),
          hdrCell("[W]", { size: 7.5 }),
          hdrCell("Parte del Cuerpo", { size: 7.5 }),
          hdrCell("Ligera", { size: 7.5 }),
          hdrCell("Media", { size: 7.5 }),
          hdrCell("Pesada", { size: 7.5 }),
          hdrCell("Factores relevantes", { size: 7.5 }),
        ] }),
        new TableRow({ children: [
          cellOpts("Sentado", { size: 8.5, align: AlignmentType.LEFT }), dataCell("0"),
          cellOpts("Ambas manos", { size: 8.5 }), dataCell("126"), dataCell("153"), dataCell("171"),
          cellOpts("Gasto energético del trabajo", { size: 8, align: AlignmentType.LEFT }),
        ] }),
        new TableRow({ children: [
          cellOpts("De rodillas", { size: 8.5, align: AlignmentType.LEFT }), dataCell("18"),
          cellOpts("Un brazo", { size: 8.5 }), dataCell("162"), dataCell("146"), dataCell("234"),
          cellOpts("Temperatura de aire", { size: 8, align: AlignmentType.LEFT }),
        ] }),
        new TableRow({ children: [
          cellOpts("En cuclillas", { size: 8.5, align: AlignmentType.LEFT }), dataCell("18"),
          cellOpts("Ambos brazos", { size: 8.5 }), dataCell("216"), dataCell("252"), dataCell("288"),
          cellOpts("Humedad del aire", { size: 8, align: AlignmentType.LEFT }),
        ] }),
        new TableRow({ children: [
          cellOpts("De pie", { size: 8.5, align: AlignmentType.LEFT }), dataCell("27"),
          cellOpts("Cuerpo entero", { size: 8.5 }), dataCell("324"), dataCell("441"), dataCell("603"),
          cellOpts("Movimiento del aire", { size: 8, align: AlignmentType.LEFT }),
        ] }),
        new TableRow({ children: [
          cellOpts("De pie e inclinado", { size: 8.5, align: AlignmentType.LEFT }), dataCell("36"),
          dataCell(""), dataCell(""), dataCell(""), dataCell(""),
          cellOpts(r.factoresExposicion?.join(" / ") || "—", { size: 8, align: AlignmentType.LEFT }),
        ] }),
      ],
    }));
    items.push(spacer(80));
  });

  // ── Obs / Conclusiones / Recomendaciones ──
  if (protocol.observaciones) {
    items.push(sectionBar("Información adicional", GREEN_EEA));
    items.push(bodyText(protocol.observaciones));
    items.push(spacer());
  }
  if (protocol.conclusiones) {
    items.push(sectionBar("Conclusiones", NAVY_MED));
    items.push(bodyText(protocol.conclusiones));
    items.push(spacer());
  }
  if (protocol.recomendaciones) {
    items.push(sectionBar("Recomendaciones", NAVY_MED));
    items.push(bodyText(protocol.recomendaciones));
    items.push(spacer());
  }

  return items;
}

// ── COLD STRESS (Estrés por Frío) — Resol. MTEySS 295/2003 ───────────────────
function buildColdSection(est: Establishment, protocol: ColdProtocol): (Paragraph | Table)[] {
  const items: (Paragraph | Table)[] = [];
  const cc = protocol.company;
  const rows = protocol.rows.filter(r => r.sector || r.tbs);
  if (rows.length === 0) return items;

  items.push(title("ESTUDIO DE ESTRÉS POR FRÍO SEGÚN RESOL. MTEySS Nº 295/2003", 14, { pageBreak: true, before: 200 }));
  items.push(spacer(60));
  items.push(establishmentPageHeader("PROTOCOLO DE MEDICIÓN DE ESTRÉS POR FRÍO EN EL AMBIENTE LABORAL", est));
  items.push(spacer());
  items.push(sectionBar("Datos del establecimiento"));
  items.push(new Table({
    width: { size: CONT_W, type: WidthType.DXA },
    columnWidths: [2800, 7666],
    rows: [
      new TableRow({ children: [labelCell("Razón Social:"), valueCell(est.razonSocial || est.name || "-")] }),
      new TableRow({ children: [labelCell("Dirección:"), valueCell(est.address || "-")] }),
      new TableRow({ children: [labelCell("Localidad:"), valueCell(est.city || "-")] }),
      new TableRow({ children: [labelCell("Provincia:"), valueCell(est.province || "-")] }),
      new TableRow({ children: [labelCell("C.P.:"), valueCell(est.postalCode || "-")] }),
      new TableRow({ children: [labelCell("C.U.I.T.:"), valueCell(est.cuit || "-")] }),
    ],
  }));
  items.push(spacer());
  items.push(sectionBar("Datos para la medición", NAVY_MED));
  items.push(new Table({
    width: { size: CONT_W, type: WidthType.DXA },
    columnWidths: [2800, 7666],
    rows: [
      new TableRow({ children: [labelCell("Instrumento:"), valueCell(`${cc.instrumento1 || "-"} | N° Serie: ${cc.instrumento1Serie || "-"} | Cert.: ${cc.instrumento1Cert || "-"} | Cal.: ${cc.instrumento1FechaCal || "-"}`)] }),
      new TableRow({ children: [labelCell("Fecha de medición:"), valueCell(cc.fechaMedicion || safeDate(est.date))] }),
      new TableRow({ children: [labelCell("Horario:"), valueCell(`Inicio: ${cc.horaInicio || "-"} Hs   Finalización: ${cc.horaFin || "-"} Hs`)] }),
      new TableRow({ children: [labelCell("Turnos habituales:"), valueCell(cc.turnos || "-")] }),
      ...(cc.condicionesAtm ? [new TableRow({ children: [labelCell("Condiciones atmosféricas:"), valueCell(cc.condicionesAtm)] })] : []),
    ],
  }));
  items.push(spacer());

  // ── Main data table ──
  items.push(sectionBar("Datos de la Medición"));
  const CW = [400, 1200, 1400, 800, 700, 800, 800, 800, 900, 600, 600, 600, 900, 900, 700];
  items.push(new Table({
    width: { size: CONT_W, type: WidthType.DXA },
    columnWidths: CW,
    rows: [
      new TableRow({ tableHeader: true, children: [
        hdrCell("Pto", { size: 7 }), hdrCell("Sector", { size: 7 }),
        hdrCell("Puesto de Trabajo", { size: 7 }), hdrCell("Rango Temp. (°C)", { size: 7 }),
        hdrCell("Ciclos Exp.", { size: 7 }), hdrCell("Dur. Ciclo (min)", { size: 7 }),
        hdrCell("T. Neto Exp. (min)", { size: 7 }), hdrCell("T. Integr. (min)", { size: 7 }),
        hdrCell("Caract. Exposición", { size: 7 }), hdrCell("TBS (°C)", { size: 7 }),
        hdrCell("Vel. (m/s)", { size: 7 }), hdrCell("TEE (°C)", { size: 7 }),
        hdrCell("Tipo Uniforme", { size: 7 }), hdrCell("Equipo", { size: 7 }),
        hdrCell(">4h", { size: 7 }),
      ] }),
      ...rows.map((r, i) => new TableRow({ children: [
        dataCell(String(i + 1).padStart(2, "0")),
        cellOpts(r.sector || "-", { size: 8, align: AlignmentType.LEFT }),
        cellOpts(r.puestoTrabajo || "-", { size: 8, align: AlignmentType.LEFT }),
        dataCell(r.rangoTemp || "-"),
        dataCell(r.ciclosExposicion || "-"),
        dataCell(r.duracionCiclo || "-"),
        dataCell(r.tiempoNetoExposicion || "-"),
        dataCell(r.tiempoIntegracion || "-"),
        cellOpts(r.caracteristicasExposicion || "-", { size: 7.5, align: AlignmentType.LEFT }),
        dataCell(r.tbs || "-"),
        dataCell(r.velocidadViento || "-"),
        dataCell(r.tee || "-", { bold: true }),
        cellOpts(r.tipoUniforme || "-", { size: 7.5 }),
        cellOpts(r.equipo || "-", { size: 7.5 }),
        cumpleCell(r.exposicionMas4h || "NO"),
      ] })),
    ],
  }));
  items.push(spacer());

  if (protocol.observaciones) {
    items.push(sectionBar("Observaciones", GREEN_EEA));
    items.push(bodyText(protocol.observaciones));
    items.push(spacer());
  }
  if (protocol.conclusiones) {
    items.push(sectionBar("Conclusiones", NAVY_MED));
    items.push(bodyText(protocol.conclusiones));
    items.push(spacer());
  }
  if (protocol.recomendaciones) {
    items.push(sectionBar("Recomendaciones para Prevenir el Estrés por Frío", NAVY_MED));
    items.push(bodyText(protocol.recomendaciones));
    items.push(spacer());
  }

  return items;
}

// ── NOISE (Ruido) — Resol. SRT 85/2012 ───────────────────────────────────────
function buildNoiseSection(est: Establishment, protocol: NoiseProtocol): (Paragraph | Table)[] {
  const items: (Paragraph | Table)[] = [];
  const nc = protocol.company;
  const rows = protocol.rows.filter(r => r.sector || r.valorMedido);
  if (rows.length === 0) return items;

  items.push(title("ESTUDIO DE RUIDO LABORAL SEGÚN RESOL. SRT Nº 85/2012", 14, { pageBreak: true, before: 200 }));
  items.push(spacer(60));
  items.push(establishmentPageHeader("PROTOCOLO DE MEDICIÓN DE RUIDO EN EL AMBIENTE LABORAL", est));
  items.push(spacer());
  items.push(sectionBar("Datos del establecimiento"));
  items.push(new Table({
    width: { size: CONT_W, type: WidthType.DXA },
    columnWidths: [2800, 7666],
    rows: [
      new TableRow({ children: [labelCell("Razón Social:"), valueCell(est.razonSocial || est.name || "-")] }),
      new TableRow({ children: [labelCell("Dirección:"), valueCell(est.address || "-")] }),
      new TableRow({ children: [labelCell("Localidad:"), valueCell(est.city || "-")] }),
      new TableRow({ children: [labelCell("Provincia:"), valueCell(est.province || "-")] }),
      new TableRow({ children: [labelCell("C.U.I.T.:"), valueCell(est.cuit || "-")] }),
    ],
  }));
  items.push(spacer());
  items.push(sectionBar("Datos para la medición", NAVY_MED));
  items.push(new Table({
    width: { size: CONT_W, type: WidthType.DXA },
    columnWidths: [2800, 7666],
    rows: [
      new TableRow({ children: [labelCell("Instrumento 1:"), valueCell(`${nc.instrumento1 || "-"} | N° Serie: ${nc.instrumento1Serie || "-"} | Cert.: ${nc.instrumento1Cert || "-"} | Cal.: ${nc.instrumento1FechaCal || "-"}`)] }),
      new TableRow({ children: [labelCell("Instrumento 2:"), valueCell(`${nc.instrumento2 || "-"} | N° Serie: ${nc.instrumento2Serie || "-"} | Cert.: ${nc.instrumento2Cert || "-"} | Cal.: ${nc.instrumento2FechaCal || "-"}`)] }),
      new TableRow({ children: [labelCell("Fecha de medición:"), valueCell(nc.fechaMedicion || safeDate(est.date))] }),
      new TableRow({ children: [labelCell("Horario:"), valueCell(`Inicio: ${nc.horaInicio || "-"} Hs   Finalización: ${nc.horaFin || "-"} Hs`)] }),
      new TableRow({ children: [labelCell("Jornada laboral:"), valueCell(nc.jornadaLaboral || "-")] }),
      new TableRow({ children: [labelCell("Turnos habituales:"), valueCell(nc.turnos || "-")] }),
      ...(nc.condicionesNormales ? [new TableRow({ children: [labelCell("Condiciones normales de trabajo:"), valueCell(nc.condicionesNormales)] })] : []),
      ...(nc.condicionesMedicion ? [new TableRow({ children: [labelCell("Condiciones al momento de la medición:"), valueCell(nc.condicionesMedicion)] })] : []),
    ],
  }));
  items.push(spacer());

  // ── Main data table ──
  items.push(sectionBar("Datos de la Medición"));
  const NW = [400, 1200, 1500, 700, 700, 900, 900, 700, 800, 800, 700, 1166];
  items.push(new Table({
    width: { size: CONT_W, type: WidthType.DXA },
    columnWidths: NW,
    rows: [
      new TableRow({ tableHeader: true, children: [
        hdrCell("Pto", { size: 7 }), hdrCell("Sector / Área", { size: 7 }),
        hdrCell("Puesto de Trabajo", { size: 7 }), hdrCell("T. Exp. (h)", { size: 7 }),
        hdrCell("T. Integr. (min)", { size: 7 }), hdrCell("Tipo Ruido", { size: 7 }),
        hdrCell("Valor Medido", { size: 7 }), hdrCell("Unidad", { size: 7 }),
        hdrCell("Dosis Ruido", { size: 7 }), hdrCell("Límite", { size: 7 }),
        hdrCell("Cumple", { size: 7 }), hdrCell("Observaciones", { size: 7 }),
      ] }),
      ...rows.map((r, i) => new TableRow({ children: [
        dataCell(String(i + 1).padStart(2, "0")),
        cellOpts(r.sector || "-", { size: 8, align: AlignmentType.LEFT }),
        cellOpts(r.puestoTrabajo || "-", { size: 8, align: AlignmentType.LEFT }),
        dataCell(r.tiempoExposicion || "-"),
        dataCell(r.tiempoIntegracion || "-"),
        dataCell(r.tipoRuido || "-"),
        dataCell(r.valorMedido || "-", { bold: true }),
        dataCell(r.unidad || "dBA"),
        dataCell(r.dosisRuido || "-"),
        dataCell(r.limitePermisible || "85"),
        cumpleCell(r.cumple || "-"),
        cellOpts(r.observaciones || "", { size: 7.5, align: AlignmentType.LEFT }),
      ] })),
    ],
  }));
  items.push(spacer());

  if (protocol.observaciones) {
    items.push(sectionBar("Observaciones", GREEN_EEA));
    items.push(bodyText(protocol.observaciones));
    items.push(spacer());
  }
  if (protocol.conclusiones) {
    items.push(sectionBar("Conclusiones", NAVY_MED));
    items.push(bodyText(protocol.conclusiones));
    items.push(spacer());
  }
  if (protocol.recomendaciones) {
    items.push(sectionBar("Recomendaciones", NAVY_MED));
    items.push(bodyText(protocol.recomendaciones));
    items.push(spacer());
  }

  return items;
}

// ── LIGHTING (Iluminación) — Resol. SRT 84/2012 ───────────────────────────────
function buildLightingSection(est: Establishment, sectors: Sector[]): (Paragraph | Table)[] {
  const items: (Paragraph | Table)[] = [];
  const lightSectors = sectors.filter(s => s.measurements.some(m => m.type === "lighting"));
  if (lightSectors.length === 0) return items;

  items.push(title("ESTUDIO DE ILUMINACIÓN SEGÚN RESOL. SRT Nº 84/2012", 14, { pageBreak: true, before: 200 }));
  items.push(spacer(60));
  items.push(establishmentPageHeader("PROTOCOLO PARA MEDICIÓN DE ILUMINACIÓN EN EL AMBIENTE LABORAL", est));
  items.push(spacer());

  // All points flat table
  items.push(sectionBar("Datos de la Medición"));
  const LW = [400, 900, 1500, 900, 900, 900, 900, 700, 700, 700, 800, 700, 1066];
  items.push(new Table({
    width: { size: CONT_W, type: WidthType.DXA },
    columnWidths: LW,
    rows: [
      new TableRow({ tableHeader: true, children: [
        hdrCell("Pto", { size: 7 }), hdrCell("Hora", { size: 7 }),
        hdrCell("Sector", { size: 7 }), hdrCell("Sección / Puesto", { size: 7 }),
        hdrCell("Tipo Ilumin.", { size: 7 }), hdrCell("Fuente", { size: 7 }),
        hdrCell("Tipo Sist.", { size: 7 }), hdrCell("E min.", { size: 7 }),
        hdrCell("≥ E med/2", { size: 7 }), hdrCell("E max.", { size: 7 }),
        hdrCell("E media (lux)", { size: 7 }), hdrCell("VLA (lux)", { size: 7 }),
        hdrCell("Cumple", { size: 7 }),
      ] }),
      ...lightSectors.flatMap((s, si) => s.measurements
        .filter(m => m.type === "lighting")
        .map((m) => {
          const vals = m.points.map(p => Number(p.values?.lux) || 0).filter(v => v > 0);
          const avg  = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
          const emin = Math.min(...(vals.length ? vals : [0]));
          const emax = Math.max(...(vals.length ? vals : [0]));
          const limit = m.config?.limit || 300;
          const unif  = emin >= avg / 2;
          const ok    = avg >= limit && unif;
          return new TableRow({ children: [
            dataCell(String(si + 1).padStart(2, "0")),
            dataCell("-"),
            cellOpts(s.name || "-", { size: 8, align: AlignmentType.LEFT }),
            cellOpts(s.description || s.name || "-", { size: 8, align: AlignmentType.LEFT }),
            dataCell(m.config?.lightingType === "natural" ? "Natural" : m.config?.lightingType === "mixed" ? "Mixta" : "Artificial"),
            dataCell(m.config?.lightSource || "Mixta"),
            dataCell(m.config?.lightingSystemType === "localized" ? "Localizada" : m.config?.lightingSystemType === "mixed" ? "Mixta" : "General"),
            dataCell(String(emin)),
            dataCell(unif ? "≥" : "<"),
            dataCell(String(emax)),
            dataCell(String(avg), { bold: true }),
            dataCell(String(limit)),
            cumpleCell(ok ? "SI" : "NO"),
          ] });
        })
      ),
    ],
  }));
  items.push(spacer());

  // Measurement points detail per sector
  lightSectors.forEach((s, si) => {
    s.measurements.filter(m => m.type === "lighting").forEach((m) => {
      const vals = m.points.map(p => Number(p.values?.lux) || 0);
      const nonZero = vals.filter(v => v > 0);
      if (nonZero.length === 0) return;

      items.push(spacer(60));
      items.push(para([run(`SECTOR ${si + 1}: ${s.name.toUpperCase()}${s.description ? ` — ${s.description}` : ""}`, { bold: true, size: 10, color: NAVY })], { before: 80, after: 40 }));
      if (m.config) {
        const cfg = m.config;
        items.push(bodyText(`Dimensiones: ${cfg.width || "-"} m × ${cfg.length || "-"} m | Altura montaje: ${cfg.height || "-"} m | Valor legal: ${cfg.limit || "-"} lux`, { size: 8.5 }));
      }
      items.push(spacer(40));

      // Points grid — 9 per row max
      const chunkSize = 9;
      for (let i = 0; i < vals.length; i += chunkSize) {
        const chunk = vals.slice(i, i + chunkSize);
        const colW = Math.floor(CONT_W / Math.max(chunk.length, 1));
        items.push(new Table({
          width: { size: CONT_W, type: WidthType.DXA },
          columnWidths: Array(chunk.length).fill(colW),
          rows: [
            new TableRow({ children: chunk.map((_, j) => hdrCell(`P${i + j + 1}`, { size: 8 })) }),
            new TableRow({ children: chunk.map(v => dataCell(v > 0 ? String(v) : "-", { size: 9, bold: true })) }),
          ],
        }));
      }
    });
  });

  items.push(spacer());
  return items;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ══════════════════════════════════════════════════════════════════════════════
export const generateDocxReport = async (
  establishment: Establishment,
  sectors: Sector[],
  noiseProtocol?: NoiseProtocol,
  thermalProtocol?: ThermalProtocol,
  coldProtocol?: ColdProtocol,
  signature?: string | null,
  signatoryName?: string | null,
  signatoryTitle?: string | null,
  signatoryReg?: string | null,
) => {
  const children: (Paragraph | Table)[] = [];

  const getHeader = () => new Header({
    children: [new Paragraph({
      children: [
        run("ENVIRONMENTAL EXPRESS ARGENTINA", { size: 9, bold: true, color: NAVY }),
        run("   |   Servicios de Higiene y Seguridad en el Trabajo", { size: 8.5, color: "555555" }),
      ],
      alignment: AlignmentType.CENTER,
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: NAVY, space: 4 } },
      spacing: { before: 40, after: 60 },
    })],
  });

  const getFooter = () => new Footer({
    children: [new Paragraph({
      children: [
        run(`${establishment.razonSocial || establishment.name || ""} — `, { size: 8, color: "888888" }),
        run("Environmental Express Argentina   ", { size: 8, color: "888888" }),
        new TextRun({ children: ["Página ", PageNumber.CURRENT, " de ", PageNumber.TOTAL_PAGES], font: "Arial", size: 16 }),
      ],
      alignment: AlignmentType.CENTER,
      border: { top: { style: BorderStyle.SINGLE, size: 2, color: "CCCCCC", space: 4 } },
      spacing: { before: 40, after: 20 },
    })],
  });

  // ── Cover page ──
  children.push(spacer(800));
  children.push(title(establishment.razonSocial || establishment.name || "INFORME TÉCNICO", 18));
  if (establishment.address) children.push(subtitle(establishment.address, 12));
  const cityProv = [establishment.city, establishment.province].filter(Boolean).join(", ");
  if (cityProv) children.push(subtitle(cityProv, 11));
  children.push(spacer(200));
  if (establishment.date) children.push(subtitle(safeDate(establishment.date).toUpperCase(), 12));
  children.push(spacer(160));

  // Studies list on cover
  const studies: string[] = [];
  const allMeas = sectors.flatMap(s => s.measurements);
  if (allMeas.some(m => m.type === "lighting")) studies.push("ILUMINACIÓN — Resol. SRT N° 84/2012");
  if (noiseProtocol?.rows.some(r => r.sector || r.valorMedido)) studies.push("RUIDO LABORAL — Resol. SRT N° 85/2012");
  if (thermalProtocol?.rows.some(r => r.sector || r.tbs)) studies.push("CARGA TÉRMICA — Resol. SRT N° 30/2023");
  if (coldProtocol?.rows.some(r => r.sector || r.tbs)) studies.push("ESTRÉS POR FRÍO — Resol. MTEySS N° 295/2003");

  if (studies.length > 0) {
    children.push(para([run("ESTUDIOS REALIZADOS:", { bold: true, size: 11, color: NAVY })], { align: AlignmentType.CENTER, before: 80 }));
    studies.forEach(s => children.push(para([run(`• ${s}`, { size: 10, color: NAVY_MED })], { align: AlignmentType.CENTER, before: 20, after: 20 })));
  }
  children.push(spacer(400));

  // ── Protocol sections ──
  if (thermalProtocol) children.push(...buildThermalSection(establishment, thermalProtocol));
  if (coldProtocol) children.push(...buildColdSection(establishment, coldProtocol));
  if (noiseProtocol) children.push(...buildNoiseSection(establishment, noiseProtocol));
  children.push(...buildLightingSection(establishment, sectors));

  // ── Signature page ──
  children.push(spacer(200));
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(spacer(400));
  children.push(title("FIRMA Y CERTIFICACIÓN", 13, { before: 200, after: 200 }));
  if (signatoryName || signatoryTitle || signatoryReg) {
    children.push(bodyText(`Profesional: ${signatoryName || "-"}`, { bold: true, size: 10, align: AlignmentType.CENTER }));
    if (signatoryTitle) children.push(bodyText(signatoryTitle, { size: 9, align: AlignmentType.CENTER }));
    if (signatoryReg) children.push(bodyText(`Matrícula / Registro: ${signatoryReg}`, { size: 9, align: AlignmentType.CENTER }));
  }
  children.push(spacer(200));
  children.push(para([run("______________________________", { size: 14, color: NAVY })], { align: AlignmentType.CENTER }));
  children.push(bodyText("Firma del Responsable de Higiene y Seguridad", { align: AlignmentType.CENTER, size: 9 }));

  // ── Build document ──
  const doc = new Document({
    styles: {
      default: { document: { run: { font: "Arial", size: 18 } } },
    },
    sections: [{
      properties: {
        page: {
          size: { width: A4_W, height: A4_H },
          margin: { top: MARG, right: MARG, bottom: MARG, left: MARG },
        },
      },
      headers: { default: getHeader() },
      footers: { default: getFooter() },
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const name = `Informe_${(establishment.razonSocial || establishment.name || "EEA").replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split("T")[0]}.docx`;
  saveAs(blob, name);
};

import {
  Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType, Footer, PageNumber,
  VerticalAlign, ShadingType, PageBreak,
} from "docx";

export const NAVY     = "0D2F5E";
export const GREEN_OK = "27AE60";
export const RED_FAIL = "C0392B";
export const HDR_BLUE = "D6E4F0";
export const WHITE    = "FFFFFF";
export const A4_W     = 11906;
export const MARG     = 720;
export const CONT_W   = A4_W - MARG * 2;

export const BD = (c = "000000", sz = 6) => ({ style: BorderStyle.SINGLE, size: sz, color: c });
export const BORDERS = (c = "999999") => ({ top: BD(c,4), bottom: BD(c,4), left: BD(c,4), right: BD(c,4) });
export const NO_BORDER = { style: BorderStyle.NONE as any, size: 0, color: "FFFFFF" };

export const run = (text: any, opts: any = {}) => new TextRun({
  text: String(text ?? ""),
  font: "Arial",
  size: (opts.size || 9) * 2,
  bold: !!opts.bold,
  color: opts.color || "000000",
  italics: !!opts.italic,
});

export const cell = (text: any, opts: any = {}) => new TableCell({
  children: [new Paragraph({
    children: [run(text, { size: opts.size || 9, bold: opts.bold, color: opts.color })],
    alignment: opts.align || AlignmentType.LEFT,
    spacing: { before: 30, after: 30 },
  })],
  borders: opts.borders || BORDERS(),
  shading: opts.fill ? { type: ShadingType.CLEAR, color: opts.fill, fill: opts.fill } : undefined,
  columnSpan: opts.span,
  rowSpan: opts.rowSpan,
  width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
  verticalAlign: VerticalAlign.CENTER,
  margins: { top: 60, bottom: 60, left: 120, right: 120 },
});

export const hdr = (text: any, opts: any = {}) =>
  cell(text, { bold: true, fill: HDR_BLUE, color: NAVY, size: opts.size || 9, align: opts.align || AlignmentType.LEFT, ...opts });

export const cumpleCell = (val: any) => {
  const ok  = String(val).toUpperCase() === "SI";
  const bad = String(val).toUpperCase() === "NO";
  return cell(val || "-", {
    bold: true, align: AlignmentType.CENTER, size: 8.5,
    fill: ok ? "D4EDDA" : bad ? "FADBD8" : WHITE,
    color: ok ? GREEN_OK : bad ? RED_FAIL : "000000",
  });
};

export const pageBreakPara = () => new Paragraph({ children: [new PageBreak()] });

export const protocolHeader = (title: string, est: any) => new Table({
  width: { size: CONT_W, type: WidthType.DXA },
  columnWidths: [CONT_W],
  rows: [
    new TableRow({ children: [hdr(title, { align: AlignmentType.CENTER, size: 10 })] }),
    new TableRow({ children: [hdr("Datos del establecimiento")] }),
    new TableRow({ children: [cell(`Razón Social: ${est.razonSocial || est.name || "-"}`)] }),
    new TableRow({ children: [cell(`Dirección: ${est.address || "-"}`)] }),
    new TableRow({ children: [cell(`Localidad: ${est.city || est.localidad || "-"}    C.P.: ${est.postalCode || est.cp || "-"}    Provincia: ${est.province || est.provincia || "-"}`)] }),
    new TableRow({ children: [cell(`C.U.I.T.: ${est.cuit || "-"}`)] }),
  ],
});

export const makeFooter = (signatory: any) => new Footer({
  children: [
    new Table({
      width: { size: CONT_W, type: WidthType.DXA },
      columnWidths: [Math.floor(CONT_W * 0.65), Math.floor(CONT_W * 0.35)],
      rows: [new TableRow({ children: [
        cell(`${signatory?.title || "Lic. H&SL"} ${signatory?.name || ""}  Mat. Prof. ${signatory?.registration || ""}`, {
          borders: { top: BD(NAVY, 8), bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER },
          size: 8,
        }),
        cell("Firma, aclaración y registro del Profesional interviniente.", {
          bold: true, align: AlignmentType.RIGHT, size: 8,
          borders: { top: BD(NAVY, 8), bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER },
        }),
      ]})],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Página ", font: "Arial", size: 16 }),
        new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16 }),
        new TextRun({ text: " de ", font: "Arial", size: 16 }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], font: "Arial", size: 16 }),
      ],
      alignment: AlignmentType.RIGHT,
      spacing: { before: 40, after: 0 },
    }),
  ],
});

export const buildCover = (establishment: any, estudios: string[]): any[] => {
  const children: any[] = [
    new Paragraph({
      children: [run("ENVIRONMENTAL EXPRESS ARGENTINA", { size: 16, bold: true, color: NAVY })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 2400, after: 120 },
    }),
    new Paragraph({
      children: [run("Servicios de Higiene y Seguridad en el Trabajo", { size: 10, italic: true, color: "555555" })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 600 },
    }),
    new Paragraph({
      children: [run(establishment.razonSocial || establishment.name || "", { size: 18, bold: true, color: NAVY })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 160 },
    }),
    new Paragraph({
      children: [run(`${establishment.address || ""}, ${establishment.city || ""}`, { size: 11, bold: true, color: "333333" })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 80 },
    }),
    new Paragraph({
      children: [run(`Provincia de ${establishment.province || ""}`, { size: 11, bold: true, color: "333333" })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 400 },
    }),
    new Paragraph({
      children: [run(
        establishment.date
          ? new Date(establishment.date + "T12:00:00").toLocaleDateString("es-AR", { month: "long", year: "numeric" }).toUpperCase()
          : "",
        { size: 12, bold: true, color: NAVY }
      )],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 600 },
    }),
  ];

  if (estudios.length) {
    children.push(new Paragraph({
      children: [run("ESTUDIOS REALIZADOS:", { size: 10, bold: true, color: NAVY })],
      alignment: AlignmentType.LEFT,
      spacing: { before: 200, after: 120 },
    }));
    estudios.forEach(e => children.push(new Paragraph({
      children: [run(`• ${e}`, { size: 10, color: "333333" })],
      spacing: { before: 60, after: 60 },
    })));
  }

  return children;
};

export const spaceBlock = (label: string, est: any) => [
  pageBreakPara(),
  protocolHeader(label, est),
  new Table({
    width: { size: CONT_W, type: WidthType.DXA },
    columnWidths: [CONT_W],
    rows: [
      new TableRow({ children: [hdr("Constancia Fotográfica de las Tareas")] }),
      new TableRow({ children: [cell("(Adjuntar fotografías de los puestos evaluados)\n\n\n\n ", { size: 8, color: "888888", align: AlignmentType.CENTER })] }),
    ],
  }),
  pageBreakPara(),
  protocolHeader(label, est),
  new Table({
    width: { size: CONT_W, type: WidthType.DXA },
    columnWidths: [CONT_W],
    rows: [
      new TableRow({ children: [hdr("Certificación de Condiciones Meteorológicas")] }),
      new TableRow({ children: [cell("(Adjuntar certificado de condiciones meteorológicas del día de la medición)\n\n\n\n ", { size: 8, color: "888888", align: AlignmentType.CENTER })] }),
    ],
  }),
];

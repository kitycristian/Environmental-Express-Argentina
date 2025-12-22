// @ts-ignore
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, Header, Footer, ImageRun, PageNumber, NumberFormat } from "docx";
import { Establishment, Sector, Measurement, MEASUREMENT_LABELS } from "@/lib/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const COMPANY_COLOR = "003366";
const ACCENT_COLOR = "009933";

export const generateDocxReport = async (establishment: Establishment, sectors: Sector[]) => {
  // Helper to create a table cell with borders
  const createCell = (text: string, bold = false, options: any = {}) => {
    return new TableCell({
      children: [new Paragraph({
        children: [new TextRun({ text, bold, font: "Arial", size: 20 })], // size 20 = 10pt
        alignment: options.alignment || AlignmentType.LEFT,
      })],
      width: options.width,
      shading: options.shading,
      columnSpan: options.columnSpan,
      rowSpan: options.rowSpan,
      verticalAlign: options.verticalAlign,
      margins: { top: 100, bottom: 100, left: 100, right: 100 },
    });
  };

  // 1. Header
  const getHeader = () => {
    return new Header({
        children: [
            new Paragraph({
                children: [
                    new TextRun({
                        text: "INFORME TÉCNICO - Relevamiento de Agentes de Riesgo",
                        bold: true,
                        size: 24,
                        color: COMPANY_COLOR,
                    }),
                ],
                alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
                children: [
                    new TextRun({
                        text: `Empresa: ${establishment.name || "N/A"} - CUIT: ${establishment.cuit || "N/A"}`,
                        size: 18,
                        color: "666666",
                    }),
                ],
                alignment: AlignmentType.CENTER,
            }),
             new Paragraph({
                text: "", // Spacer
                border: {
                    bottom: { style: BorderStyle.SINGLE, size: 6, color: ACCENT_COLOR, space: 1 },
                },
            }),
        ],
    });
  };

  // 2. Footer
  const getFooter = () => {
    return new Footer({
        children: [
            new Paragraph({
                children: [
                    new TextRun({
                        text: "Generado el " + format(new Date(), "dd/MM/yyyy") + " - Environmental Express Argentina",
                        size: 16,
                        italics: true,
                    }),
                ],
                alignment: AlignmentType.LEFT,
            }),
             new Paragraph({
                children: [
                    new TextRun({
                        text: "Este informe es un documento técnico generado digitalmente según protocolos de la SRT.",
                        size: 14,
                        color: "888888",
                    }),
                ],
                alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
                children: [
                    new TextRun({
                        children: ["Página ", PageNumber.CURRENT, " de ", PageNumber.TOTAL_PAGES],
                    }),
                ],
                alignment: AlignmentType.RIGHT,
            }),
        ],
    });
  };

  // 3. Cover Page Content
  const coverSection = [
      new Paragraph({
          text: "INFORME TÉCNICO",
          heading: "Heading1",
          alignment: AlignmentType.CENTER,
          spacing: { before: 400, after: 200 },
      }),
       new Paragraph({
          text: "LEY 19.587 / DEC. 351/79",
          alignment: AlignmentType.CENTER,
          spacing: { after: 800 },
      }),
      // Establishment Data Table
      new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
              new TableRow({
                  children: [createCell("DATOS DEL ESTABLECIMIENTO", true, { columnSpan: 2, shading: { fill: "F0F0F0" } })],
              }),
              new TableRow({
                  children: [
                      createCell("Razón Social:", true),
                      createCell(establishment.razonSocial || establishment.name || "-"),
                  ],
              }),
              new TableRow({
                  children: [
                      createCell("Dirección:", true),
                      createCell(establishment.address || "-"),
                  ],
              }),
              new TableRow({
                  children: [
                      createCell("Localidad/Provincia:", true),
                      createCell(`${establishment.city || "-"}, ${establishment.province || "-"}`),
                  ],
              }),
               new TableRow({
                  children: [
                      createCell("C.P.:", true),
                      createCell(establishment.postalCode || "-"),
                  ],
              }),
          ],
      }),
      new Paragraph({ text: "", spacing: { before: 400 } }),
      // Instruments Table
      new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
              new TableRow({
                  children: [createCell("INSTRUMENTAL UTILIZADO", true, { columnSpan: 2, shading: { fill: "F0F0F0" } })],
              }),
              ...(establishment.instruments || []).map(inst => 
                  new TableRow({
                      children: [
                          createCell(`${inst.brand} ${inst.model}`, true),
                          createCell(`Serie: ${inst.serialNumber} - Calibración: ${inst.calibrationDate || "-"}`),
                      ],
                  })
              ),
              ((establishment.instruments || []).length === 0) ? new TableRow({ children: [createCell("No se declararon instrumentos", false, { columnSpan: 2 })] }) : null,
          ].filter(Boolean) as TableRow[],
      }),
  ];

  // 4. Lighting Protocol Section
  const lightingMeasurements = sectors.flatMap(s => s.measurements.filter(m => m.type === 'lighting').map(m => ({ ...m, sectorName: s.name })));
  
  const lightingSection = lightingMeasurements.length > 0 ? [
      new Paragraph({
          text: "PROTOCOLO DE MEDICIÓN DE ILUMINACIÓN",
          heading: "Heading2",
          pageBreakBefore: true,
          spacing: { before: 400, after: 200 },
      }),
      new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
              new TableRow({
                  tableHeader: true,
                  children: [
                      createCell("Punto", true, { shading: { fill: COMPANY_COLOR }, color: "FFFFFF" }),
                      createCell("Sector", true, { shading: { fill: COMPANY_COLOR }, color: "FFFFFF" }),
                      createCell("Iluminación", true, { shading: { fill: COMPANY_COLOR }, color: "FFFFFF" }),
                      createCell("Valor (Lux)", true, { shading: { fill: COMPANY_COLOR }, color: "FFFFFF" }),
                      createCell("Estado", true, { shading: { fill: COMPANY_COLOR }, color: "FFFFFF" }),
                  ],
              }),
              ...lightingMeasurements.map((m, idx) => {
                  const values = m.points.map(p => Number(p.values.lux) || 0).filter(v => v > 0);
                  const avg = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
                  const isCompliant = m.status === 'compliant';
                  
                  return new TableRow({
                      children: [
                          createCell((idx + 1).toString()),
                          createCell(m.sectorName),
                          createCell(m.config?.lightingSystemType || "General"),
                          createCell(avg.toString()),
                          createCell(isCompliant ? "CUMPLE" : "NO CUMPLE", true, { color: isCompliant ? "009933" : "CC0000" }),
                      ],
                  });
              }),
          ],
      }),
  ] : [];

  // 5. Conclusions Section
  const conclusionsSection = [
       new Paragraph({
          text: "CONCLUSIONES Y RECOMENDACIONES",
          heading: "Heading2",
          pageBreakBefore: true,
          spacing: { before: 400, after: 200 },
      }),
      new Paragraph({
          text: "Conclusiones:",
          heading: "Heading3",
      }),
      new Paragraph({
          text: establishment.conclusions || "Sin conclusiones generadas.",
          spacing: { after: 200 },
      }),
       new Paragraph({
          text: "Recomendaciones:",
          heading: "Heading3",
      }),
      new Paragraph({
          text: establishment.recommendations || "Sin recomendaciones generadas.",
          spacing: { after: 200 },
      }),
  ];

  // Assemble Document
  const doc = new Document({
    sections: [{
      properties: {
          page: {
              margin: {
                  top: 1440, // 1 inch approx
                  right: 1440,
                  bottom: 1440,
                  left: 1440,
              },
          },
      },
      headers: {
          default: getHeader(),
      },
      footers: {
          default: getFooter(),
      },
      children: [
          ...coverSection,
          ...lightingSection,
          ...conclusionsSection,
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Informe_Tecnico_${establishment.name || "EEA"}.docx`);
};

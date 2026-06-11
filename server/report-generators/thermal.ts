import {
  Paragraph, Table, TableRow,
  WidthType, AlignmentType,
} from "docx";
import {
  CONT_W, NAVY, run, cell, hdr, cumpleCell,
  pageBreakPara, protocolHeader, spaceBlock,
} from "./helpers.js";

export function buildThermalSection(establishment: any, thermalProtocol: any): any[] {
  if (!thermalProtocol?.rows?.some((r: any) => r.sector || r.tbs)) return [];
  const rows = thermalProtocol.rows;
  const comp = thermalProtocol.company || {};
  const items: any[] = [pageBreakPara()];

  items.push(new Paragraph({
    children: [run("ESTUDIO DE ESTRÉS POR CALOR SEGÚN RESOL. SRT Nº 30/2023", { size: 13, bold: true, color: NAVY })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 200 },
  }));

  // ── Encabezado + Datos para la medición
  items.push(protocolHeader("PROTOCOLO DE MEDICIÓN DE ESTRÉS POR CALOR EN EL AMBIENTE LABORAL", establishment));
  items.push(new Table({
    width: { size: CONT_W, type: WidthType.DXA },
    columnWidths: [CONT_W],
    rows: [
      new TableRow({ children: [hdr("Datos para la medición")] }),
      new TableRow({ children: [cell(`Marca, modelo y número de serie de los instrumentos: ${comp.instrumento1 || "-"} Serie: ${comp.instrumento1Serie || "-"} Cert: ${comp.instrumento1Cert || "-"}  |  ${comp.instrumento2 || "-"} Serie: ${comp.instrumento2Serie || "-"} Cert: ${comp.instrumento2Cert || "-"}`)] }),
      new TableRow({ children: [cell(`Fecha de calibración: ${comp.instrumento1FechaCal || "-"}`)] }),
      new TableRow({ children: [cell(`Fecha de la medición: ${comp.fechaMedicion || "-"}    Hora de inicio: ${comp.horaInicio || "-"}    Hora finalización: ${comp.horaFin || "-"}`)] }),
      new TableRow({ children: [cell(`Horarios/turnos habituales de trabajo: ${comp.turnos || "-"}`)] }),
      new TableRow({ children: [cell(`Condiciones atmosféricas: ${comp.condicionesAtm || "-"}    Temperatura exterior: ${comp.tempExterior || comp.tempExteriorEnvio || "-"} °C`)] }),
      new TableRow({ children: [hdr("Documentación que se adjuntará")] }),
      new TableRow({ children: [cell("• Certificado de calibración\n• Croquis")] }),
    ],
  }));

  // ── Tabla de datos de medición
  items.push(pageBreakPara());
  items.push(protocolHeader("PROTOCOLO DE MEDICIÓN DE ESTRÉS POR CALOR EN EL AMBIENTE LABORAL", establishment));
  items.push(new Table({
    width: { size: CONT_W, type: WidthType.DXA },
    columnWidths: [460, 1300, 1400, 600, 620, 620, 620, 680, 780, 700, 900, 780, 780, 1000],
    rows: [
      new TableRow({ children: [
        hdr("Pto",        { align: AlignmentType.CENTER }),
        hdr("Sector"),
        hdr("Puesto de Trabajo"),
        hdr("Exp. (h)",   { align: AlignmentType.CENTER }),
        hdr("TBS (°C)",   { align: AlignmentType.CENTER }),
        hdr("TBH (°C)",   { align: AlignmentType.CENTER }),
        hdr("TG (°C)",    { align: AlignmentType.CENTER }),
        hdr("TGBH (°C)", { align: AlignmentType.CENTER }),
        hdr("VAR Unif.", { align: AlignmentType.CENTER }),
        hdr("TGBHp (°C)",{ align: AlignmentType.CENTER }),
        hdr("Aclim.",    { align: AlignmentType.CENTER }),
        hdr("TM (W)",    { align: AlignmentType.CENTER }),
        hdr("VLA",       { align: AlignmentType.CENTER }),
        hdr("VLP",       { align: AlignmentType.CENTER }),
      ]}),
      ...rows.map((r: any, i: number) => new TableRow({ children: [
        cell(String(i + 1).padStart(2, "0"), { align: AlignmentType.CENTER }),
        cell(r.sector || ""),
        cell(r.puestoTrabajo || ""),
        cell(r.exposicionHs || "",     { align: AlignmentType.CENTER }),
        cell(r.tbs || "",              { align: AlignmentType.CENTER }),
        cell(r.tbh || "",              { align: AlignmentType.CENTER }),
        cell(r.tg || "",               { align: AlignmentType.CENTER }),
        cell(r.tgbh || "",             { align: AlignmentType.CENTER }),
        cell(r.varUniforme || "0",     { align: AlignmentType.CENTER }),
        cell(r.tgbhPonderado || "",    { align: AlignmentType.CENTER, bold: true }),
        cell(r.aclimatado || "",       { align: AlignmentType.CENTER }),
        cell(r.cargaMetabolica || "",  { align: AlignmentType.CENTER }),
        cell(r.vla || "",              { align: AlignmentType.CENTER }),
        cell(r.vlp || "",              { align: AlignmentType.CENTER }),
      ]})),
    ],
  }));

  // ── Tabla cumplimiento VLA / VLP
  items.push(pageBreakPara());
  items.push(protocolHeader("PROTOCOLO DE MEDICIÓN DE ESTRÉS POR CALOR EN EL AMBIENTE LABORAL", establishment));
  items.push(new Table({
    width: { size: CONT_W, type: WidthType.DXA },
    columnWidths: [700, 2400, 2200, 2000, 2000, 2160],
    rows: [
      new TableRow({ children: [
        hdr("Pto",    { align: AlignmentType.CENTER }),
        hdr("Sector"),
        hdr("Puesto"),
        hdr("TGBHp (°C)", { align: AlignmentType.CENTER }),
        hdr("¿TGBHp < VLA?", { align: AlignmentType.CENTER }),
        hdr("¿TGBHp < VLP?", { align: AlignmentType.CENTER }),
      ]}),
      ...rows.map((r: any, i: number) => new TableRow({ children: [
        cell(String(i + 1).padStart(2, "0"), { align: AlignmentType.CENTER }),
        cell(r.sector || ""),
        cell(r.puestoTrabajo || ""),
        cell(r.tgbhPonderado || "", { align: AlignmentType.CENTER, bold: true }),
        cumpleCell(r.cumpleVla),
        cumpleCell(r.cumpleVlp),
      ]})),
    ],
  }));

  // ── Fichas individuales de carga térmica (una por puesto)
  rows.forEach((r: any, i: number) => {
    const idx = String(i + 1).padStart(2, "0");
    items.push(pageBreakPara());
    items.push(protocolHeader("PROTOCOLO DE MEDICIÓN DE ESTRÉS POR CALOR EN EL AMBIENTE LABORAL", establishment));
    items.push(new Paragraph({
      children: [run(`FICHA DE CARGA TÉRMICA — Punto ${idx}: ${r.sector || ""} / ${r.puestoTrabajo || ""}`, { size: 10, bold: true, color: NAVY })],
      spacing: { before: 120, after: 80 },
    }));
    items.push(new Table({
      width: { size: CONT_W, type: WidthType.DXA },
      columnWidths: [Math.floor(CONT_W / 4), Math.floor(CONT_W / 4), Math.floor(CONT_W / 4), Math.floor(CONT_W / 4)],
      rows: [
        new TableRow({ children: [
          hdr("Tipo de trabajo"),
          hdr("Postura / Movimiento"),
          hdr("W (Watts)"),
          hdr("Valor"),
        ]}),
        new TableRow({ children: [
          cell("Posición del cuerpo"),
          cell(r.posturaCuerpo || "-"),
          cell(r.posturaCuerpoW || "-", { align: AlignmentType.CENTER }),
          cell(r.posturaCuerpoVal || "-", { align: AlignmentType.CENTER }),
        ]}),
        new TableRow({ children: [
          cell("Tipo de trabajo"),
          cell(r.tipoTrabajo || "-"),
          cell(r.tipoTrabajoW || "-", { align: AlignmentType.CENTER }),
          cell(r.tipoTrabajoVal || "-", { align: AlignmentType.CENTER }),
        ]}),
        new TableRow({ children: [
          cell("Suplemento por ropa (VAR)"),
          cell(r.varUniforme || "0"),
          cell("—", { align: AlignmentType.CENTER }),
          cell(r.varUniforme || "0", { align: AlignmentType.CENTER }),
        ]}),
        new TableRow({ children: [
          hdr("Tasa Metabólica Total (TM)", { span: 2 }),
          hdr("W"),
          hdr(String(r.cargaMetabolica || "-"), { align: AlignmentType.CENTER }),
        ]}),
      ],
    }));
    items.push(new Table({
      width: { size: CONT_W, type: WidthType.DXA },
      columnWidths: [Math.floor(CONT_W / 3), Math.floor(CONT_W / 3), Math.floor(CONT_W / 3)],
      rows: [
        new TableRow({ children: [
          hdr("TGBH ponderado (°C)"),
          hdr("VLA (°C)"),
          hdr("VLP (°C)"),
        ]}),
        new TableRow({ children: [
          cell(String(r.tgbhPonderado || "-"), { align: AlignmentType.CENTER, bold: true }),
          cell(String(r.vla || "-"), { align: AlignmentType.CENTER }),
          cell(String(r.vlp || "-"), { align: AlignmentType.CENTER }),
        ]}),
        new TableRow({ children: [
          hdr("¿Cumple VLA?"),
          hdr("¿Cumple VLP?"),
          hdr("Aclimatado"),
        ]}),
        new TableRow({ children: [
          cumpleCell(r.cumpleVla),
          cumpleCell(r.cumpleVlp),
          cell(r.aclimatado || "-", { align: AlignmentType.CENTER }),
        ]}),
      ],
    }));
    if (r.comentario) {
      items.push(new Paragraph({
        children: [run(`Observaciones: ${r.comentario}`, { size: 9, italic: true, color: "555555" })],
        spacing: { before: 60, after: 40 },
      }));
    }
  });

  // ── Valores de referencia
  items.push(pageBreakPara());
  items.push(protocolHeader("PROTOCOLO DE MEDICIÓN DE ESTRÉS POR CALOR EN EL AMBIENTE LABORAL", establishment));
  items.push(new Table({
    width: { size: CONT_W, type: WidthType.DXA },
    columnWidths: [CONT_W],
    rows: [
      new TableRow({ children: [hdr("Valores de Referencia — Resol. SRT N° 30/2023")] }),
      new TableRow({ children: [cell(
        "CATEGORÍAS SEGÚN TASA METABÓLICA PONDERADA:\n" +
        "  0 — Descanso:       115 W  (100 – 125 W)\n" +
        "  1 — Ligero:         180 W  (126 – 235 W)\n" +
        "  2 — Moderado:       300 W  (236 – 360 W)\n" +
        "  3 — Pesado:         415 W  (361 – 465 W)\n" +
        "  4 — Muy Pesado:     520 W  (>  466 W)\n\n" +
        "Los Valores Límites representan las condiciones bajo las cuales casi todos los trabajadores sanos y sin factores de riesgo " +
        "pueden estar expuestos repetidamente al calor sin sufrir efectos adversos para la salud.\n\n" +
        "TABLA 1 — Valor de Ajuste por Ropa (VAR):\n" +
        "Ropa trabajo algodón: 0  |  Overol tejido: 0  |  Overol SMS una capa: +0,5\n" +
        "Overol poliolefina: +1  |  Ropa doble capa: +3  |  Overol barrera vapor: +11\n\n" +
        "TABLA 8 — Valores Límite Permisible (VLP) para trabajadores ACLIMATADOS:\n" +
        "TM 0 (Descanso): 33,0°C  |  TM 1 (Ligero): 30,0°C  |  TM 2 (Moderado): 28,0°C\n" +
        "TM 3 (Pesado): 25,0°C   |  TM 4 (Muy Pesado): 23,5°C\n\n" +
        "TABLA 9 — Valores Límite de Acción (VLA) para trabajadores ACLIMATADOS:\n" +
        "TM 0 (Descanso): 35,0°C  |  TM 1 (Ligero): 32,0°C  |  TM 2 (Moderado): 30,0°C\n" +
        "TM 3 (Pesado): 27,5°C   |  TM 4 (Muy Pesado): 25,5°C"
      )] }),
    ],
  }));

  // ── Conclusiones y Recomendaciones
  items.push(pageBreakPara());
  items.push(protocolHeader("PROTOCOLO DE MEDICIÓN DE ESTRÉS POR CALOR EN EL AMBIENTE LABORAL", establishment));
  items.push(new Table({
    width: { size: CONT_W, type: WidthType.DXA },
    columnWidths: [CONT_W],
    rows: [
      new TableRow({ children: [hdr("Análisis de los Datos")] }),
      new TableRow({ children: [hdr("Conclusiones")] }),
      new TableRow({ children: [cell(thermalProtocol.conclusiones || "(Sin conclusiones cargadas)")] }),
      new TableRow({ children: [hdr("Controles Generales / Recomendaciones")] }),
      new TableRow({ children: [cell(
        "• Establecer un programa de aclimatación al calor para trabajadores nuevos y los que regresan de vacaciones.\n" +
        "• Proveer agua fresca (aprox. 250 ml cada 20 min) y facilitar el acceso durante la jornada laboral.\n" +
        "• Instalar o mejorar sistemas de ventilación/aire acondicionado en áreas críticas.\n" +
        "• Implementar el sistema de control fisiológico de la tensión térmica donde se supere el VLP.\n" +
        "• Capacitar al personal y supervisores en reconocimiento y respuesta ante golpe de calor.\n" +
        (thermalProtocol.recomendaciones ? `\nRECOMENDACIONES ESPECÍFICAS:\n${thermalProtocol.recomendaciones}` : "")
      )] }),
    ],
  }));

  // ── Constancia fotográfica + Meteorológica
  items.push(...spaceBlock("PROTOCOLO DE MEDICIÓN DE ESTRÉS POR CALOR EN EL AMBIENTE LABORAL", establishment));

  // ── Instructivo
  items.push(pageBreakPara());
  items.push(new Table({
    width: { size: CONT_W, type: WidthType.DXA },
    columnWidths: [CONT_W],
    rows: [
      new TableRow({ children: [hdr("INSTRUCTIVO PARA COMPLETAR EL PROTOCOLO DE MEDICIÓN DE ESTRÉS POR CALOR", { align: AlignmentType.CENTER })] }),
      new TableRow({ children: [cell(
        "El presente protocolo debe completarse siguiendo los lineamientos de la Resolución SRT N° 30/2023.\n\n" +
        "DATOS DEL ESTABLECIMIENTO: Completar con los datos reales del establecimiento evaluado.\n\n" +
        "INSTRUMENTOS: Indicar marca, modelo, número de serie y número de certificado de calibración " +
        "de cada instrumento utilizado (Monitor WBGT, Termohigrómetro, etc.).\n\n" +
        "FECHA DE MEDICIÓN: La medición debe realizarse en el período de mayor carga térmica del año " +
        "(período estival) y con las fuentes de calor encendidas.\n\n" +
        "TGBH PONDERADO: Se calcula considerando el tiempo de exposición y recuperación durante una " +
        "hora cronológica: TGBHp = TGBH × (tiempo trabajo) + TGBH_descanso × (tiempo descanso).\n\n" +
        "TASA METABÓLICA (TM): Se determina según el Método a) del punto 4.2.1.1 de la Resolución " +
        "SRT 30/2023 — Evaluación por requisitos de tareas/posturas/biomecánicos.\n\n" +
        "VLA (Valor Límite de Acción): A partir de este valor el empleador debe instrumentar controles " +
        "generales y declarar al personal expuesto ante la ART (ESOP 80001).\n\n" +
        "VLP (Valor Límite Permisible): Límite máximo. Si se supera, el empleador debe realizar un " +
        "estudio detallado o control fisiológico de la tensión térmica."
      )] }),
    ],
  }));

  return items;
}

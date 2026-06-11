import { Document, Packer, WidthType } from "docx";
import JSZip from "jszip";
import {
  CONT_W, MARG,
  buildCover, makeFooter,
} from "./helpers.js";
import { buildThermalSection } from "./thermal.js";
import { buildColdSection }    from "./cold.js";
import { buildNoiseSection }   from "./noise.js";
import { buildLightingSection } from "./lighting.js";

export interface ReportData {
  establishment: any;
  noiseProtocol?: any;
  thermalProtocol?: any;
  coldProtocol?: any;
  lightingSectors?: any[];
}

export interface Signatory {
  name: string;
  title: string;
  registration: string;
}

const PAGE_PROPS = {
  page: {
    size: { width: 11906, height: 16838 },
    margin: { top: MARG, right: MARG, bottom: 1440, left: MARG },
  },
};

function getEstudios(data: ReportData, protocols: string[]): string[] {
  const estudios: string[] = [];
  if (protocols.includes("thermal") && data.thermalProtocol?.rows?.some((r: any) => r.sector || r.tbs))
    estudios.push("ESTRÉS POR CALOR — Resol. SRT N° 30/2023");
  if (protocols.includes("cold") && data.coldProtocol?.rows?.some((r: any) => r.sector || r.tbs))
    estudios.push("ESTRÉS POR FRÍO — Resol. MTEySS N° 295/2003");
  if (protocols.includes("noise") && data.noiseProtocol?.rows?.some((r: any) => r.sector || r.valorMedido))
    estudios.push("RUIDO LABORAL — Resol. SRT N° 85/2012");
  if (protocols.includes("lighting") && data.lightingSectors?.length)
    estudios.push("ILUMINACIÓN — Resol. SRT N° 84/2012");
  return estudios;
}

function buildSections(data: ReportData, protocols: string[]): any[] {
  const children: any[] = [];
  if (protocols.includes("thermal"))
    children.push(...buildThermalSection(data.establishment, data.thermalProtocol));
  if (protocols.includes("cold"))
    children.push(...buildColdSection(data.establishment, data.coldProtocol));
  if (protocols.includes("noise"))
    children.push(...buildNoiseSection(data.establishment, data.noiseProtocol));
  if (protocols.includes("lighting"))
    children.push(...buildLightingSection(data.establishment, data.lightingSectors || []));
  return children;
}

export async function buildDocument(
  data: ReportData,
  signatory: Signatory,
  protocols: string[],
): Promise<Buffer> {
  const estudios = getEstudios(data, protocols);
  const coverChildren = buildCover(data.establishment, estudios);
  const sectionChildren = buildSections(data, protocols);

  const doc = new Document({
    sections: [{
      properties: PAGE_PROPS,
      footers: { default: makeFooter(signatory) },
      children: [...coverChildren, ...sectionChildren],
    }],
  });

  return Packer.toBuffer(doc);
}

export async function buildDocumentsZip(
  data: ReportData,
  signatory: Signatory,
  protocols: string[],
): Promise<Buffer> {
  const zip = new JSZip();

  const empresa = (data.establishment.razonSocial || data.establishment.name || "EEA")
    .replace(/[^a-zA-Z0-9\s]/g, "").trim().replace(/\s+/g, "_").substring(0, 30);
  const fecha = new Date().toISOString().split("T")[0];

  const labelMap: Record<string, string> = {
    thermal:  "Carga_Termica",
    cold:     "Estres_Frio",
    noise:    "Ruido",
    lighting: "Iluminacion",
  };

  for (const protocol of protocols) {
    const singleStudy = getEstudios(data, [protocol]);
    const coverChildren = buildCover(data.establishment, singleStudy);
    const sectionChildren = buildSections(data, [protocol]);

    if (!sectionChildren.length) continue;

    const doc = new Document({
      sections: [{
        properties: PAGE_PROPS,
        footers: { default: makeFooter(signatory) },
        children: [...coverChildren, ...sectionChildren],
      }],
    });

    const buf = await Packer.toBuffer(doc);
    const label = labelMap[protocol] || protocol;
    zip.file(`${label}_${empresa}_${fecha}.docx`, buf);
  }

  return zip.generateAsync({ type: "nodebuffer" }) as Promise<Buffer>;
}

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ThermalRow {
  id: string;
  sector: string;
  puestoTrabajo: string;
  tipoActividad: string;
  cargaMetabolica: string;
  exposicionHs: string;
  tbs: string;
  tbh: string;
  tg: string;
  tgbh: string;
  tgbhPonderado: string;
  aclimatado: string;
  vla: string;
  vlp: string;
  cumpleVla: string;
  cumpleVlp: string;
  observaciones: string;
}

export interface ThermalCompany {
  razonSocial: string;
  direccion: string;
  localidad: string;
  provincia: string;
  cp: string;
  cuit: string;
  fechaMedicion: string;
  horaInicio: string;
  horaFin: string;
  turnos: string;
  instrumento1: string;
  instrumento1Serie: string;
  instrumento1Cert: string;
  instrumento1FechaCal: string;
  instrumento2: string;
  instrumento2Serie: string;
  instrumento2Cert: string;
  instrumento2FechaCal: string;
  condicionesAtm: string;
}

export interface NoiseRow {
  id: string;
  sector: string;
  puestoTrabajo: string;
  tiempoExposicion: string;
  tiempoIntegracion: string;
  tipoRuido: string;
  valorMedido: string;
  unidad: string;
  dosisRuido: string;
  limitePermisible: string;
  fraccion: string;
  cumple: string;
  observaciones: string;
}

export interface NoiseCompany {
  razonSocial: string;
  direccion: string;
  localidad: string;
  provincia: string;
  cp: string;
  cuit: string;
  fechaMedicion: string;
  horaInicio: string;
  horaFin: string;
  jornadaLaboral: string;
  turnos: string;
  instrumento1: string;
  instrumento1Serie: string;
  instrumento1Cert: string;
  instrumento1FechaCal: string;
  instrumento2: string;
  instrumento2Serie: string;
  instrumento2Cert: string;
  instrumento2FechaCal: string;
  condicionesNormales: string;
  condicionesMedicion: string;
}

export interface ColdRow {
  id: string;
  sector: string;
  puestoTrabajo: string;
  rangoTemp: string;
  ciclosExposicion: string;
  duracionCiclo: string;
  tiempoNetoExposicion: string;
  tiempoIntegracion: string;
  caracteristicasExposicion: string;
  tbs: string;
  velocidadViento: string;
  tee: string;
  tipoUniforme: string;
  equipoUtilizado: string;
  exposicionMas4h: string;
}

export interface ColdCompany {
  razonSocial: string;
  direccion: string;
  localidad: string;
  provincia: string;
  cp: string;
  cuit: string;
  fechaMedicion: string;
  horaInicio: string;
  horaFin: string;
  turnos: string;
  instrumento1: string;
  instrumento1Serie: string;
  instrumento1Cert: string;
  instrumento1FechaCal: string;
  condicionesAtm: string;
}

export interface SectorPhoto {
  id: string;
  sectorName: string;
  base64: string;
  fileName: string;
  caption: string;
}

// ── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_THERMAL_ROW: ThermalRow = { id: "1", sector: "", puestoTrabajo: "", tipoActividad: "", cargaMetabolica: "", exposicionHs: "", tbs: "", tbh: "", tg: "", tgbh: "", tgbhPonderado: "", aclimatado: "SI", vla: "", vlp: "", cumpleVla: "", cumpleVlp: "", observaciones: "" };

const DEFAULT_THERMAL_COMPANY: ThermalCompany = { razonSocial: "", direccion: "", localidad: "", provincia: "", cp: "", cuit: "", fechaMedicion: "", horaInicio: "", horaFin: "", turnos: "", instrumento1: "", instrumento1Serie: "", instrumento1Cert: "", instrumento1FechaCal: "", instrumento2: "", instrumento2Serie: "", instrumento2Cert: "", instrumento2FechaCal: "", condicionesAtm: "" };

const DEFAULT_NOISE_ROW: NoiseRow = { id: "1", sector: "", puestoTrabajo: "", tiempoExposicion: "", tiempoIntegracion: "", tipoRuido: "", valorMedido: "", unidad: "dBA", dosisRuido: "", limitePermisible: "85", fraccion: "", cumple: "", observaciones: "" };

const DEFAULT_NOISE_COMPANY: NoiseCompany = { razonSocial: "", direccion: "", localidad: "", provincia: "", cp: "", cuit: "", fechaMedicion: "", horaInicio: "", horaFin: "", jornadaLaboral: "", turnos: "", instrumento1: "", instrumento1Serie: "", instrumento1Cert: "", instrumento1FechaCal: "", instrumento2: "", instrumento2Serie: "", instrumento2Cert: "", instrumento2FechaCal: "", condicionesNormales: "", condicionesMedicion: "" };

const DEFAULT_COLD_ROW: ColdRow = { id: "1", sector: "", puestoTrabajo: "", rangoTemp: "", ciclosExposicion: "", duracionCiclo: "", tiempoNetoExposicion: "", tiempoIntegracion: "", caracteristicasExposicion: "", tbs: "", velocidadViento: "", tee: "", tipoUniforme: "", equipoUtilizado: "", exposicionMas4h: "" };

const DEFAULT_COLD_COMPANY: ColdCompany = { razonSocial: "", direccion: "", localidad: "", provincia: "", cp: "", cuit: "", fechaMedicion: "", horaInicio: "", horaFin: "", turnos: "", instrumento1: "", instrumento1Serie: "", instrumento1Cert: "", instrumento1FechaCal: "", condicionesAtm: "" };

// ── Store ──────────────────────────────────────────────────────────────────

interface MeasurementState {
  // Thermal
  thermalRows: ThermalRow[];
  thermalCompany: ThermalCompany;
  thermalObs: string;
  thermalConc: string;
  thermalRec: string;
  setThermalRows: (rows: ThermalRow[]) => void;
  setThermalCompany: (company: ThermalCompany) => void;
  setThermalObs: (v: string) => void;
  setThermalConc: (v: string) => void;
  setThermalRec: (v: string) => void;

  // Noise
  noiseRows: NoiseRow[];
  noiseCompany: NoiseCompany;
  noiseObs: string;
  noiseConc: string;
  noiseRec: string;
  setNoiseRows: (rows: NoiseRow[]) => void;
  setNoiseCompany: (company: NoiseCompany) => void;
  setNoiseObs: (v: string) => void;
  setNoiseConc: (v: string) => void;
  setNoiseRec: (v: string) => void;

  // Cold
  coldRows: ColdRow[];
  coldCompany: ColdCompany;
  coldObs: string;
  coldConc: string;
  coldRec: string;
  setColdRows: (rows: ColdRow[]) => void;
  setColdCompany: (company: ColdCompany) => void;
  setColdObs: (v: string) => void;
  setColdConc: (v: string) => void;
  setColdRec: (v: string) => void;

  // Photos
  sectorPhotos: SectorPhoto[];
  setSectorPhotos: (photos: SectorPhoto[]) => void;

  resetAll: () => void;
}

export const useMeasurementStore = create<MeasurementState>()(
  persist(
    (set) => ({
      // Thermal
      thermalRows: [DEFAULT_THERMAL_ROW],
      thermalCompany: DEFAULT_THERMAL_COMPANY,
      thermalObs: "",
      thermalConc: "",
      thermalRec: "",
      setThermalRows: (thermalRows) => set({ thermalRows }),
      setThermalCompany: (thermalCompany) => set({ thermalCompany }),
      setThermalObs: (thermalObs) => set({ thermalObs }),
      setThermalConc: (thermalConc) => set({ thermalConc }),
      setThermalRec: (thermalRec) => set({ thermalRec }),

      // Noise
      noiseRows: [DEFAULT_NOISE_ROW],
      noiseCompany: DEFAULT_NOISE_COMPANY,
      noiseObs: "",
      noiseConc: "",
      noiseRec: "",
      setNoiseRows: (noiseRows) => set({ noiseRows }),
      setNoiseCompany: (noiseCompany) => set({ noiseCompany }),
      setNoiseObs: (noiseObs) => set({ noiseObs }),
      setNoiseConc: (noiseConc) => set({ noiseConc }),
      setNoiseRec: (noiseRec) => set({ noiseRec }),

      // Cold
      coldRows: [DEFAULT_COLD_ROW],
      coldCompany: DEFAULT_COLD_COMPANY,
      coldObs: "",
      coldConc: "",
      coldRec: "",
      setColdRows: (coldRows) => set({ coldRows }),
      setColdCompany: (coldCompany) => set({ coldCompany }),
      setColdObs: (coldObs) => set({ coldObs }),
      setColdConc: (coldConc) => set({ coldConc }),
      setColdRec: (coldRec) => set({ coldRec }),

      // Photos
      sectorPhotos: [],
      setSectorPhotos: (sectorPhotos) => set({ sectorPhotos }),

      resetAll: () => set({
        thermalRows: [DEFAULT_THERMAL_ROW], thermalCompany: DEFAULT_THERMAL_COMPANY, thermalObs: "", thermalConc: "", thermalRec: "",
        noiseRows: [DEFAULT_NOISE_ROW], noiseCompany: DEFAULT_NOISE_COMPANY, noiseObs: "", noiseConc: "", noiseRec: "",
        coldRows: [DEFAULT_COLD_ROW], coldCompany: DEFAULT_COLD_COMPANY, coldObs: "", coldConc: "", coldRec: "",
        sectorPhotos: [],
      }),
    }),
    {
      name: 'higiene-seguridad-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

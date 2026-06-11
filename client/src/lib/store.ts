import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Establishment, Sector, Measurement, MeasurementPoint, MeasurementType } from './types';
import { v4 as uuidv4 } from 'uuid';

// ─── Noise Protocol Types ─────────────────────────────────────────────────────
export interface NoiseRow {
  id: string;
  sector: string;
  puestoTrabajo: string;
  tipoRuido: string;           // Continuo | Intermitente | Impulso o Impacto
  esPuestoMovil: boolean;      // medido con dosímetro en recorrido
  tiempoExposicion: string;    // Te en horas
  tiempoIntegracion: string;   // duración integración en minutos
  laeqTe: string;              // LAeq,Te en dBA (continuo/intermitente)
  lcPicoDbc: string;           // LC pico en dBC (impulso)
  sumaFracciones: string;      // Σ Ci/Ti (calculado, display)
  dosis: string;               // % dosímetro
  cumple: string;              // SI/NO (calculado, display)
  observaciones: string;
}

export interface NoiseProtocol {
  rows: NoiseRow[];
  company: {
    razonSocial: string; direccion: string; localidad: string; provincia: string;
    cp: string; cuit: string; fechaMedicion: string; horaInicio: string; horaFin: string;
    jornadaLaboral: string; turnos: string;
    instrumento1Marca: string; instrumento1Modelo: string; instrumento1Tipo: string;
    instrumento1Serie: string; instrumento1Cert: string; instrumento1FechaCal: string;
    instrumento1Norma: string;
    instrumento2Marca: string; instrumento2Modelo: string; instrumento2Tipo: string;
    instrumento2Serie: string; instrumento2Cert: string; instrumento2FechaCal: string;
    tempExterior: string; humedad: string; presionAtm: string;
    condicionesNormales: string; condicionesMedicion: string;
  };
  observaciones: string;
  conclusiones: string;
  recomendaciones: string;
}

// ─── Thermal Load Protocol Types ─────────────────────────────────────────────
export interface ThermalRow {
  id: string;
  sector: string;
  puestoTrabajo: string;
  exposicionHs: string;
  tbs: string;
  tbh: string;
  tg: string;
  tgbhSinPonderar: string;
  varUniforme: string;
  tgbhPonderado: string;
  aclimatado: string;
  tmSentado: string;
  suplementoTM: string;
  cargaMetabolica: string;
  posturaSeleccionada: string;
  parteDelCuerpo: string;
  intensidadTrabajo: string;
  vla: string;
  vlp: string;
  cumpleVla: string;
  cumpleVlp: string;
  factoresExposicion: string[];
  comentario: string;
  observaciones: string;
}

export interface ThermalProtocol {
  rows: ThermalRow[];
  company: {
    razonSocial: string; direccion: string; localidad: string; provincia: string;
    cp: string; cuit: string; fechaMedicion: string; horaInicio: string; horaFin: string;
    turnos: string;
    instrumento1Marca: string; instrumento1Modelo: string; instrumento1Serie: string;
    instrumento1Cert: string; instrumento1FechaCal: string;
    instrumento2Marca: string; instrumento2Modelo: string; instrumento2Serie: string;
    instrumento2Cert: string; instrumento2FechaCal: string;
    tempExterior: string; humedad: string; presionAtm: string;
    condicionesNormales: string; condicionesMedicion: string;
  };
  observaciones: string;
  conclusiones: string;
  recomendaciones: string;
}

// ─── Cold Stress Protocol Types ──────────────────────────────────────────────
export interface ColdRow {
  id: string;
  sector: string;
  puestoTrabajo: string;
  rangoTemp: string;
  cantidadCiclos: string;
  duracionCiclo: string;
  tiempoNetoExposicion: string;
  tiempoIntegracion: string;
  caracteristicasExposicion: string;
  tbs: string;
  velocidadAire: string;
  tee: string;
  tipoUniforme: string;
  equipo: string;
  exposicionMas4h: string;
  nivelPeligro: string;
  observaciones: string;
}

export interface ColdProtocol {
  rows: ColdRow[];
  company: {
    razonSocial: string; direccion: string; localidad: string; provincia: string;
    cp: string; cuit: string; fechaMedicion: string; horaInicio: string; horaFin: string;
    turnos: string;
    instrumento1Marca: string; instrumento1Modelo: string; instrumento1Serie: string;
    instrumento1Cert: string; instrumento1FechaCal: string;
    tempExterior: string; humedad: string; presionAtm: string;
    condicionesNormales: string; condicionesMedicion: string;
  };
  observaciones: string;
  metodologia: string;
  conclusiones: string;
  recomendaciones: string;
}

// ─── Lighting Protocol Types ──────────────────────────────────────────────────
export interface LightingProtocol {
  company: {
    razonSocial: string; direccion: string; localidad: string; provincia: string;
    cp: string; cuit: string; fechaMedicion: string; horaInicio: string; horaFin: string;
    turnos: string;
    instrumento1Marca: string; instrumento1Modelo: string; instrumento1Serie: string;
    instrumento1Cert: string; instrumento1FechaCal: string;
    instrumento2Marca: string; instrumento2Modelo: string; instrumento2Serie: string;
    tempExterior: string; humedad: string; presionAtm: string;
    metodologia: string; observacionesGenerales: string;
  };
  mantenimiento: Record<string, boolean>;
  observaciones: string;
  conclusiones: string;
  recomendaciones: string;
}

interface AppState {
  establishment: Establishment;
  sectors: Sector[];
  noiseProtocol: NoiseProtocol;
  thermalProtocol: ThermalProtocol;
  coldProtocol: ColdProtocol;
  lightingProtocol: LightingProtocol;
  digitalSignature: string | null;
  signatoryName: string | null;
  signatoryTitle: string | null;
  signatoryRegistration: string | null;
  lastSavedAt: string | null;
  isDirty: boolean;

  updateEstablishment: (data: Partial<Establishment>) => void;
  addSector: (sector: Omit<Sector, 'id' | 'measurements'>) => void;
  updateSector: (id: string, data: Partial<Sector>) => void;
  deleteSector: (id: string) => void;
  addMeasurement: (sectorId: string, type: MeasurementType) => void;
  deleteMeasurement: (sectorId: string, measurementId: string) => void;
  updateMeasurement: (sectorId: string, measurementId: string, data: Partial<Measurement>) => void;
  addPoint: (sectorId: string, measurementId: string, pointData?: Partial<MeasurementPoint>) => void;
  updatePoint: (sectorId: string, measurementId: string, pointId: string, data: Partial<MeasurementPoint>) => void;
  deletePoint: (sectorId: string, measurementId: string, pointId: string) => void;
  addSectorWithMeasurement: (sectorData: Omit<Sector, 'id' | 'measurements'>, type: MeasurementType) => void;

  updateNoiseRow: (id: string, data: Partial<NoiseRow>) => void;
  addNoiseRow: () => void;
  deleteNoiseRow: (id: string) => void;
  updateNoiseCompany: (data: Partial<NoiseProtocol['company']>) => void;
  updateNoiseText: (field: 'observaciones' | 'conclusiones' | 'recomendaciones', value: string) => void;
  setNoiseRows: (rows: NoiseRow[]) => void;

  updateThermalRow: (id: string, data: Partial<ThermalRow>) => void;
  addThermalRow: () => void;
  deleteThermalRow: (id: string) => void;
  updateThermalCompany: (data: Partial<ThermalProtocol['company']>) => void;
  updateThermalText: (field: 'observaciones' | 'conclusiones' | 'recomendaciones', value: string) => void;
  setThermalRows: (rows: ThermalRow[]) => void;

  updateColdRow: (id: string, data: Partial<ColdRow>) => void;
  addColdRow: () => void;
  deleteColdRow: (id: string) => void;
  updateColdCompany: (data: Partial<ColdProtocol['company']>) => void;
  updateColdText: (field: 'observaciones' | 'metodologia' | 'conclusiones' | 'recomendaciones', value: string) => void;
  setColdRows: (rows: ColdRow[]) => void;

  updateLightingCompany: (data: Partial<LightingProtocol['company']>) => void;
  updateLightingText: (field: 'observaciones' | 'conclusiones' | 'recomendaciones', value: string) => void;
  updateLightingMantenimiento: (key: string, value: boolean) => void;

  loadInspectionData: (establishment: Establishment, sectors: Sector[]) => void;
  resetStore: () => void;
  saveInspection: () => Promise<void>;
  markClean: () => void;
  setDigitalSignature: (signature: string | null) => void;
  setSignatoryName: (name: string | null) => void;
  setSignatoryTitle: (title: string | null) => void;
  setSignatoryRegistration: (registration: string | null) => void;
}

const pt = (id: string, lux: string) => ({ id, label: '', values: { lux } });

export const sampleSectors: Sector[] = [
  { id: 'sample-1', name: 'Salón de Ventas', description: '', dimensions: '', activity: '', workersCount: 0,
    measurements: [{ id: 'm1', type: 'lighting', sectorId: 'sample-1', status: 'pending',
      points: [pt('p1','332'),pt('p2','316'),pt('p3','354'),pt('p4','360'),pt('p5','374'),pt('p6','341'),pt('p7','354'),pt('p8','404'),pt('p9','380')],
      observations: '', config: { width: 76, length: 54, height: 5.6, limit: 500 } }] },
  { id: 'sample-2', name: 'Salón de Ventas', description: 'Línea de Cajas', dimensions: '', activity: '', workersCount: 0,
    measurements: [{ id: 'm2', type: 'lighting', sectorId: 'sample-2', status: 'pending',
      points: [pt('p1','366'),pt('p2','396'),pt('p3','411'),pt('p4','352'),pt('p5','397'),pt('p6','420'),pt('p7','418'),pt('p8','410'),pt('p9','310')],
      observations: '', config: { width: 5.2, length: 31, height: 4.2, limit: 500 } }] },
];

const defaultNoiseRow = (): NoiseRow => ({
  id: uuidv4(), sector: '', puestoTrabajo: '', tipoRuido: 'Continuo', esPuestoMovil: false,
  tiempoExposicion: '', tiempoIntegracion: '', laeqTe: '', lcPicoDbc: '',
  sumaFracciones: '', dosis: '', cumple: '', observaciones: ''
});

const defaultThermalRow = (): ThermalRow => ({
  id: uuidv4(), sector: '', puestoTrabajo: '', exposicionHs: '',
  tbs: '', tbh: '', tg: '', tgbhSinPonderar: '', varUniforme: '0', tgbhPonderado: '',
  aclimatado: 'SI', tmSentado: '', suplementoTM: '27', cargaMetabolica: '',
  posturaSeleccionada: 'De pie', parteDelCuerpo: 'Cuerpo entero', intensidadTrabajo: 'Moderada',
  vla: '', vlp: '', cumpleVla: '', cumpleVlp: '',
  factoresExposicion: [], comentario: '', observaciones: ''
});

const defaultColdRow = (): ColdRow => ({
  id: uuidv4(), sector: '', puestoTrabajo: '', rangoTemp: '', cantidadCiclos: '',
  duracionCiclo: '', tiempoNetoExposicion: '', tiempoIntegracion: '', caracteristicasExposicion: '',
  tbs: '', velocidadAire: '', tee: '', tipoUniforme: '', equipo: '', exposicionMas4h: 'NO',
  nivelPeligro: '', observaciones: ''
});

const defaultNoiseCompany = () => ({
  razonSocial: '', direccion: '', localidad: '', provincia: '', cp: '', cuit: '',
  fechaMedicion: '', horaInicio: '', horaFin: '', jornadaLaboral: '8 Horas', turnos: '',
  instrumento1Marca: '', instrumento1Modelo: '', instrumento1Tipo: 'Sonómetro Integrador',
  instrumento1Serie: '', instrumento1Cert: '', instrumento1FechaCal: '',
  instrumento1Norma: 'IRAM 4074 / IEC 804 Clase 2',
  instrumento2Marca: '', instrumento2Modelo: '', instrumento2Tipo: 'Dosímetro',
  instrumento2Serie: '', instrumento2Cert: '', instrumento2FechaCal: '',
  tempExterior: '', humedad: '', presionAtm: '',
  condicionesNormales: '', condicionesMedicion: ''
});

const defaultThermalCompany = () => ({
  razonSocial: '', direccion: '', localidad: '', provincia: '', cp: '', cuit: '',
  fechaMedicion: '', horaInicio: '', horaFin: '', turnos: '',
  instrumento1Marca: '', instrumento1Modelo: '', instrumento1Serie: '', instrumento1Cert: '', instrumento1FechaCal: '',
  instrumento2Marca: '', instrumento2Modelo: '', instrumento2Serie: '', instrumento2Cert: '', instrumento2FechaCal: '',
  tempExterior: '', humedad: '', presionAtm: '', condicionesNormales: '', condicionesMedicion: ''
});

const defaultColdCompany = () => ({
  razonSocial: '', direccion: '', localidad: '', provincia: '', cp: '', cuit: '',
  fechaMedicion: '', horaInicio: '', horaFin: '', turnos: '',
  instrumento1Marca: '', instrumento1Modelo: '', instrumento1Serie: '', instrumento1Cert: '', instrumento1FechaCal: '',
  tempExterior: '', humedad: '', presionAtm: '', condicionesNormales: '', condicionesMedicion: ''
});

const defaultLightingCompany = () => ({
  razonSocial: '', direccion: '', localidad: '', provincia: '', cp: '', cuit: '',
  fechaMedicion: '', horaInicio: '', horaFin: '', turnos: '',
  instrumento1Marca: '', instrumento1Modelo: 'Luxómetro', instrumento1Serie: '', instrumento1Cert: '', instrumento1FechaCal: '',
  instrumento2Marca: '', instrumento2Modelo: '', instrumento2Serie: '',
  tempExterior: '', humedad: '', presionAtm: '',
  metodologia: 'Metodología de la cuadrícula (Guía SRT 2012)',
  observacionesGenerales: ''
});

const initialEstablishment: Establishment = {
  id: 'default', name: '', razonSocial: '', cuit: '', address: '',
  date: new Date().toISOString().split('T')[0], responsible: '',
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      establishment: initialEstablishment,
      sectors: sampleSectors,
      noiseProtocol: { rows: [defaultNoiseRow()], company: defaultNoiseCompany(), observaciones: '', conclusiones: '', recomendaciones: '' },
      thermalProtocol: { rows: [defaultThermalRow()], company: defaultThermalCompany(), observaciones: '', conclusiones: '', recomendaciones: '' },
      coldProtocol: { rows: [defaultColdRow()], company: defaultColdCompany(), observaciones: '', metodologia: '', conclusiones: '', recomendaciones: '' },
      lightingProtocol: { company: defaultLightingCompany(), mantenimiento: {}, observaciones: '', conclusiones: '', recomendaciones: '' },
      digitalSignature: null, signatoryName: null, signatoryTitle: null, signatoryRegistration: null,
      lastSavedAt: null, isDirty: false,

      updateEstablishment: (data) => set((s) => ({ establishment: { ...s.establishment, ...data }, isDirty: true })),
      addSector: (sectorData) => set((s) => ({ sectors: [...s.sectors, { ...sectorData, id: uuidv4(), measurements: [] }], isDirty: true })),
      updateSector: (id, data) => set((s) => ({ sectors: s.sectors.map((sec) => sec.id === id ? { ...sec, ...data } : sec), isDirty: true })),
      deleteSector: (id) => set((s) => ({ sectors: s.sectors.filter((sec) => sec.id !== id), isDirty: true })),
      addMeasurement: (sectorId, type) => set((s) => ({
        sectors: s.sectors.map((sec) => sec.id !== sectorId ? sec : { ...sec, measurements: [...sec.measurements, { id: uuidv4(), type, sectorId, status: 'pending', points: [], observations: '' }] }),
        isDirty: true
      })),
      deleteMeasurement: (sectorId, measurementId) => set((s) => ({
        sectors: s.sectors.map((sec) => sec.id !== sectorId ? sec : { ...sec, measurements: sec.measurements.filter((m) => m.id !== measurementId) }),
        isDirty: true
      })),
      updateMeasurement: (sectorId, measurementId, data) => set((s) => ({
        sectors: s.sectors.map((sec) => sec.id !== sectorId ? sec : { ...sec, measurements: sec.measurements.map((m) => m.id === measurementId ? { ...m, ...data } : m) }),
        isDirty: true
      })),
      addPoint: (sectorId, measurementId, pointData) => set((s) => ({
        sectors: s.sectors.map((sec) => sec.id !== sectorId ? sec : {
          ...sec,
          measurements: sec.measurements.map((m) => m.id !== measurementId ? m : { ...m, points: [...m.points, { id: uuidv4(), label: `Punto ${m.points.length + 1}`, values: {}, ...pointData }] })
        }),
        isDirty: true
      })),
      updatePoint: (sectorId, measurementId, pointId, data) => set((s) => ({
        sectors: s.sectors.map((sec) => sec.id !== sectorId ? sec : {
          ...sec,
          measurements: sec.measurements.map((m) => m.id !== measurementId ? m : { ...m, points: m.points.map((p) => p.id === pointId ? { ...p, ...data } : p) })
        }),
        isDirty: true
      })),
      deletePoint: (sectorId, measurementId, pointId) => set((s) => ({
        sectors: s.sectors.map((sec) => sec.id !== sectorId ? sec : {
          ...sec,
          measurements: sec.measurements.map((m) => m.id !== measurementId ? m : { ...m, points: m.points.filter((p) => p.id !== pointId) })
        }),
        isDirty: true
      })),
      addSectorWithMeasurement: (sectorData, type) => set((s) => {
        const newSectorId = uuidv4();
        return { sectors: [...s.sectors, { ...sectorData, id: newSectorId, measurements: [{ id: uuidv4(), type, sectorId: newSectorId, status: 'pending', points: [], observations: '' }] }], isDirty: true };
      }),

      // Noise
      updateNoiseRow: (id, data) => set((s) => ({ noiseProtocol: { ...s.noiseProtocol, rows: s.noiseProtocol.rows.map(r => r.id === id ? { ...r, ...data } : r) }, isDirty: true })),
      addNoiseRow: () => set((s) => ({ noiseProtocol: { ...s.noiseProtocol, rows: [...s.noiseProtocol.rows, defaultNoiseRow()] }, isDirty: true })),
      deleteNoiseRow: (id) => set((s) => ({ noiseProtocol: { ...s.noiseProtocol, rows: s.noiseProtocol.rows.filter(r => r.id !== id) }, isDirty: true })),
      updateNoiseCompany: (data) => set((s) => ({ noiseProtocol: { ...s.noiseProtocol, company: { ...s.noiseProtocol.company, ...data } }, isDirty: true })),
      updateNoiseText: (field, value) => set((s) => ({ noiseProtocol: { ...s.noiseProtocol, [field]: value }, isDirty: true })),
      setNoiseRows: (rows) => set((s) => ({ noiseProtocol: { ...s.noiseProtocol, rows }, isDirty: true })),

      // Thermal
      updateThermalRow: (id, data) => set((s) => ({ thermalProtocol: { ...s.thermalProtocol, rows: s.thermalProtocol.rows.map(r => r.id === id ? { ...r, ...data } : r) }, isDirty: true })),
      addThermalRow: () => set((s) => ({ thermalProtocol: { ...s.thermalProtocol, rows: [...s.thermalProtocol.rows, defaultThermalRow()] }, isDirty: true })),
      deleteThermalRow: (id) => set((s) => ({ thermalProtocol: { ...s.thermalProtocol, rows: s.thermalProtocol.rows.filter(r => r.id !== id) }, isDirty: true })),
      updateThermalCompany: (data) => set((s) => ({ thermalProtocol: { ...s.thermalProtocol, company: { ...s.thermalProtocol.company, ...data } }, isDirty: true })),
      updateThermalText: (field, value) => set((s) => ({ thermalProtocol: { ...s.thermalProtocol, [field]: value }, isDirty: true })),
      setThermalRows: (rows) => set((s) => ({ thermalProtocol: { ...s.thermalProtocol, rows }, isDirty: true })),

      // Cold
      updateColdRow: (id, data) => set((s) => ({ coldProtocol: { ...s.coldProtocol, rows: s.coldProtocol.rows.map(r => r.id === id ? { ...r, ...data } : r) }, isDirty: true })),
      addColdRow: () => set((s) => ({ coldProtocol: { ...s.coldProtocol, rows: [...s.coldProtocol.rows, defaultColdRow()] }, isDirty: true })),
      deleteColdRow: (id) => set((s) => ({ coldProtocol: { ...s.coldProtocol, rows: s.coldProtocol.rows.filter(r => r.id !== id) }, isDirty: true })),
      updateColdCompany: (data) => set((s) => ({ coldProtocol: { ...s.coldProtocol, company: { ...s.coldProtocol.company, ...data } }, isDirty: true })),
      updateColdText: (field, value) => set((s) => ({ coldProtocol: { ...s.coldProtocol, [field]: value }, isDirty: true })),
      setColdRows: (rows) => set((s) => ({ coldProtocol: { ...s.coldProtocol, rows }, isDirty: true })),

      // Lighting
      updateLightingCompany: (data) => set((s) => ({ lightingProtocol: { ...s.lightingProtocol, company: { ...s.lightingProtocol.company, ...data } }, isDirty: true })),
      updateLightingText: (field, value) => set((s) => ({ lightingProtocol: { ...s.lightingProtocol, [field]: value }, isDirty: true })),
      updateLightingMantenimiento: (key, value) => set((s) => ({ lightingProtocol: { ...s.lightingProtocol, mantenimiento: { ...s.lightingProtocol.mantenimiento, [key]: value } }, isDirty: true })),

      // Lifecycle
      loadInspectionData: (establishment, sectors) => set(() => ({
        establishment: JSON.parse(JSON.stringify(establishment)),
        sectors: JSON.parse(JSON.stringify(sectors)),
        isDirty: false
      })),
      resetStore: () => set({
        establishment: initialEstablishment, sectors: [],
        noiseProtocol: { rows: [defaultNoiseRow()], company: defaultNoiseCompany(), observaciones: '', conclusiones: '', recomendaciones: '' },
        thermalProtocol: { rows: [defaultThermalRow()], company: defaultThermalCompany(), observaciones: '', conclusiones: '', recomendaciones: '' },
        coldProtocol: { rows: [defaultColdRow()], company: defaultColdCompany(), observaciones: '', metodologia: '', conclusiones: '', recomendaciones: '' },
        lightingProtocol: { company: defaultLightingCompany(), mantenimiento: {}, observaciones: '', conclusiones: '', recomendaciones: '' },
        isDirty: false, lastSavedAt: null,
      }),
      saveInspection: async () => {
        const state = get();
        const inspectionData = {
          establishment: state.establishment,
          sectors: state.sectors,
          noiseProtocol: state.noiseProtocol,
          thermalProtocol: state.thermalProtocol,
          coldProtocol: state.coldProtocol,
          digitalSignature: state.digitalSignature,
          signatoryName: state.signatoryName,
          signatoryTitle: state.signatoryTitle,
          signatoryRegistration: state.signatoryRegistration,
          savedAt: new Date().toISOString(),
        };

        // 1. Backup offline en localStorage
        const saved = JSON.parse(localStorage.getItem('syh-saved-inspections') || '[]');
        const existingIdx = saved.findIndex((s: any) => s.establishment?.id === state.establishment.id);
        if (existingIdx >= 0) {
          saved[existingIdx] = inspectionData;
        } else {
          saved.push(inspectionData);
        }
        localStorage.setItem('syh-saved-inspections', JSON.stringify(saved));

        // 2. Persistir en la base de datos (fuente de verdad)
        try {
          const dbId = (state.establishment as any)._dbId;
          if (dbId) {
            await fetch(`/api/inspections/${dbId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(inspectionData),
            });
          } else {
            const res = await fetch('/api/inspections', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(inspectionData),
            });
            if (res.ok) {
              const created = await res.json();
              set((s) => ({
                establishment: { ...s.establishment, _dbId: created.id } as any,
              }));
            }
          }
        } catch (err) {
          console.warn('Sin conexión — datos guardados localmente como backup:', err);
        }

        set({ lastSavedAt: new Date().toISOString(), isDirty: false });
      },
      markClean: () => set({ isDirty: false, lastSavedAt: new Date().toISOString() }),

      // Signatures
      setDigitalSignature: (signature) => set({ digitalSignature: signature }),
      setSignatoryName: (name) => set({ signatoryName: name }),
      setSignatoryTitle: (title) => set({ signatoryTitle: title }),
      setSignatoryRegistration: (registration) => set({ signatoryRegistration: registration }),
    }),
    {
      name: 'eea-app-state-v7',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

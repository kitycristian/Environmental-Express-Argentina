import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Establishment, Sector, Measurement, MeasurementPoint, MeasurementType } from './types';
import { v4 as uuidv4 } from 'uuid';

interface AppState {
  establishment: Establishment;
  sectors: Sector[];
  
  // Digital Signature
  digitalSignature: string | null;
  signatoryName: string | null;
  signatoryTitle: string | null;
  signatoryRegistration: string | null;
  
  // Actions
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
  
  loadInspectionData: (establishment: Establishment, sectors: Sector[]) => void;
  resetStore: () => void;
  saveInspection: () => void;
  
  // Signature Actions
  setDigitalSignature: (signature: string | null) => void;
  setSignatoryName: (name: string | null) => void;
  setSignatoryTitle: (title: string | null) => void;
  setSignatoryRegistration: (registration: string | null) => void;
}

const initialEstablishment: Establishment = {
  id: 'default',
  name: '',
  razonSocial: '',
  cuit: '',
  address: '',
  date: new Date().toISOString().split('T')[0],
  responsible: '',
};

// Helper to create measurement points
const pt = (id: string, lux: string) => ({ id, label: '', values: { lux } });

// Sample data for demonstration
export const sampleSectors: Sector[] = [
  {
    id: 'sample-1',
    name: 'Salón de Ventas',
    description: '',
    dimensions: '',
    activity: '',
    workersCount: 0,
    measurements: [{
      id: 'm1',
      type: 'lighting',
      sectorId: 'sample-1',
      status: 'pending',
      points: [pt('p1','332'), pt('p2','316'), pt('p3','354'), pt('p4','360'), pt('p5','374'), pt('p6','341'), pt('p7','354'), pt('p8','404'), pt('p9','380')],
      observations: '',
      config: { width: 76, length: 54, height: 5.6, limit: 500 }
    }]
  },
  {
    id: 'sample-2',
    name: 'Salón de Ventas',
    description: 'Línea de Cajas',
    dimensions: '',
    activity: '',
    workersCount: 0,
    measurements: [{
      id: 'm2',
      type: 'lighting',
      sectorId: 'sample-2',
      status: 'pending',
      points: [pt('p1','366'), pt('p2','396'), pt('p3','411'), pt('p4','352'), pt('p5','397'), pt('p6','420'), pt('p7','418'), pt('p8','410'), pt('p9','310')],
      observations: '',
      config: { width: 5.2, length: 31, height: 4.2, limit: 500 }
    }]
  },
  {
    id: 'sample-3',
    name: 'Salón de Ventas',
    description: 'Atención al Cliente',
    dimensions: '',
    activity: '',
    workersCount: 0,
    measurements: [{
      id: 'm3',
      type: 'lighting',
      sectorId: 'sample-3',
      status: 'pending',
      points: [pt('p1','425'), pt('p2','483'), pt('p3','410'), pt('p4','421'), pt('p5','400'), pt('p6','326'), pt('p7','212'), pt('p8','313'), pt('p9','212')],
      observations: '',
      config: { width: 2.8, length: 5.6, height: 4.2, limit: 500 }
    }]
  },
  {
    id: 'sample-4',
    name: 'Depósito de Línea de Cajas',
    description: '',
    dimensions: '',
    activity: '',
    workersCount: 0,
    measurements: [{
      id: 'm4',
      type: 'lighting',
      sectorId: 'sample-4',
      status: 'pending',
      points: [pt('p1','76'), pt('p2','78'), pt('p3','71')],
      observations: '',
      config: { limit: 100 }
    }]
  },
  {
    id: 'sample-5',
    name: 'Depósito de Tesorería',
    description: '',
    dimensions: '',
    activity: '',
    workersCount: 0,
    measurements: [{
      id: 'm5',
      type: 'lighting',
      sectorId: 'sample-5',
      status: 'pending',
      points: [pt('p1','183'), pt('p2','186'), pt('p3','197'), pt('p4','168'), pt('p5','162'), pt('p6','241'), pt('p7','210'), pt('p8','168'), pt('p9','308')],
      observations: '',
      config: { width: 3.6, length: 3.9, height: 2.9, limit: 100 }
    }]
  },
  {
    id: 'sample-6',
    name: 'Tesorería',
    description: '',
    dimensions: '',
    activity: '',
    workersCount: 0,
    measurements: [{
      id: 'm6',
      type: 'lighting',
      sectorId: 'sample-6',
      status: 'pending',
      points: [pt('p1','307'), pt('p2','333'), pt('p3','375'), pt('p4','233'), pt('p5','169'), pt('p6','266'), pt('p7','140'), pt('p8','177')],
      observations: '',
      config: { width: 3.85, length: 6.3, height: 2.9, limit: 500 }
    }]
  },
  {
    id: 'sample-7',
    name: 'TOMRA',
    description: '',
    dimensions: '',
    activity: '',
    workersCount: 0,
    measurements: [{
      id: 'm7',
      type: 'lighting',
      sectorId: 'sample-7',
      status: 'pending',
      points: [pt('p1','96'), pt('p2','95'), pt('p3','97')],
      observations: '',
      config: { limit: 200 }
    }]
  },
  {
    id: 'sample-8',
    name: 'Recepción de Mercadería',
    description: '',
    dimensions: '',
    activity: '',
    workersCount: 0,
    measurements: [{
      id: 'm8',
      type: 'lighting',
      sectorId: 'sample-8',
      status: 'pending',
      points: [pt('p1','305'), pt('p2','294'), pt('p3','315'), pt('p4','262'), pt('p5','311'), pt('p6','290'), pt('p7','279'), pt('p8','232'), pt('p9','221')],
      observations: '',
      config: { width: 11.6, length: 8.6, height: 3.8, limit: 200 }
    }]
  },
  {
    id: 'sample-9',
    name: 'Panadería',
    description: '',
    dimensions: '',
    activity: '',
    workersCount: 0,
    measurements: [{
      id: 'm9',
      type: 'lighting',
      sectorId: 'sample-9',
      status: 'pending',
      points: [pt('p1','85'), pt('p2','90'), pt('p3','66'), pt('p4','64'), pt('p5','106'), pt('p6','117'), pt('p7','129'), pt('p8','133'), pt('p9','165')],
      observations: '',
      config: { width: 9.7, length: 8, height: 3, limit: 300 }
    }]
  },
  {
    id: 'sample-10',
    name: 'Rotisería',
    description: '',
    dimensions: '',
    activity: '',
    workersCount: 0,
    measurements: [{
      id: 'm10',
      type: 'lighting',
      sectorId: 'sample-10',
      status: 'pending',
      points: [pt('p1','210'), pt('p2','190'), pt('p3','227'), pt('p4','201'), pt('p5','225'), pt('p6','236'), pt('p7','232'), pt('p8','201'), pt('p9','190')],
      observations: '',
      config: { width: 5.8, length: 4.2, height: 0.8, limit: 220 }
    }]
  },
];

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      establishment: initialEstablishment,
      sectors: sampleSectors,
      
      // Digital Signature initial state
      digitalSignature: null,
      signatoryName: null,
      signatoryTitle: null,
      signatoryRegistration: null,

      updateEstablishment: (data) => 
        set((state) => ({ establishment: { ...state.establishment, ...data } })),

      addSector: (sectorData) => 
        set((state) => ({
          sectors: [
            ...state.sectors,
            { ...sectorData, id: uuidv4(), measurements: [] }
          ]
        })),

      updateSector: (id, data) =>
        set((state) => ({
          sectors: state.sectors.map((s) => 
            s.id === id ? { ...s, ...data } : s
          )
        })),

      deleteSector: (id) =>
        set((state) => ({
          sectors: state.sectors.filter((s) => s.id !== id)
        })),

      addMeasurement: (sectorId, type) =>
        set((state) => ({
          sectors: state.sectors.map((s) => {
            if (s.id !== sectorId) return s;
            return {
              ...s,
              measurements: [
                ...s.measurements,
                {
                  id: uuidv4(),
                  type,
                  sectorId,
                  status: 'pending',
                  points: [],
                  observations: ''
                }
              ]
            };
          })
        })),

      deleteMeasurement: (sectorId, measurementId) =>
        set((state) => ({
          sectors: state.sectors.map((s) => {
            if (s.id !== sectorId) return s;
            return {
              ...s,
              measurements: s.measurements.filter((m) => m.id !== measurementId)
            };
          })
        })),

      updateMeasurement: (sectorId, measurementId, data) =>
        set((state) => ({
          sectors: state.sectors.map((s) => {
            if (s.id !== sectorId) return s;
            return {
              ...s,
              measurements: s.measurements.map((m) => 
                m.id === measurementId ? { ...m, ...data } : m
              )
            };
          })
        })),

      addPoint: (sectorId, measurementId, pointData) =>
        set((state) => ({
          sectors: state.sectors.map((s) => {
            if (s.id !== sectorId) return s;
            return {
              ...s,
              measurements: s.measurements.map((m) => {
                if (m.id !== measurementId) return m;
                return {
                  ...m,
                  points: [
                    ...m.points,
                    {
                      id: uuidv4(),
                      label: `Punto ${m.points.length + 1}`,
                      values: {},
                      ...pointData
                    }
                  ]
                };
              })
            };
          })
        })),

      updatePoint: (sectorId, measurementId, pointId, data) =>
        set((state) => ({
          sectors: state.sectors.map((s) => {
            if (s.id !== sectorId) return s;
            return {
              ...s,
              measurements: s.measurements.map((m) => {
                if (m.id !== measurementId) return m;
                return {
                  ...m,
                  points: m.points.map((p) => 
                    p.id === pointId ? { ...p, ...data } : p
                  )
                };
              })
            };
          })
        })),

      deletePoint: (sectorId, measurementId, pointId) =>
        set((state) => ({
          sectors: state.sectors.map((s) => {
            if (s.id !== sectorId) return s;
            return {
              ...s,
              measurements: s.measurements.map((m) => {
                if (m.id !== measurementId) return m;
                return {
                  ...m,
                  points: m.points.filter((p) => p.id !== pointId)
                };
              })
            };
          })
        })),

      addSectorWithMeasurement: (sectorData, type) => 
        set((state) => {
          const newSectorId = uuidv4();
          const newSector: Sector = {
            ...sectorData,
            id: newSectorId,
            measurements: [
              {
                id: uuidv4(),
                type,
                sectorId: newSectorId,
                status: 'pending',
                points: [],
                observations: ''
              }
            ]
          };
          return {
            sectors: [...state.sectors, newSector]
          };
        }),

      loadInspectionData: (establishment, sectors) =>
        set(() => ({
          establishment: JSON.parse(JSON.stringify(establishment)),
          sectors: JSON.parse(JSON.stringify(sectors))
        })),

      resetStore: () => set({ establishment: initialEstablishment, sectors: [] }),
      
      saveInspection: () => {
        const state = useStore.getState();
        const inspectionData = {
          establishment: state.establishment,
          sectors: state.sectors,
          savedAt: new Date().toISOString()
        };
        const savedInspections = JSON.parse(localStorage.getItem('syh-saved-inspections') || '[]');
        savedInspections.push(inspectionData);
        localStorage.setItem('syh-saved-inspections', JSON.stringify(savedInspections));
      },

      // Signature Actions
      setDigitalSignature: (signature) => set({ digitalSignature: signature }),
      setSignatoryName: (name) => set({ signatoryName: name }),
      setSignatoryTitle: (title) => set({ signatoryTitle: title }),
      setSignatoryRegistration: (registration) => set({ signatoryRegistration: registration }),
    }),
    {
      name: 'syh-relevamiento-working-state-v3',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
